/**
 * Whoop API Client
 * 
 * Handles OAuth and API interactions for health data.
 * Read-only: fetches recovery, sleep, strain, workouts.
 */

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_URL = 'https://api.prod.whoop.com/developer';

// Scopes we request
const SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement',
].join(' ');

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// API Response Types
export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

export interface WhoopSleep {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  };
}

export interface WhoopCycle {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string;
  timezone_offset: string;
  score_state: string;
  score: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

export interface WhoopWorkout {
  id: string; // v2 uses UUID strings
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_id: number | null;
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
    // v2 API uses "zone_durations" (plural)
    zone_durations?: {
      zone_zero_milli: number;
      zone_one_milli: number;
      zone_two_milli: number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
    // Keep for backwards compatibility
    zone_duration?: {
      zone_zero_milli: number;
      zone_one_milli: number;
      zone_two_milli: number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
  } | null;
}

export interface WhoopProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

// Sport ID to activity name mapping (common ones)
export const SPORT_NAMES: Record<number, string> = {
  [-1]: 'Activity',
  0: 'Running',
  1: 'Cycling',
  16: 'Baseball',
  17: 'Basketball',
  18: 'Rowing',
  19: 'Fencing',
  20: 'Field Hockey',
  21: 'Football',
  22: 'Golf',
  24: 'Ice Hockey',
  25: 'Lacrosse',
  27: 'Rugby',
  28: 'Sailing',
  29: 'Skiing',
  30: 'Soccer',
  31: 'Softball',
  32: 'Squash',
  33: 'Swimming',
  34: 'Tennis',
  35: 'Track & Field',
  36: 'Volleyball',
  37: 'Water Polo',
  38: 'Wrestling',
  39: 'Boxing',
  42: 'Dance',
  43: 'Pilates',
  44: 'Yoga',
  45: 'Weightlifting',
  47: 'Cross Country Skiing',
  48: 'Functional Fitness',
  49: 'Duathlon',
  51: 'Gymnastics',
  52: 'HIIT',
  53: 'Interval Training',
  55: 'Jumping Rope',
  56: 'Kayaking',
  57: 'Kickboxing',
  58: 'Kiteboarding',
  59: 'Martial Arts',
  62: 'Obstacle Course Racing',
  63: 'Outdoor Cycling',
  64: 'Paddleboarding',
  65: 'Powerlifting',
  66: 'Rock Climbing',
  68: 'Snowboarding',
  69: 'Spinning',
  70: 'Stairmaster',
  71: 'Stationary Cycling',
  73: 'Surfing',
  74: 'Triathlon',
  75: 'Walking',
  76: 'Weightlifting',
  82: 'Meditation',
  83: 'Other',
  84: 'Diving',
  85: 'Operations - Loss',
  86: 'Operations - Loss',
  87: 'Wheelchair Pushing',
  88: 'Carnival',
  89: 'Gardening',
  90: 'Manual Labor',
  91: 'Sex',
  94: 'Assault Bike',
  95: 'Hiking',
  96: 'Inline Skating',
  97: 'Mountaineering',
  98: 'Paddling',
  99: 'Rowing Machine',
  100: 'Skiing (Downhill)',
  101: 'Snowmobile',
  102: 'Treadmill Running',
  104: 'Elliptical',
  105: 'Virtual Cycling',
};

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
  });

  if (state) {
    params.set('state', state);
  }

  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<WhoopTokens> {
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Whoop token exchange failed:', error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<WhoopTokens> {
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Whoop token refresh failed:', error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Whoop API Client
 */
export class WhoopClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${WHOOP_API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    console.log(`Whoop API request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Whoop API error: ${endpoint}`, response.status, error);
      throw new Error(`Whoop API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<WhoopProfile> {
    return this.request<WhoopProfile>('/v1/user/profile/basic');
  }

  /**
   * Get recovery data (v2 API)
   */
  async getRecovery(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ records: WhoopRecovery[] }> {
    const params: Record<string, string> = {};
    if (options.startDate) params.start = options.startDate;
    if (options.endDate) params.end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();

    return this.request('/v2/recovery', params);
  }

  /**
   * Get sleep data (v2 API)
   */
  async getSleep(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ records: WhoopSleep[] }> {
    const params: Record<string, string> = {};
    if (options.startDate) params.start = options.startDate;
    if (options.endDate) params.end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();

    return this.request('/v2/activity/sleep', params);
  }

  /**
   * Get cycle (strain) data (v2 API)
   */
  async getCycles(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ records: WhoopCycle[] }> {
    const params: Record<string, string> = {};
    if (options.startDate) params.start = options.startDate;
    if (options.endDate) params.end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();

    return this.request('/v2/cycle', params);
  }

  /**
   * Get workout data (v2 API)
   */
  async getWorkouts(options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ records: WhoopWorkout[] }> {
    const params: Record<string, string> = {};
    if (options.startDate) params.start = options.startDate;
    if (options.endDate) params.end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();

    return this.request('/v2/activity/workout', params);
  }

  /**
   * Validate token works
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      return false;
    }
  }
}
