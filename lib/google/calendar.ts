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
  // Event type: 'default' for regular events, 'fromGmail' for auto-created events (flights, hotels, etc.)
  eventType?: 'default' | 'fromGmail' | 'birthday' | 'focusTime' | 'outOfOffice' | 'workingLocation';
  // Source info for fromGmail events
  source?: {
    title?: string;
    url?: string;
  };
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

  private async request<T>(endpoint: string, params?: Record<string, string | string[]>): Promise<T> {
    const url = new URL(`${CALENDAR_API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // For array params like eventTypes, append each value separately
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, value);
        }
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
   * Get events from primary calendar with pagination support
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
      maxResults = 2500,
      calendarId = 'primary',
    } = options;

    // Default timeMax to 30 days from now
    const defaultTimeMax = new Date(timeMin);
    defaultTimeMax.setDate(defaultTimeMax.getDate() + 30);

    const allEvents: CalendarEvent[] = [];
    let pageToken: string | undefined;
    let requestCount = 0;
    const MAX_REQUESTS = 10; // Safety limit to prevent infinite loops

    do {
      const params: Record<string, string | string[]> = {
        timeMin: timeMin.toISOString(),
        timeMax: (timeMax || defaultTimeMax).toISOString(),
        maxResults: '250', // Google's max per request
        singleEvents: 'true', // Expand recurring events
        orderBy: 'startTime',
        // Include both regular events AND Gmail-generated events (flights, hotels, reservations)
        // Required since May 2024 when Google separated these event types
        eventTypes: ['default', 'fromGmail'],
        showDeleted: 'false',
        // CRITICAL FIX: Include events where user is attendee but not organizer
        privateExtendedProperty: 'true',
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await this.request<{
        items: CalendarEvent[];
        nextPageToken?: string;
      }>(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        params
      );

      const events = response.items || [];
      allEvents.push(...events);

      pageToken = response.nextPageToken;
      requestCount++;

      console.log(`Fetched ${events.length} events from ${calendarId} (page ${requestCount}, total: ${allEvents.length})`);

      // Safety check
      if (requestCount >= MAX_REQUESTS) {
        console.warn(`Reached max pagination requests (${MAX_REQUESTS}) for calendar ${calendarId}`);
        break;
      }

      // Stop if we've hit the requested limit
      if (allEvents.length >= maxResults) {
        break;
      }
    } while (pageToken);

    // Return up to maxResults
    return allEvents.slice(0, maxResults);
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
   * Get list of all calendars the user has access to
   */
  async getCalendarList(): Promise<Array<{ id: string; summary: string; primary?: boolean; selected?: boolean; accessRole?: string }>> {
    try {
      const response = await this.request<{ items: Array<{ id: string; summary: string; primary?: boolean; selected?: boolean; accessRole?: string }> }>(
        '/users/me/calendarList',
        { maxResults: '250', showHidden: 'true' } // Include hidden calendars for reservations, etc.
      );

      // Log ALL calendars returned by API for debugging
      console.log(`Google API returned ${(response.items || []).length} calendars:`);
      (response.items || []).forEach(cal => {
        console.log(`  - "${cal.summary}" | role: ${cal.accessRole} | primary: ${cal.primary} | selected: ${cal.selected}`);
      });

      // Return all calendars where user has read access (owner, writer, reader, freeBusyReader)
      // This includes hidden calendars that may contain auto-created events from email (reservations, etc.)
      const calendars = (response.items || []).filter(cal => {
        // Include owner, writer, reader, AND freeBusyReader (common for shared/subscribed calendars)
        const hasAccess = ['owner', 'writer', 'reader', 'freeBusyReader'].includes(cal.accessRole || '');

        // Additional filter: only include if selected OR primary (ignore deselected calendars)
        const isIncluded = cal.selected !== false || cal.primary === true;

        return hasAccess && isIncluded;
      });

      console.log(`Using ${calendars.length} calendars with read access (filtered from ${(response.items || []).length} total)`);
      return calendars;
    } catch (error) {
      console.error('Failed to fetch calendar list:', error);
      return [];
    }
  }

  /**
   * Get events from all selected calendars
   */
  async getAllCalendarEvents(options: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  } = {}): Promise<CalendarEvent[]> {
    const calendars = await this.getCalendarList();
    const allEvents: CalendarEvent[] = [];

    console.log(`Fetching events from ${calendars.length} calendars (timeMin: ${options.timeMin?.toISOString()}, timeMax: ${options.timeMax?.toISOString()}):`);

    for (const calendar of calendars) {
      try {
        const events = await this.getEvents({
          ...options,
          calendarId: calendar.id,
        });
        console.log(`  📅 ${calendar.summary} (${calendar.id}): ${events.length} events`);
        if (events.length > 0) {
          events.forEach(e => {
            const start = e.start.dateTime || e.start.date;
            console.log(`      - "${e.summary}" @ ${start}`);
          });
        }
        allEvents.push(...events);
      } catch (error) {
        console.warn(`  ❌ Failed to fetch from ${calendar.summary} (${calendar.id}):`, error);
        // Continue with other calendars
      }
    }

    console.log(`Total events fetched: ${allEvents.length}`);

    // Sort by start time
    allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || '';
      const bTime = b.start.dateTime || b.start.date || '';
      return aTime.localeCompare(bTime);
    });

    return allEvents;
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
