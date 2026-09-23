import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { googleProviderForUser } from "@/lib/integrations/google-calendar/client";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json();
  if (typeof body.calendarId !== "string" || typeof body.timeMin !== "string" || typeof body.timeMax !== "string") return NextResponse.json({ error: "Invalid free/busy query." }, { status: 400 });
  try { return NextResponse.json({ busy: await googleProviderForUser(user.id).freeBusy(body.calendarId, body.timeMin, body.timeMax) }); }
  catch { return NextResponse.json({ error: "CALENDAR_FREEBUSY_FAILED" }, { status: 502 }); }
}
