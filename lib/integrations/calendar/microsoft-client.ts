import { createDatabaseAdmin } from "@/lib/db/admin";
import { decryptToken, encryptToken } from "@/lib/integrations/google-calendar/crypto";

const clientId = process.env.MICROSOFT_CLIENT_ID!;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI!;
const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export async function refreshMicrosoftTokenIfNeeded(userId: string) {
  const database = createDatabaseAdmin();
  const { data: connection } = await database
    .from("microsoft_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!connection) throw new Error("CALENDAR_NOT_CONNECTED");

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return decryptToken(connection.access_token_encrypted); // Still valid
  }

  // Need to refresh
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: decryptToken(connection.refresh_token_encrypted),
    grant_type: "refresh_token"
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  if (!res.ok) throw new Error("CALENDAR_AUTH_EXPIRED");
  const tokens = await res.json();

  const newAccessEncrypted = encryptToken(tokens.access_token);
  const newRefreshEncrypted = tokens.refresh_token ? encryptToken(tokens.refresh_token) : connection.refresh_token_encrypted;
  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await database.from("microsoft_calendar_connections").update({
    access_token_encrypted: newAccessEncrypted,
    refresh_token_encrypted: newRefreshEncrypted,
    token_expires_at: newExpires,
    updated_at: new Date().toISOString()
  }).eq("id", connection.id);

  return tokens.access_token;
}

export async function microsoftGraphRequest(userId: string, path: string, options: RequestInit = {}) {
  const token = await refreshMicrosoftTokenIfNeeded(userId);
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorBody = await res.text();
    throw new Error(`Graph API error: ${res.status} ${errorBody}`);
  }
  return res.status !== 204 ? res.json() : null;
}
