import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await createDatabaseAdmin().from("google_calendar_connections").select("email, selected_calendar_id, token_expires_at, scopes").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to read Google Calendar status." }, { status: 500 });
  return NextResponse.json({ connected: Boolean(data), email: data?.email ?? null, selectedCalendarId: data?.selected_calendar_id ?? null, scopes: data?.scopes ?? [] });
}
