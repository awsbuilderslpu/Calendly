import { google } from "googleapis";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { decryptToken, encryptToken } from "@/lib/integrations/google-calendar/crypto";
import { createGoogleClient } from "@/lib/integrations/google-calendar/oauth";
import type { GoogleCalendarProvider } from "@/lib/integrations/google-calendar/provider";

async function connectionForUser(userId: string) {
  const { data, error } = await createDatabaseAdmin().from("google_calendar_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) throw new Error("CALENDAR_NOT_CONNECTED");
  const client = createGoogleClient();
  client.setCredentials({ access_token: decryptToken(String(data.access_token_encrypted)), refresh_token: decryptToken(String(data.refresh_token_encrypted)), expiry_date: data.token_expires_at ? new Date(String(data.token_expires_at)).getTime() : undefined });
  client.on("tokens", async (tokens) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tokens.access_token) update.access_token_encrypted = encryptToken(tokens.access_token);
    if (tokens.expiry_date) update.token_expires_at = new Date(tokens.expiry_date).toISOString();
    await createDatabaseAdmin().from("google_calendar_connections").update(update).eq("id", data.id);
  });
  return { client, connection: data };
}

export function googleProviderForUser(userId: string): GoogleCalendarProvider {
  return {
    async listCalendars() {
      const { client } = await connectionForUser(userId);
      const response = await google.calendar({ version: "v3", auth: client }).calendarList.list();
      return (response.data.items ?? []).map((item) => ({ id: String(item.id), summary: item.summary ?? item.id ?? "Calendar", primary: item.primary === true, timeZone: item.timeZone ?? undefined }));
    },
    async freeBusy(calendarId, timeMin, timeMax) {
      const { client } = await connectionForUser(userId);
      const response = await google.calendar({ version: "v3", auth: client }).freebusy.query({ requestBody: { timeMin, timeMax, items: [{ id: calendarId }] } });
      return (response.data.calendars?.[calendarId]?.busy ?? []).flatMap((range) => range.start && range.end ? [{ start: range.start, end: range.end }] : []);
    },
    async createEvent(input) {
      const { client } = await connectionForUser(userId);
      const response = await google.calendar({ version: "v3", auth: client }).events.insert({ calendarId: input.calendarId, conferenceDataVersion: 1, sendUpdates: "all", requestBody: { summary: input.summary, description: input.description, start: { dateTime: input.start, timeZone: input.timezone }, end: { dateTime: input.end, timeZone: input.timezone }, attendees: input.attendees.map((email) => ({ email })), conferenceData: { createRequest: { requestId: input.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } } } });
      const conference = response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video");
      return { id: String(response.data.id), htmlLink: response.data.htmlLink ?? undefined, meetUrl: conference?.uri ?? undefined, conferenceId: response.data.conferenceData?.conferenceId ?? undefined };
    },
    async updateEvent(calendarId, eventId, input) {
      const { client } = await connectionForUser(userId);
      const response = await google.calendar({ version: "v3", auth: client }).events.patch({ calendarId, eventId, sendUpdates: "all", requestBody: { start: { dateTime: input.start, timeZone: input.timezone }, end: { dateTime: input.end, timeZone: input.timezone } } });
      return { id: String(response.data.id), htmlLink: response.data.htmlLink ?? undefined };
    },
    async deleteEvent(calendarId, eventId) {
      const { client } = await connectionForUser(userId);
      await google.calendar({ version: "v3", auth: client }).events.delete({ calendarId, eventId, sendUpdates: "all" });
    },
  };
}
