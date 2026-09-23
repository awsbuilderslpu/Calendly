import { CalendarProvider, CalendarEventInput, CalendarEventResult } from "./types";
import { microsoftGraphRequest } from "./microsoft-client";

export function microsoftProviderForUser(userId: string): CalendarProvider {
  return {
    async createEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
      const attendees = input.attendees.map(email => ({
        emailAddress: { address: email },
        type: "required"
      }));

      // Microsoft Teams meeting
      const eventData = {
        subject: input.summary,
        body: { contentType: "text", content: input.description },
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone },
        attendees,
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness"
      };

      const result = await microsoftGraphRequest(userId, "/me/events", {
        method: "POST",
        body: JSON.stringify(eventData)
      });

      return {
        externalEventId: result.id,
        meetingProvider: "MICROSOFT_TEAMS",
        meetingUrl: result.onlineMeeting?.joinUrl
      };
    },

    async updateEvent(externalCalendarId: string, externalEventId: string, input: CalendarEventInput): Promise<CalendarEventResult> {
      const eventData = {
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone }
      };

      const result = await microsoftGraphRequest(userId, `/me/events/${externalEventId}`, {
        method: "PATCH",
        body: JSON.stringify(eventData)
      });

      if (!result) throw new Error("CALENDAR_EVENT_NOT_FOUND");

      return {
        externalEventId: result.id,
        meetingProvider: "MICROSOFT_TEAMS",
        meetingUrl: result.onlineMeeting?.joinUrl
      };
    },

    async deleteEvent(externalCalendarId: string, externalEventId: string): Promise<void> {
      await microsoftGraphRequest(userId, `/me/events/${externalEventId}`, {
        method: "DELETE"
      });
    }
  };
}
