import { createDatabaseAdmin } from "@/lib/db/admin";
import { toInterviewRequest, type InterviewRequest } from "@/types/interview-request";

export async function listInterviewRequests(): Promise<InterviewRequest[]> {
  const { data, error } = await createDatabaseAdmin().from("interview_scheduling_requests").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load interview requests");
  return (data ?? []).map(toInterviewRequest);
}

export async function getInterviewRequest(id: string): Promise<InterviewRequest | null> {
  const { data, error } = await createDatabaseAdmin().from("interview_scheduling_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load interview request");
  return data ? toInterviewRequest(data) : null;
}

export async function getInterviewRequestCounts() {
  const database = createDatabaseAdmin();
  const { data, error } = await database.from("interview_scheduling_requests").select("status");
  if (error) {
    console.error("Unable to load interview request counts:", error.code ?? "database_error");
    return null;
  }
  return (data ?? []).reduce((counts, row) => {
    if (row.status === "PENDING") counts.pending += 1;
    if (row.status === "OPEN") counts.open += 1;
    if (row.status === "SCHEDULED") counts.scheduled += 1;
    return counts;
  }, { pending: 0, open: 0, scheduled: 0 });
}
