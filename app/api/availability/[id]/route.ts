import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteRule, updateRule } from "@/lib/db/availability";
import { isTimezone, validWindow } from "@/lib/scheduling/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role === "CANDIDATE") return NextResponse.json({ error: "Interviewer access required." }, { status: 403 });
  try {
    const body = await request.json();
    if (body.dayOfWeek !== undefined && (typeof body.dayOfWeek !== "number" || body.dayOfWeek < 0 || body.dayOfWeek > 6)) return NextResponse.json({ error: "Invalid weekday." }, { status: 400 });
    if ((body.startTime !== undefined || body.endTime !== undefined) && !validWindow(body.startTime, body.endTime)) return NextResponse.json({ error: "Both valid startTime and endTime are required." }, { status: 400 });
    if (body.timezone !== undefined && !isTimezone(body.timezone)) return NextResponse.json({ error: "Invalid IANA timezone." }, { status: 400 });
    const rule = await updateRule((await context.params).id, user.id, body, user.email);
    return rule ? NextResponse.json({ rule }) : NextResponse.json({ error: "Availability rule not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Unable to update availability rule." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role === "CANDIDATE") return NextResponse.json({ error: "Interviewer access required." }, { status: 403 });
  const deleted = await deleteRule((await context.params).id, user.id, user.email);
  return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Availability rule not found." }, { status: 404 });
}
