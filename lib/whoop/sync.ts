/**
 * Whoop Sync Engine
 * 
 * Pulls health data from Whoop and stores in Supabase.
 * Syncs: recovery, sleep, strain (cycles), workouts
 */

import { 
  WhoopClient, 
  WhoopRecovery, 
  WhoopSleep, 
  WhoopCycle, 
  WhoopWorkout,
  SPORT_NAMES 
} from './client';
import { createClient } from '@/lib/supabase/server';

export interface SyncResult {
  success: boolean;
  healthMetrics: number;
  workouts: number;
  errors: string[];
}

/**
 * Pull all health data from Whoop (last 30 days)
 */
export async function syncWhoopData(
  userId: string,
  client: WhoopClient
): Promise<SyncResult> {
  const supabase = await createClient();
  const result: SyncResult = {
    success: true,
    healthMetrics: 0,
    workouts: 0,
    errors: [],
  };

  try {
    // Fetch data (Whoop API limit is 25 per request)
    const [recoveryData, sleepData, cycleData, workoutData] = await Promise.all([
      client.getRecovery({ limit: 25 }),
      client.getSleep({ limit: 25 }),
      client.getCycles({ limit: 25 }),
      client.getWorkouts({ limit: 25 }),
    ]);

    // Process health metrics (combine recovery, sleep, strain by date)
    const metricsResult = await syncHealthMetrics(
      supabase,
      userId,
      recoveryData.records || [],
      sleepData.records || [],
      cycleData.records || []
    );
    result.healthMetrics = metricsResult.count;
    result.errors.push(...metricsResult.errors);

    // Process workouts
    const workoutsResult = await syncWorkouts(
      supabase,
      userId,
      workoutData.records || []
    );
    result.workouts = workoutsResult.count;
    result.errors.push(...workoutsResult.errors);

  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${String(error)}`);
  }

  // Log sync
  await supabase.from('sync_log').insert({
    user_id: userId,
    provider: 'whoop',
    direction: 'pull',
    trigger_type: 'manual',
    status: result.success ? 'success' : 'failed',
    pulled_count: result.healthMetrics + result.workouts,
    pushed_count: 0,
    conflict_count: 0,
    completed_at: new Date().toISOString(),
    error_message: result.errors.length > 0 ? result.errors[0] : null,
    error_details: result.errors.length > 0 ? { errors: result.errors } : {},
  });

  return result;
}

/**
 * Sync health metrics (recovery, sleep, strain) by date
 */
async function syncHealthMetrics(
  supabase: any,
  userId: string,
  recoveries: WhoopRecovery[],
  sleeps: WhoopSleep[],
  cycles: WhoopCycle[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  // Group data by date
  const metricsByDate = new Map<string, {
    recovery?: WhoopRecovery;
    sleep?: WhoopSleep;
    cycle?: WhoopCycle;
  }>();

  // Index recoveries by cycle_id for matching
  for (const recovery of recoveries) {
    const date = new Date(recovery.created_at).toISOString().split('T')[0];
    if (!metricsByDate.has(date)) metricsByDate.set(date, {});
    metricsByDate.get(date)!.recovery = recovery;
  }

  // Index sleep by date (use end time as the "sleep date")
  for (const sleep of sleeps) {
    if (sleep.nap) continue; // Skip naps
    const date = new Date(sleep.end).toISOString().split('T')[0];
    if (!metricsByDate.has(date)) metricsByDate.set(date, {});
    metricsByDate.get(date)!.sleep = sleep;
  }

  // Index cycles by date
  for (const cycle of cycles) {
    const date = new Date(cycle.start).toISOString().split('T')[0];
    if (!metricsByDate.has(date)) metricsByDate.set(date, {});
    metricsByDate.get(date)!.cycle = cycle;
  }

  // Upsert metrics for each date
  for (const [date, data] of metricsByDate) {
    try {
      const sleepMs = data.sleep?.score?.stage_summary?.total_in_bed_time_milli || 0;
      const sleepHours = sleepMs / (1000 * 60 * 60);

      const { error } = await supabase
        .from('health_metrics')
        .upsert({
          user_id: userId,
          date,
          metric_date: date, // Required by original schema
          recovery_score: data.recovery?.score?.recovery_score || null,
          hrv_rmssd: data.recovery?.score?.hrv_rmssd_milli 
            ? data.recovery.score.hrv_rmssd_milli / 1000 
            : null, // Convert to ms
          resting_heart_rate: data.recovery?.score?.resting_heart_rate || null,
          sleep_hours: sleepHours > 0 ? Math.round(sleepHours * 10) / 10 : null,
          sleep_consistency: data.sleep?.score?.sleep_consistency_percentage || null,
          strain_score: data.cycle?.score?.strain || null,
          whoop_cycle_id: data.cycle?.id?.toString() || null,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        });

      if (error) {
        errors.push(`Failed to upsert metrics for ${date}: ${error.message}`);
      } else {
        count++;
      }
    } catch (err) {
      errors.push(`Error processing ${date}: ${String(err)}`);
    }
  }

  return { count, errors };
}

/**
 * Sync workouts (including meditation)
 */
async function syncWorkouts(
  supabase: any,
  userId: string,
  workouts: WhoopWorkout[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const workout of workouts) {
    try {
      // Debug: log raw zone data
      const sportId = workout.sport_id ?? 0;
      console.log(`Workout ${workout.id} (${SPORT_NAMES[sportId] || 'Other'}):`, {
        sport_id: workout.sport_id,
        score: workout.score,
        zone_duration: workout.score?.zone_duration
      });

      const startedAt = new Date(workout.start);
      const endedAt = new Date(workout.end);
      const totalMinutes = (endedAt.getTime() - startedAt.getTime()) / (1000 * 60);
      const date = startedAt.toISOString().split('T')[0];

      const activityType = SPORT_NAMES[sportId] || 'Other';
      const isMeditation = workout.sport_id === 82;

      // Convert zone durations from ms to minutes
      // v2 API uses "zone_durations" (plural), not "zone_duration"
      const zones = workout.score?.zone_durations || workout.score?.zone_duration || {
        zone_zero_milli: 0,
        zone_one_milli: 0,
        zone_two_milli: 0,
        zone_three_milli: 0,
        zone_four_milli: 0,
        zone_five_milli: 0,
      };

      const { error } = await supabase
        .from('workouts')
        .upsert({
          user_id: userId,
          whoop_id: workout.id.toString(),
          activity_type: activityType,
          sport_id: workout.sport_id,
          started_at: workout.start,
          ended_at: workout.end,
          total_minutes: Math.round(totalMinutes * 10) / 10,
          date,
          strain_score: workout.score?.strain || null,
          avg_heart_rate: workout.score?.average_heart_rate || null,
          max_heart_rate: workout.score?.max_heart_rate || null,
          calories: workout.score?.kilojoule 
            ? Math.round(workout.score.kilojoule * 0.239) // kJ to kcal
            : null,
          zone_1_minutes: zones.zone_one_milli / (1000 * 60),
          zone_2_minutes: zones.zone_two_milli / (1000 * 60),
          zone_3_minutes: zones.zone_three_milli / (1000 * 60),
          zone_4_minutes: zones.zone_four_milli / (1000 * 60),
          zone_5_minutes: zones.zone_five_milli / (1000 * 60),
          is_meditation: isMeditation,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,whoop_id',
        });

      if (error) {
        errors.push(`Failed to upsert workout ${workout.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (err) {
      errors.push(`Error processing workout ${workout.id}: ${String(err)}`);
    }
  }

  return { count, errors };
}

/**
 * Get 7-day average recovery for Energy calculation
 */
export async function getRecoveryAverage(userId: string): Promise<number | null> {
  const supabase = await createClient();
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('health_metrics')
    .select('recovery_score')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .not('recovery_score', 'is', null);

  if (error || !data || data.length === 0) {
    return null;
  }

  const sum = data.reduce((acc, row) => acc + (row.recovery_score || 0), 0);
  return Math.round(sum / data.length);
}

/**
 * Get meditation minutes for a period
 */
export async function getMeditationMinutes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('total_minutes')
    .eq('user_id', userId)
    .eq('is_meditation', true)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (error || !data) {
    return 0;
  }

  return data.reduce((acc, row) => acc + (row.total_minutes || 0), 0);
}

/**
 * Get workout summary for a period
 */
export async function getWorkoutSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalWorkouts: number;
  totalMinutes: number;
  byActivityType: Record<string, { count: number; minutes: number }>;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('activity_type, total_minutes')
    .eq('user_id', userId)
    .eq('is_meditation', false) // Exclude meditation from workout summary
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (error || !data) {
    return { totalWorkouts: 0, totalMinutes: 0, byActivityType: {} };
  }

  const byActivityType: Record<string, { count: number; minutes: number }> = {};
  let totalMinutes = 0;

  for (const workout of data) {
    totalMinutes += workout.total_minutes || 0;
    
    if (!byActivityType[workout.activity_type]) {
      byActivityType[workout.activity_type] = { count: 0, minutes: 0 };
    }
    byActivityType[workout.activity_type].count++;
    byActivityType[workout.activity_type].minutes += workout.total_minutes || 0;
  }

  return {
    totalWorkouts: data.length,
    totalMinutes,
    byActivityType,
  };
}
