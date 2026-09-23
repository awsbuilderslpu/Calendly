import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { rescheduleInterview } from "@/lib/booking/reschedule";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter access required" }, { status: access.status });

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const idempotencyKey = request.headers.get("idempotency-key") || `recruiter-reschedule-${Date.now()}`;

  const result = await rescheduleInterview(
    id,
    (body.startsAt as string),
    (body.timezone as string),
    idempotencyKey,
    "RECRUITER",
    access.user.id,
    (body.reason as string)
  );

  if (result.kind === "invalid") return NextResponse.json({ error: "Invalid reschedule request." }, { status: 400 });
  if (result.kind === "cutoff") return NextResponse.json({ error: "Rescheduling is not allowed at this time." }, { status: 403 });
  if (result.kind === "cancelled") return NextResponse.json({ error: "This interview is already cancelled." }, { status: 409 });
  if (result.kind === "slot_unavailable") return NextResponse.json({ error: "This time slot is no longer available." }, { status: 409 });

  return NextResponse.json({ success: true, interview: result.interview }, { status: 200 });
}
