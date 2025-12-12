/**
 * Google Calendar Client
 * 
 * Handles OAuth and Calendar API interactions.
 * Read-only: fetches events, no modifications.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  status?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  updated?: string;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
  });

  if (state) {
    params.set('state', state);
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange failed:', error);
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
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep existing refresh token
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Google Calendar Client
 */
export class GoogleCalendarClient {
  private accessToken: string;
  private refreshToken?: string;

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  static fromTokens(tokens: GoogleTokens): GoogleCalendarClient {
    return new GoogleCalendarClient(tokens.access_token, tokens.refresh_token);
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${CALENDAR_API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Calendar API error: ${endpoint}`, response.status, error);
      throw new Error(`Calendar API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get events from primary calendar
   */
  async getEvents(options: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    calendarId?: string;
  } = {}): Promise<CalendarEvent[]> {
    const {
      timeMin = new Date(),
      timeMax,
      maxResults = 100,
      calendarId = 'primary',
    } = options;

    // Default timeMax to 30 days from now
    const defaultTimeMax = new Date(timeMin);
    defaultTimeMax.setDate(defaultTimeMax.getDate() + 30);

    const params: Record<string, string> = {
      timeMin: timeMin.toISOString(),
      timeMax: (timeMax || defaultTimeMax).toISOString(),
      maxResults: maxResults.toString(),
      singleEvents: 'true', // Expand recurring events
      orderBy: 'startTime',
    };

    const response = await this.request<{ items: CalendarEvent[] }>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      params
    );

    return response.items || [];
  }

  /**
   * Get a single event
   */
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
  }

  /**
   * Validate token works
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.request('/users/me/calendarList', { maxResults: '1' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Extract meeting link from event
 */
export function extractMeetingLink(event: CalendarEvent): string | null {
  // Check hangoutLink first (Google Meet)
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  // Check conferenceData for Zoom, etc.
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video'
    );
    if (videoEntry?.uri) {
      return videoEntry.uri;
    }
  }

  // Check description for links
  if (event.description) {
    const zoomMatch = event.description.match(/https:\/\/[\w.-]*zoom\.us\/[^\s<]+/);
    if (zoomMatch) return zoomMatch[0];

    const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[^\s<]+/);
    if (meetMatch) return meetMatch[0];
  }

  return null;
}
