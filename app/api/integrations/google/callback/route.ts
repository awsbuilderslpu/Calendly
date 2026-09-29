import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { encryptToken } from "@/lib/integrations/google-calendar/crypto";
import { createGoogleClient, getGoogleStateCookieName } from "@/lib/integrations/google-calendar/oauth";
import { writeAudit } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const params = new URL(request.url).searchParams;
  const state = request.cookies.get(getGoogleStateCookieName())?.value;
  const code = params.get("code");
  if (!user || !state || state !== params.get("state") || !code) return NextResponse.redirect(new URL("/settings?google=failed", request.url));
  try {
    const client = createGoogleClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) throw new Error("Missing Google token");
    client.setCredentials(tokens);
    const { google } = await import("googleapis");
    const profile = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
    const database = createDatabaseAdmin();
    await database.from("google_calendar_connections").upsert({ user_id: user.id, google_account_id: profile.data.id ?? null, email: profile.data.email ?? null, access_token_encrypted: encryptToken(tokens.access_token), refresh_token_encrypted: encryptToken(tokens.refresh_token), token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null, scopes: tokens.scope?.split(" ") ?? [], selected_calendar_id: "primary", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    await writeAudit(user.email, "GOOGLE_CALENDAR_CONNECTED", "google_calendar_connection", user.id);
    const response = NextResponse.redirect(new URL("/settings?google=connected", request.url));
    response.cookies.delete(getGoogleStateCookieName());
    return response;
  } catch (err) { console.error("Google Callback Error:", err); return NextResponse.redirect(new URL("/settings?google=failed&reason=" + encodeURIComponent(err instanceof Error ? err.message : String(err)), request.url)); }
}
