export interface CalendarEventResult {
  externalEventId: string;
  externalCalendarId?: string;
  meetingProvider?: 'GOOGLE_MEET' | 'MICROSOFT_TEAMS' | 'NONE';
  meetingUrl?: string;
  error?: string;
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: string;
  end: string;
  timezone: string;
  attendees: string[];
  requestId: string;
}

export interface CalendarProvider {
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(externalCalendarId: string, externalEventId: string, input: CalendarEventInput): Promise<CalendarEventResult>;
  deleteEvent(externalCalendarId: string, externalEventId: string): Promise<void>;
}
