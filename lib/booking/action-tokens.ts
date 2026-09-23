import crypto from "crypto";
import { createDatabaseAdmin } from "@/lib/db/admin";

export function generateActionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashActionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createManagementToken(interviewId: string) {
  const token = generateActionToken();
  const tokenHash = hashActionToken(token);
  
  // Revoke old tokens
  const database = createDatabaseAdmin();
  await database.from("interview_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("interview_id", interviewId)
    .eq("action_type", "MANAGE")
    .is("used_at", null);

  // Expiry in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await database.from("interview_action_tokens").insert({
    interview_id: interviewId,
    token_hash: tokenHash,
    action_type: "MANAGE",
    expires_at: expiresAt,
  });

  return token;
}

export async function verifyManagementToken(token: string) {
  const tokenHash = hashActionToken(token);
  const database = createDatabaseAdmin();
  
  const { data, error } = await database.from("interview_action_tokens")
    .select("interview_id, used_at, expires_at")
    .eq("token_hash", tokenHash)
    .eq("action_type", "MANAGE")
    .single();

  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  return data.interview_id;
}
