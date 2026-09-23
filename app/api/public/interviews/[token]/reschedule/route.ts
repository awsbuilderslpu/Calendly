import { NextRequest, NextResponse } from "next/server";
import { verifyManagementToken } from "@/lib/booking/action-tokens";
import { rescheduleInterview } from "@/lib/booking/reschedule";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  
  if (!allowPublicRequest(`reschedule:${address}:${token.slice(0, 12)}`)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "A valid Idempotency-Key is required." }, { status: 400 });
  }

  const interviewId = await verifyManagementToken(token);
  if (!interviewId) {
    return NextResponse.json({ error: "This interview management link is no longer available." }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const result = await rescheduleInterview(
    interviewId,
    (body.startsAt as string),
    (body.timezone as string),
    idempotencyKey,
    "CANDIDATE",
    undefined,
    (body.reason as string)
  );

  if (result.kind === "invalid") return NextResponse.json({ error: "Invalid reschedule request." }, { status: 400 });
  if (result.kind === "cutoff") return NextResponse.json({ error: "Rescheduling is not allowed at this time." }, { status: 403 });
  if (result.kind === "cancelled") return NextResponse.json({ error: "This interview is already cancelled." }, { status: 409 });
  if (result.kind === "slot_unavailable") return NextResponse.json({ error: "This time slot is no longer available." }, { status: 409 });

  return NextResponse.json({ success: true, interview: result.interview }, { status: 200 });
}
