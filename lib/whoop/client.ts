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
  'offline', // Required for refresh tokens
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

// Sport ID to activity name mapping (from official Whoop API docs)
// https://developer.whoop.com/docs/developing/user-data/workout/
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
  52: 'Hiking/Rucking',
  53: 'Horseback Riding',
  55: 'Kayaking',
  56: 'Martial Arts',
  57: 'Mountain Biking',
  59: 'Powerlifting',
  60: 'Rock Climbing',
  61: 'Paddleboarding',
  62: 'Triathlon',
  63: 'Walking',
  64: 'Surfing',
  65: 'Elliptical',
  66: 'Stairmaster',
  70: 'Meditation',
  71: 'Other',
  73: 'Diving',
  74: 'Operations - Tactical',
  75: 'Operations - Medical',
  76: 'Operations - Flying',
  77: 'Operations - Water',
  82: 'Ultimate',
  83: 'Climber',
  84: 'Jumping Rope',
  85: 'Australian Football',
  86: 'Skateboarding',
  87: 'Coaching',
  88: 'Ice Bath',
  89: 'Commuting',
  90: 'Gaming',
  91: 'Snowboarding',
  92: 'Motocross',
  93: 'Caddying',
  94: 'Obstacle Course Racing',
  95: 'Motor Racing',
  96: 'HIIT',
  97: 'Spin',
  98: 'Jiu Jitsu',
  99: 'Manual Labor',
  100: 'Cricket',
  101: 'Pickleball',
  102: 'Inline Skating',
  103: 'Box Fitness',
  104: 'Spikeball',
  105: 'Wheelchair Pushing',
  106: 'Paddle Tennis',
  107: 'Barre',
  108: 'Stage Performance',
  109: 'High Stress Work',
  110: 'Parkour',
  111: 'Gaelic Football',
  112: 'Hurling/Camogie',
  113: 'Circus Arts',
  121: 'Massage Therapy',
  123: 'Strength Trainer',
  125: 'Watching Sports',
  126: 'Assault Bike',
  127: 'Kickboxing',
  128: 'Stretching',
  230: 'Table Tennis',
  231: 'Badminton',
  232: 'Netball',
  233: 'Sauna',
  234: 'Disc Golf',
  235: 'Yard Work',
  236: 'Air Compression',
  237: 'Percussive Massage',
  238: 'Paintball',
  239: 'Ice Skating',
  240: 'Handball',
  248: 'F45 Training',
  249: 'Padel',
  250: "Barry's",
  251: 'Dedicated Parenting',
  252: 'Stroller Walking',
  253: 'Stroller Jogging',
  254: 'Toddlerwearing',
  255: 'Babywearing',
  258: 'Barre3',
  259: 'Hot Yoga',
  261: 'Stadium Steps',
  262: 'Polo',
  263: 'Musical Performance',
  264: 'Kite Boarding',
  266: 'Dog Walking',
  267: 'Water Skiing',
  268: 'Wakeboarding',
  269: 'Cooking',
  270: 'Cleaning',
  272: 'Public Speaking',
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

  private async request<T>(endpoint: string, params?: Record<string, string>, retryCount = 0): Promise<T> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // Start with 1 second

    const url = new URL(`${WHOOP_API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    console.log(`Whoop API request (attempt ${retryCount + 1}): ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      // Handle rate limiting with retry
      if (response.status === 429) {
        if (retryCount < MAX_RETRIES) {
          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter
            ? parseInt(retryAfter) * 1000
            : RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff

          console.warn(`Rate limited. Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.request<T>(endpoint, params, retryCount + 1);
        } else {
          throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
        }
      }

      // Handle other errors
      if (!response.ok) {
        const error = await response.text();
        console.error(`Whoop API error: ${endpoint}`, response.status, error);

        // Retry on 5xx server errors
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
          console.warn(`Server error. Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.request<T>(endpoint, params, retryCount + 1);
        }

        throw new Error(`Whoop API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      // Debug: log response shape for troubleshooting
      if (endpoint.includes('/v2/')) {
        const keys = Object.keys(data);
        const recordCount = Array.isArray(data.records) ? data.records.length : 'N/A';
        console.log(`Whoop API response ${endpoint}: keys=${keys.join(',')}, records=${recordCount}`);
      }
      return data;
    } catch (error) {
      // Network errors - retry
      if (retryCount < MAX_RETRIES && (error instanceof TypeError || (error as Error).message.includes('fetch'))) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.warn(`Network error. Retrying after ${delayMs}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.request<T>(endpoint, params, retryCount + 1);
      }

      throw error;
    }
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
