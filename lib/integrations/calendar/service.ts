import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";
import { googleProviderForUser } from "@/lib/integrations/google-calendar/client";
import { microsoftProviderForUser } from "./microsoft";
import { CalendarProvider } from "./types";

// Adapt Google client to generic provider
function adaptGoogle(userId: string): CalendarProvider {
  const g = googleProviderForUser(userId);
  return {
    async createEvent(input) {
      // Find calendar id from google_calendar_connections
      const { data } = await createDatabaseAdmin().from("google_calendar_connections").select("selected_calendar_id").eq("user_id", userId).single();
      if (!data?.selected_calendar_id) throw new Error("CALENDAR_NOT_CONNECTED");
      const res = await g.createEvent({ ...input, calendarId: data.selected_calendar_id });
      return { externalEventId: res.id, externalCalendarId: data.selected_calendar_id, meetingProvider: res.meetUrl ? "GOOGLE_MEET" : "NONE", meetingUrl: res.meetUrl };
    },
    async updateEvent(calId, eventId, input) {
      const res = await g.updateEvent(calId, eventId, input);
      return { externalEventId: res.id, meetingProvider: res.htmlLink ? "GOOGLE_MEET" : "NONE", meetingUrl: undefined };
    },
    async deleteEvent(calId, eventId) {
      await g.deleteEvent(calId, eventId);
    }
  };
}

export async function syncInterviewCalendar(interviewId: string) {
  const database = createDatabaseAdmin();
  const { data: interview, error } = await database.from("interviews").select("*").eq("id", interviewId).single();
  if (error || !interview) throw new Error("INTERVIEW_NOT_FOUND");

  // Determine provider: fallback to Google if they have google_calendar_connections. Microsoft if they have microsoft_calendar_connections.
  // We prefer the first connected provider found for an interviewer.
  const interviewerIdsList = await interviewerIds(interviewId);
  let providerType: "GOOGLE" | "MICROSOFT" | null = null;
  let userId = "";

  const { data: msConn } = await database.from("microsoft_calendar_connections").select("user_id").in("user_id", interviewerIdsList).limit(1).maybeSingle();
  if (msConn) {
    providerType = "MICROSOFT";
    userId = msConn.user_id;
  } else {
    const { data: gConn } = await database.from("google_calendar_connections").select("user_id").in("user_id", interviewerIdsList).limit(1).maybeSingle();
    if (gConn) {
      providerType = "GOOGLE";
      userId = gConn.user_id;
    }
  }

  if (!providerType) return { status: "FAILED" as const, error: "CALENDAR_NOT_CONNECTED" };

  const provider: CalendarProvider = providerType === "MICROSOFT" ? microsoftProviderForUser(userId) : adaptGoogle(userId);
  const attendees = await interviewerEmails(interviewId);

  // Check existing integration
  const { data: integration } = await database.from("calendar_integrations").select("*").eq("interview_id", interviewId).eq("provider", providerType).maybeSingle();

  try {
    let result;
    if (integration?.external_event_id && integration.external_calendar_id) {
      result = await provider.updateEvent(integration.external_calendar_id, integration.external_event_id, {
        summary: `${interview.round_name} — ${interview.candidate_name}`,
        description: `Candidate: ${interview.candidate_name}\nJob: ${interview.job_title}\nRound: ${interview.round_name}`,
        start: String(interview.starts_at),
        end: String(interview.ends_at),
        timezone: String(interview.timezone),
        attendees: [String(interview.candidate_email), ...attendees],
        requestId: `calendly-${interviewId}`
      });
    } else {
      result = await provider.createEvent({
        summary: `${interview.round_name} — ${interview.candidate_name}`,
        description: `Candidate: ${interview.candidate_name}\nJob: ${interview.job_title}\nRound: ${interview.round_name}`,
        start: String(interview.starts_at),
        end: String(interview.ends_at),
        timezone: String(interview.timezone),
        attendees: [String(interview.candidate_email), ...attendees],
        requestId: `calendly-${interviewId}`
      });
    }

    await database.from("calendar_integrations").upsert({
      interview_id: interviewId,
      provider: providerType,
      external_event_id: result.externalEventId,
      external_calendar_id: result.externalCalendarId || integration?.external_calendar_id,
      meeting_provider: result.meetingProvider || "NONE",
      meeting_url: result.meetingUrl || integration?.meeting_url,
      status: "SYNCED",
      error: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "interview_id, provider" });

    // Ensure interview is updated to reflect the new truth
    await database.from("interviews").update({
      google_meet_url: result.meetingUrl || integration?.meeting_url,
      calendar_sync_status: "SYNCED"
    }).eq("id", interviewId);

    await writeAudit(interviewId, "CALENDAR_SYNCED", "interview", interviewId);
    return { status: "SYNCED" as const };
  } catch (err: unknown) {
    await database.from("calendar_integrations").upsert({
      interview_id: interviewId, provider: providerType, status: "FAILED", error: "CALENDAR_SYNC_FAILED", updated_at: new Date().toISOString()
    }, { onConflict: "interview_id, provider" });
    return { status: "FAILED" as const, error: "CALENDAR_SYNC_FAILED" };
  }
}

export async function deleteInterviewCalendarEvent(interviewId: string) {
  const database = createDatabaseAdmin();
  const { data: integrations } = await database.from("calendar_integrations").select("*").eq("interview_id", interviewId);
  
  if (!integrations || integrations.length === 0) return { status: "SKIPPED" as const };

  const interviewerIdsList = await interviewerIds(interviewId);
  let overallStatus = "DELETED";

  for (const integration of integrations) {
    if (!integration.external_event_id || !integration.external_calendar_id) continue;
    let userId = "";
    if (integration.provider === "MICROSOFT") {
      const { data: msConn } = await database.from("microsoft_calendar_connections").select("user_id").in("user_id", interviewerIdsList).limit(1).maybeSingle();
      if (msConn) userId = msConn.user_id;
    } else {
      const { data: gConn } = await database.from("google_calendar_connections").select("user_id").in("user_id", interviewerIdsList).limit(1).maybeSingle();
      if (gConn) userId = gConn.user_id;
    }

    if (!userId) continue;

    const provider: CalendarProvider = integration.provider === "MICROSOFT" ? microsoftProviderForUser(userId) : adaptGoogle(userId);
    try {
      await provider.deleteEvent(integration.external_calendar_id, integration.external_event_id);
      await database.from("calendar_integrations").update({ status: "CANCELLED", updated_at: new Date().toISOString() }).eq("id", integration.id);
    } catch {
      overallStatus = "FAILED";
      await database.from("calendar_integrations").update({ status: "FAILED", error: "CALENDAR_DELETE_FAILED", updated_at: new Date().toISOString() }).eq("id", integration.id);
    }
  }
  return { status: overallStatus };
}

async function interviewerIds(interviewId: string) { const { data } = await createDatabaseAdmin().from("interview_panel_members").select("user_id").eq("interview_id", interviewId); return (data ?? []).map((row) => String(row.user_id)); }
async function interviewerEmails(interviewId: string) { const ids = await interviewerIds(interviewId); if (!ids.length) return []; const { data } = await createDatabaseAdmin().from("profiles").select("email").in("id", ids); return (data ?? []).flatMap((row) => typeof row.email === "string" ? [row.email] : []); }
