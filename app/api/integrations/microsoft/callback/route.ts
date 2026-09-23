import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { encryptToken } from "@/lib/integrations/google-calendar/crypto";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateUserId = request.nextUrl.searchParams.get("state"); // User id passed in state
  
  if (!code || !stateUserId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  try {
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code"
      })
    });
    
    if (!res.ok) throw new Error("Token exchange failed");
    const tokens = await res.json();
    
    // Get user email
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const me = await meRes.json();

    const database = createDatabaseAdmin();
    await database.from("microsoft_calendar_connections").upsert({
      user_id: stateUserId,
      microsoft_account_id: me.id,
      email: me.mail || me.userPrincipalName,
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id, microsoft_account_id" });

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
