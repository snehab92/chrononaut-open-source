import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

async function getInitialData(supabase: any, userId: string) {
  // Check integration connections
  const { data: integrations } = await supabase
    .from("integration_tokens")
    .select("provider")
    .eq("user_id", userId);

  const providers = new Set((integrations || []).map((i: any) => i.provider));
  const isGoogleCalendarConnected = providers.has("google_calendar");
  const isWhoopConnected = providers.has("whoop");

  // Fetch tasks (always local)
  let tasks: any[] = [];
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!taskError && taskData) {
    tasks = taskData.map((task: any) => ({
      id: task.id,
      title: task.title,
      content: task.content || null,
      priority: task.priority,
      dueDate: task.due_date,
      isCompleted: task.completed,
    }));
  }

  // Fetch events if Google Calendar connected
  let events: any[] = [];
  if (isGoogleCalendarConnected) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: eventData, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", startOfToday.toISOString())
      .lte("start_time", thirtyDaysFromNow.toISOString())
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (!error && eventData) {
      events = eventData.map((event: any) => ({
        id: event.id,
        googleEventId: event.google_event_id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.start_time,
        endTime: event.end_time,
        allDay: event.all_day,
        attendees: typeof event.attendees === "string"
          ? JSON.parse(event.attendees)
          : event.attendees || [],
        organizerEmail: event.organizer_email,
        status: event.status,
        meetingLink: event.meeting_link,
      }));
    }
  }

  // Fetch health metrics if Whoop connected (last 14 days)
  let healthMetrics: any[] = [];
  if (isWhoopConnected) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: metricsData, error } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fourteenDaysAgo.toISOString().split('T')[0])
      .order("date", { ascending: false });

    if (!error && metricsData) {
      healthMetrics = metricsData.map((m: any) => ({
        date: m.date,
        sleepHours: m.sleep_hours || 0,
        sleepConsistency: m.sleep_consistency || 0,
        recoveryScore: m.recovery_score || 0,
        hrvRmssd: m.hrv_rmssd || 0,
        restingHeartRate: m.resting_heart_rate || 0,
      }));
    }
  }

  // Fetch workouts if Whoop connected (last 14 days)
  let workouts: any[] = [];
  if (isWhoopConnected) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: workoutData, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fourteenDaysAgo.toISOString().split('T')[0])
      .order("date", { ascending: false });

    if (!error && workoutData) {
      workouts = workoutData.map((w: any) => ({
        date: w.date,
        activityType: w.activity_type || 'Activity',
        totalMinutes: w.total_minutes || 0,
        isMeditation: w.is_meditation || false,
        zone1Minutes: w.zone_1_minutes || 0,
        zone2Minutes: w.zone_2_minutes || 0,
        zone3Minutes: w.zone_3_minutes || 0,
        zone4Minutes: w.zone_4_minutes || 0,
        zone5Minutes: w.zone_5_minutes || 0,
      }));
    }
  }

  // Fetch journal entries for mood (last 14 days)
  let journalEntries: any[] = [];
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: journalData, error: journalError } = await supabase
    .from("journal_entries")
    .select("entry_date, mood_label")
    .eq("user_id", userId)
    .gte("entry_date", fourteenDaysAgo.toISOString().split('T')[0])
    .order("entry_date", { ascending: false });

  if (!journalError && journalData) {
    journalEntries = journalData.map((j: any) => ({
      date: j.entry_date,
      moodLabel: j.mood_label,
    }));
  }

  return {
    isGoogleCalendarConnected,
    isWhoopConnected,
    tasks,
    events,
    healthMetrics,
    workouts,
    journalEntries,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0];

  // Fetch initial data server-side
  const {
    isGoogleCalendarConnected,
    isWhoopConnected,
    tasks: initialTasks,
    events: initialEvents,
    healthMetrics,
    workouts,
    journalEntries,
  } = await getInitialData(supabase, user?.id || "");

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold text-[#1E3D32] tracking-tight">
          Welcome aboard{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[#5C7A6B] italic">
          Latitude: here. Longitude: now.
        </p>
      </div>

      {/* Dashboard Client (metrics + tasks + calendar) */}
      <DashboardClient
        initialTasks={initialTasks}
        initialEvents={initialEvents}
        isGoogleCalendarConnected={isGoogleCalendarConnected}
        isWhoopConnected={isWhoopConnected}
        healthMetrics={healthMetrics}
        workouts={workouts}
        journalEntries={journalEntries}
      />
    </div>
  );
}
