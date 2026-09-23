import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createException, listExceptions } from "@/lib/db/availability";
import { validDate, validWindow } from "@/lib/scheduling/validation";

async function currentUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "CANDIDATE") return false;
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (user === null) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user === false) return NextResponse.json({ error: "Interviewer access required." }, { status: 403 });
  return NextResponse.json({ exceptions: await listExceptions(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (user === null) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user === false) return NextResponse.json({ error: "Interviewer access required." }, { status: 403 });
  try {
    const body = await request.json();
    if (!validDate(body.date) || !validWindow(body.startTime, body.endTime) || typeof body.isAvailable !== "boolean" || (body.reason !== undefined && typeof body.reason !== "string")) return NextResponse.json({ error: "Invalid availability exception." }, { status: 400 });
    const exception = await createException(user.id, { date: body.date, startTime: body.startTime, endTime: body.endTime, isAvailable: body.isAvailable, reason: body.reason?.trim() || null }, user.email);
    return NextResponse.json({ exception }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create availability exception." }, { status: 400 });
  }
}
