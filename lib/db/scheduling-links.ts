import { createHash, randomBytes } from "node:crypto";
import { DateTime } from "luxon";
import { getSchedulingLinkExpiryDays, publicConfig } from "@/lib/config/env";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";
import { toInterviewRequest, type InterviewRequest } from "@/types/interview-request";

export type PublicSchedulingRequest = {
  id: string;
  candidateName: string;
  jobTitle: string;
  roundName: string;
  durationMinutes: number;
  expiresAt: string;
  availableFrom: string;
  availableUntil: string;
  panelId: string;
};

export type SchedulingAccess = PublicSchedulingRequest & {
  linkId: string;
  requestId: string;
  request: InterviewRequest;
};

export function hashSchedulingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRawSchedulingToken() {
  return randomBytes(32).toString("base64url");
}

function toPublicRequest(request: InterviewRequest, expiresAt: string): PublicSchedulingRequest {
  if (!request.panelId) throw new Error("Scheduling request has no panel");
  const availableFrom = request.availableFrom ?? DateTime.utc().toISODate()!;
  const availableUntil = request.availableUntil ?? DateTime.fromISO(expiresAt).toISODate()!;
  return { id: request.id, candidateName: request.candidateName, jobTitle: request.jobTitle, roundName: request.roundName, durationMinutes: request.durationMinutes, expiresAt, availableFrom, availableUntil, panelId: request.panelId };
}

export async function createSchedulingLink(request: InterviewRequest, actor: string) {
  if (request.status !== "OPEN") throw new Error("Only OPEN requests can receive scheduling links");
  if (!request.panelId) throw new Error("Assign a panel before generating a scheduling link");
  const database = createDatabaseAdmin();
  await database.from("scheduling_links").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("scheduling_request_id", request.id).is("revoked_at", null).is("used_at", null);
  const rawToken = createRawSchedulingToken();
  const expiresAt = DateTime.utc().plus({ days: getSchedulingLinkExpiryDays() }).toISO();
  if (!expiresAt) throw new Error("Unable to calculate link expiration");
  const { error } = await database.from("scheduling_links").insert({ scheduling_request_id: request.id, token_hash: hashSchedulingToken(rawToken), expires_at: expiresAt });
  if (error) throw new Error("Unable to create scheduling link");
  await writeAudit(actor, "SCHEDULING_LINK_CREATED", "scheduling_request", request.id);
  return { url: `${publicConfig.appUrl}/schedule/${rawToken}`, expiresAt };
}

export async function validateSchedulingToken(rawToken: string): Promise<PublicSchedulingRequest | null> {
  if (!rawToken || rawToken.length < 32 || rawToken.length > 128) return null;
  const { data, error } = await createDatabaseAdmin().from("scheduling_links").select("expires_at, revoked_at, used_at, interview_scheduling_requests(*)").eq("token_hash", hashSchedulingToken(rawToken)).maybeSingle();
  if (error || !data || data.revoked_at || data.used_at || DateTime.fromISO(String(data.expires_at)) <= DateTime.utc()) return null;
  const requestRow = Array.isArray(data.interview_scheduling_requests) ? data.interview_scheduling_requests[0] : data.interview_scheduling_requests;
  if (!requestRow) return null;
  const request = toInterviewRequest(requestRow as Record<string, unknown>);
  if (request.status !== "OPEN") return null;
  try { return toPublicRequest(request, String(data.expires_at)); } catch { return null; }
}

export async function getSchedulingAccess(rawToken: string): Promise<SchedulingAccess | null> {
  if (!rawToken || rawToken.length < 32 || rawToken.length > 128) return null;
  const { data, error } = await createDatabaseAdmin().from("scheduling_links").select("id, expires_at, revoked_at, used_at, interview_scheduling_requests(*)").eq("token_hash", hashSchedulingToken(rawToken)).maybeSingle();
  if (error || !data || data.revoked_at || data.used_at || DateTime.fromISO(String(data.expires_at)) <= DateTime.utc()) return null;
  const requestRow = Array.isArray(data.interview_scheduling_requests) ? data.interview_scheduling_requests[0] : data.interview_scheduling_requests;
  if (!requestRow) return null;
  const request = toInterviewRequest(requestRow as Record<string, unknown>);
  if (request.status !== "OPEN") return null;
  try {
    const publicRequest = toPublicRequest(request, String(data.expires_at));
    return { ...publicRequest, linkId: String(data.id), requestId: request.id, request };
  } catch { return null; }
}

export async function revokeSchedulingLinks(requestId: string, actor: string) {
  const { error } = await createDatabaseAdmin().from("scheduling_links").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("scheduling_request_id", requestId).is("revoked_at", null);
  if (error) throw new Error("Unable to revoke scheduling links");
  await writeAudit(actor, "SCHEDULING_LINK_REVOKED", "scheduling_request", requestId);
}

export function linkHashForTest(rawToken: string) {
  return hashSchedulingToken(rawToken);
}
