import { createHmac, timingSafeEqual } from "node:crypto";
import { getRecruitmentIntegrationSecret } from "@/lib/config/env";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { toInterviewRequest, type InterviewRequest, type InterviewRequestInput } from "@/types/interview-request";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fields: (keyof InterviewRequestInput)[] = [
  "applicationId", "candidateId", "candidateName", "candidateEmail", "jobId", "jobTitle", "roundName", "durationMinutes",
];

export function isValidIntegrationSecret(value: string | null) {
  if (!value) return false;
  const expected = Buffer.from(getRecruitmentIntegrationSecret());
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function validateInterviewRequest(input: unknown): input is InterviewRequestInput {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  if (fields.some((field) => typeof value[field] !== (field === "durationMinutes" ? "number" : "string"))) return false;
  if (!emailPattern.test(value.candidateEmail as string)) return false;
  if (![15, 30, 45, 60, 90, 120].includes(value.durationMinutes as number)) return false;
  return fields.every((field) => field === "durationMinutes" || (value[field] as string).trim().length > 0 && (value[field] as string).length <= 300);
}

export async function createInterviewRequest(input: InterviewRequestInput, externalRequestId: string, requestedBy: string | null): Promise<{ request: InterviewRequest; created: boolean }> {
  const database = createDatabaseAdmin();
  const existing = await database.from("interview_scheduling_requests").select("*").eq("external_request_id", externalRequestId).maybeSingle();
  if (existing.error) throw new Error("Unable to check idempotency record");
  if (existing.data) return { request: toInterviewRequest(existing.data), created: false };

  const inserted = await database.from("interview_scheduling_requests").insert({
    external_request_id: externalRequestId,
    application_id: input.applicationId,
    candidate_id: input.candidateId,
    candidate_name: input.candidateName.trim(),
    candidate_email: input.candidateEmail.trim().toLowerCase(),
    job_id: input.jobId,
    job_title: input.jobTitle.trim(),
    round_name: input.roundName.trim(),
    duration_minutes: input.durationMinutes,
    panel_id: input.panelId ?? null,
    available_from: input.availableFrom ?? null,
    available_until: input.availableUntil ?? null,
    requested_by: requestedBy,
  }).select("*").single();

  if (inserted.error || !inserted.data) {
    if (inserted.error?.code === "23505") {
      const retry = await database.from("interview_scheduling_requests").select("*").eq("external_request_id", externalRequestId).single();
      if (retry.data) return { request: toInterviewRequest(retry.data), created: false };
    }
    throw new Error("Unable to create interview scheduling request");
  }

  await database.from("audit_logs").insert({ actor: requestedBy, action: "INTERVIEW_REQUEST_CREATED", resource: "interview_scheduling_request", resource_id: inserted.data.id });
  return { request: toInterviewRequest(inserted.data), created: true };
}

export async function openInterviewRequest(id: string, actor: string) {
  const database = createDatabaseAdmin();
  const existing = await database.from("interview_scheduling_requests").select("*").eq("id", id).maybeSingle();
  if (existing.error) throw new Error("Unable to load interview request");
  if (!existing.data) return { kind: "missing" as const };
  if (existing.data.status !== "PENDING") return { kind: "invalid_transition" as const, status: existing.data.status };

  const updated = await database.from("interview_scheduling_requests").update({ status: "OPEN", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "PENDING").select("*").single();
  if (updated.error || !updated.data) throw new Error("Unable to open interview request");
  await database.from("audit_logs").insert({ actor, action: "INTERVIEW_REQUEST_OPENED", resource: "interview_scheduling_request", resource_id: id });
  return { kind: "opened" as const, request: toInterviewRequest(updated.data) };
}

export function signIntegrationPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
