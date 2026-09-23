import { createDatabaseAdmin } from "@/lib/db/admin";
import { deleteInterviewCalendarEvent } from "@/lib/integrations/calendar/service";
import { createCancellationNotifications } from "@/lib/notifications/service";

export async function cancelInterview(interviewId: string, actorType: "CANDIDATE" | "RECRUITER" | "ADMIN", actorId?: string, reason?: string) {
  const database = createDatabaseAdmin();
  
  // Use a transaction/lock to cancel
  const { error } = await database.rpc("cancel_interview", {
    p_interview_id: interviewId,
    p_actor_type: actorType,
    p_actor_id: actorId || null,
    p_reason: reason || null
  });

  if (error) {
    if (error.message.includes("CUTOFF")) return { success: false, error: "Cancellation is not allowed at this time." };
    if (error.message.includes("ALREADY_CANCELLED")) return { success: false, error: "Interview is already cancelled." };
    return { success: false, error: error.message };
  }

  // Google Calendar Delete (Background or sync)
  void deleteInterviewCalendarEvent(interviewId).catch(console.error);
  
  // Notifications
  void createCancellationNotifications({ interviewId, reason }).catch(console.error);

  return { success: true };
}
