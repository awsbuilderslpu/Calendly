import { DateTime } from "luxon";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { getPanelSchedulingData } from "@/lib/db/panels";
import { getSchedulingAccess } from "@/lib/db/scheduling-links";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { isTimezone } from "@/lib/scheduling/validation";
import type { Interview } from "@/types/interview";
import { createBookingNotifications } from "@/lib/notifications/service";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";

const intervalMinutes = 30;

export async function bookInterview(rawToken: string, startsAt: unknown, timezone: unknown, idempotencyKey: string) {
  const access = await getSchedulingAccess(rawToken);
  if (!access) return { kind: "unavailable" as const };
  if (typeof startsAt !== "string" || !isTimezone(timezone) || !DateTime.fromISO(startsAt, { setZone: true }).isValid) return { kind: "invalid" as const };
  const requestedZone = timezone;
  const localStart = DateTime.fromISO(startsAt, { setZone: true }).setZone(requestedZone);
  const startDate = localStart.toISODate();
  if (!startDate || startDate < access.availableFrom || startDate > access.availableUntil) return { kind: "invalid" as const };

  const startUtc = localStart.toUTC();
  const endUtc = startUtc.plus({ minutes: access.request.durationMinutes });
  const panel = await getPanelSchedulingData(access.panelId);
  if (!panel) return { kind: "unavailable" as const };
  const slots = getAvailableSlots({ members: panel.members, requiredInterviewers: panel.panel.requiredInterviewers, startDate, endDate: startDate, durationMinutes: access.request.durationMinutes, timezone: requestedZone, intervalMinutes });
  const combinations = slots.filter((slot) => DateTime.fromISO(slot.start, { setZone: true }).toUTC().toMillis() === startUtc.toMillis()).map((slot) => slot.interviewers.map((person) => person.id));
  if (!combinations.length) return { kind: "slot_unavailable" as const };

  const database = createDatabaseAdmin();
  for (const interviewerIds of combinations) {
    const { data, error } = await database.rpc("book_interview", {
      p_scheduling_request_id: access.requestId,
      p_scheduling_link_id: access.linkId,
      p_idempotency_key: idempotencyKey,
      p_starts_at: startUtc.toISO(),
      p_ends_at: endUtc.toISO(),
      p_timezone: requestedZone,
      p_interviewer_ids: interviewerIds,
    });
    if (!error && data) {
      const interview = await loadPublicInterview(String(data.id));
      if (interview) {
        if (data.created === true) {
          // Asynchronously handle notifications
          triggerNotifications(String(data.id)).catch(console.error);
        }
        return { kind: data.created === false ? "idempotent" as const : "created" as const, interview };
      }
    }
    if (error?.code === "23P01" || error?.message?.includes("SLOT_UNAVAILABLE")) continue;
    if (error?.message?.includes("LINK_UNAVAILABLE") || error?.message?.includes("REQUEST_UNAVAILABLE")) return { kind: "unavailable" as const };
  }
  return { kind: "slot_unavailable" as const };
}

async function triggerNotifications(interviewId: string) {
  try {
    await createBookingNotifications({ interviewId });
    // Process the newly created pending notifications
    await processPendingNotifications();
  } catch (err) {
    console.error("Failed to trigger notifications:", err);
  }
}

async function loadPublicInterview(id: string): Promise<Pick<Interview, "id" | "candidateName" | "jobTitle" | "roundName" | "startsAt" | "endsAt" | "timezone" | "durationMinutes"> | null> {
  const { data, error } = await createDatabaseAdmin().from("interviews").select("id, candidate_name, job_title, round_name, starts_at, ends_at, timezone").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const startsAt = String(data.starts_at);
  const endsAt = String(data.ends_at);
  return { id: String(data.id), candidateName: String(data.candidate_name), jobTitle: String(data.job_title), roundName: String(data.round_name), startsAt, endsAt, timezone: String(data.timezone), durationMinutes: Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000) };
}
