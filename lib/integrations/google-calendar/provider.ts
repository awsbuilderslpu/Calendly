export type CalendarSummary = { id: string; summary: string; primary: boolean; timeZone?: string };
export type BusyRange = { start: string; end: string };
export type CalendarEvent = { id: string; htmlLink?: string; meetUrl?: string; conferenceId?: string };

export interface GoogleCalendarProvider {
  listCalendars(): Promise<CalendarSummary[]>;
  freeBusy(calendarId: string, timeMin: string, timeMax: string): Promise<BusyRange[]>;
  createEvent(input: { calendarId: string; summary: string; description: string; start: string; end: string; timezone: string; attendees: string[]; requestId: string }): Promise<CalendarEvent>;
  updateEvent(calendarId: string, eventId: string, input: { start: string; end: string; timezone: string }): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}
