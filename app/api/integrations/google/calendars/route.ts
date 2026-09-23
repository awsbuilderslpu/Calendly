import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { googleProviderForUser } from "@/lib/integrations/google-calendar/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { return NextResponse.json({ calendars: await googleProviderForUser(user.id).listCalendars() }); }
  catch { return NextResponse.json({ error: "CALENDAR_NOT_CONNECTED" }, { status: 409 }); }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json();
  if (typeof body.calendarId !== "string" || !body.calendarId) return NextResponse.json({ error: "Invalid calendar." }, { status: 400 });
  await createDatabaseAdmin().from("google_calendar_connections").update({ selected_calendar_id: body.calendarId, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
