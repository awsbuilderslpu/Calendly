import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";
import { googleProviderForUser } from "@/lib/integrations/google-calendar/client";

export async function syncInterviewCalendar(interviewId: string) {
  const database = createDatabaseAdmin();
  const { data: interview, error } = await database.from("interviews").select("*").eq("id", interviewId).maybeSingle();
  if (error || !interview) throw new Error("INTERVIEW_NOT_FOUND");
  const { data: connection } = await database.from("google_calendar_connections").select("user_id, selected_calendar_id").in("user_id", await interviewerIds(interviewId)).limit(1).maybeSingle();
  
  if (!connection?.selected_calendar_id) {
    await markSync(database, interviewId, "FAILED", "CALENDAR_NOT_CONNECTED");
    return { status: "FAILED" as const, error: "CALENDAR_NOT_CONNECTED" };
  }

  try {
    const provider = googleProviderForUser(String(connection.user_id));
    const { data: candidate } = await database.from("interviews").select("candidate_email, candidate_name, job_title, round_name, starts_at, ends_at, timezone, candidate_id, google_event_id, google_calendar_id").eq("id", interviewId).single();
    if (!candidate) throw new Error("INTERVIEW_NOT_FOUND");
    
    const attendees = await interviewerEmails(interviewId);

    if (candidate.google_event_id && candidate.google_calendar_id) {
      // UPDATE existing event
      await provider.updateEvent(candidate.google_calendar_id, candidate.google_event_id, {
        start: candidate.starts_at,
        end: candidate.ends_at,
        timezone: candidate.timezone,
      });
      await markSync(database, interviewId, "SYNCED", "");
      await writeAudit(String(interviewId), "GOOGLE_CALENDAR_UPDATED", "interview", interviewId);
      return { status: "SYNCED" as const, googleEventId: candidate.google_event_id };
    } else {
      // CREATE new event
      const event = await provider.createEvent({ calendarId: connection.selected_calendar_id, summary: `${candidate.round_name} — ${candidate.candidate_name}`, description: `Candidate: ${candidate.candidate_name}\nJob: ${candidate.job_title}\nRound: ${candidate.round_name}\nInterview ID: ${interviewId}`, start: candidate.starts_at, end: candidate.ends_at, timezone: candidate.timezone, attendees: [candidate.candidate_email, ...attendees], requestId: `calendly-${interviewId}` });
      await database.from("interviews").update({ calendar_provider: "google", google_calendar_id: connection.selected_calendar_id, google_event_id: event.id, google_meet_url: event.meetUrl ?? null, google_conference_id: event.conferenceId ?? null, calendar_sync_status: "SYNCED", calendar_sync_error: null, calendar_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", interviewId);
      await writeAudit(String(interviewId), "GOOGLE_CALENDAR_SYNCED", "interview", interviewId);
      return { status: "SYNCED" as const, googleEventId: event.id, googleMeetUrl: event.meetUrl };
    }
  } catch {
    await markSync(database, interviewId, "FAILED", "CALENDAR_SYNC_FAILED");
    await writeAudit(String(interviewId), "GOOGLE_CALENDAR_SYNC_FAILED", "interview", interviewId);
    return { status: "FAILED" as const, error: "CALENDAR_SYNC_FAILED" };
  }
}

export async function deleteInterviewCalendarEvent(interviewId: string) {
  const database = createDatabaseAdmin();
  const { data: interview } = await database.from("interviews").select("*").eq("id", interviewId).single();
  if (!interview || !interview.google_event_id || !interview.google_calendar_id) return { status: "SKIPPED" as const };
  
  const { data: connection } = await database.from("google_calendar_connections").select("user_id").in("user_id", await interviewerIds(interviewId)).limit(1).maybeSingle();
  if (!connection) return { status: "FAILED" as const };

  try {
    const provider = googleProviderForUser(String(connection.user_id));
    await provider.deleteEvent(interview.google_calendar_id, interview.google_event_id);
    await database.from("interviews").update({ 
      calendar_sync_status: "CANCELLED", 
      updated_at: new Date().toISOString() 
    }).eq("id", interviewId);
    return { status: "DELETED" as const };
  } catch (err) {
    await markSync(database, interviewId, "FAILED", "CALENDAR_DELETE_FAILED");
    return { status: "FAILED" as const };
  }
}

async function interviewerIds(interviewId: string) { const { data } = await createDatabaseAdmin().from("interview_panel_members").select("user_id").eq("interview_id", interviewId); return (data ?? []).map((row) => String(row.user_id)); }
async function interviewerEmails(interviewId: string) { const ids = await interviewerIds(interviewId); if (!ids.length) return []; const { data } = await createDatabaseAdmin().from("profiles").select("email").in("id", ids); return (data ?? []).flatMap((row) => typeof row.email === "string" ? [row.email] : []); }
async function markSync(database: ReturnType<typeof createDatabaseAdmin>, interviewId: string, status: string, error: string) { await database.from("interviews").update({ calendar_sync_status: status, calendar_sync_error: error || null, updated_at: new Date().toISOString() }).eq("id", interviewId); }
