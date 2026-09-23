import { DateTime } from "luxon";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { getPanelSchedulingData } from "@/lib/db/panels";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { isTimezone } from "@/lib/scheduling/validation";
import { syncInterviewCalendar } from "@/lib/integrations/calendar/service";
import { createRescheduleNotifications } from "@/lib/notifications/service";

const intervalMinutes = 30;

export async function rescheduleInterview(
  interviewId: string,
  startsAt: unknown,
  timezone: unknown,
  idempotencyKey: string,
  actorType: "CANDIDATE" | "RECRUITER" | "ADMIN",
  actorId?: string,
  reason?: string
) {
  if (typeof startsAt !== "string" || !isTimezone(timezone) || !DateTime.fromISO(startsAt, { setZone: true }).isValid) {
    return { kind: "invalid" as const };
  }

  const database = createDatabaseAdmin();
  
  // 1. Fetch current interview to get scheduling request ID and panel info
  const { data: interview } = await database
    .from("interviews")
    .select("scheduling_request_id, ends_at, starts_at, schedule_version, timezone")
    .eq("id", interviewId)
    .single();

  if (!interview) return { kind: "invalid" as const };

  const { data: request } = await database
    .from("interview_scheduling_requests")
    .select("id, duration_minutes, panel_id, expires_at")
    .eq("id", interview.scheduling_request_id)
    .single();

  if (!request) return { kind: "invalid" as const };

  const requestedZone = timezone;
  const localStart = DateTime.fromISO(startsAt, { setZone: true }).setZone(requestedZone);
  const startDate = localStart.toISODate();
  if (!startDate) return { kind: "invalid" as const };

  const startUtc = localStart.toUTC();
  const endUtc = startUtc.plus({ minutes: request.duration_minutes });

  // 2. Validate availability using existing Phase 5 slot engine
  const panel = await getPanelSchedulingData(request.panel_id);
  if (!panel) return { kind: "unavailable" as const };

  // Fetch current interviewers to prefer keeping them
  const { data: currentMembers } = await database
    .from("interview_panel_members")
    .select("user_id")
    .eq("interview_id", interviewId);
  const currentMemberIds = currentMembers?.map(m => m.user_id) || [];

  const slots = getAvailableSlots({
    members: panel.members,
    requiredInterviewers: panel.panel.requiredInterviewers,
    startDate,
    endDate: startDate,
    durationMinutes: request.duration_minutes,
    timezone: requestedZone,
    intervalMinutes
  });

  const matchingSlots = slots.filter((slot) => DateTime.fromISO(slot.start, { setZone: true }).toUTC().toMillis() === startUtc.toMillis());
  if (!matchingSlots.length) return { kind: "slot_unavailable" as const };

  // Find combination that overlaps most with current interviewers
  let bestCombination = matchingSlots[0].interviewers.map(p => p.id);
  let maxOverlap = -1;
  for (const slot of matchingSlots) {
    const ids = slot.interviewers.map(p => p.id);
    const overlap = ids.filter(id => currentMemberIds.includes(id)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestCombination = ids;
    }
  }

  // 3. Perform Reschedule RPC
  const { error } = await database.rpc("reschedule_interview", {
    p_interview_id: interviewId,
    p_idempotency_key: idempotencyKey,
    p_starts_at: startUtc.toISO(),
    p_ends_at: endUtc.toISO(),
    p_timezone: requestedZone,
    p_interviewer_ids: bestCombination,
    p_actor_type: actorType,
    p_actor_id: actorId || null,
    p_reason: reason || null
  });

  if (error) {
    if (error.message.includes("CUTOFF")) return { kind: "cutoff" as const };
    if (error.message.includes("ALREADY_CANCELLED")) return { kind: "cancelled" as const };
    if (error.code === "23P01" || error.message.includes("SLOT_UNAVAILABLE")) return { kind: "slot_unavailable" as const };
    throw error;
  }

  // 4. Update calendar and notifications
  triggerRescheduleSideEffects(interviewId, reason).catch(console.error);

  const { data: finalInterview } = await database
    .from("interviews")
    .select("id, candidate_name, job_title, round_name, starts_at, ends_at, timezone, status, google_meet_url")
    .eq("id", interviewId)
    .single();

  return { 
    kind: "success" as const, 
    interview: {
      id: String(finalInterview?.id),
      candidateName: String(finalInterview?.candidate_name),
      jobTitle: String(finalInterview?.job_title),
      roundName: String(finalInterview?.round_name),
      startsAt: String(finalInterview?.starts_at),
      endsAt: String(finalInterview?.ends_at),
      timezone: String(finalInterview?.timezone),
      status: String(finalInterview?.status),
      googleMeetUrl: finalInterview?.google_meet_url,
      durationMinutes: request.duration_minutes
    }
  };
}

async function triggerRescheduleSideEffects(interviewId: string, reason?: string) {
  try {
    await syncInterviewCalendar(interviewId);
  } catch (err) {
    console.error("Failed to sync calendar after reschedule:", err);
  }
  try {
    await createRescheduleNotifications({ interviewId, reason });
  } catch (err) {
    console.error("Failed to create reschedule notifications:", err);
  }
}
