import { NextRequest, NextResponse } from "next/server";
import { verifyManagementToken } from "@/lib/booking/action-tokens";
import { cancelInterview } from "@/lib/booking/cancel";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  
  if (!allowPublicRequest(`cancel:${address}:${token.slice(0, 12)}`)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Basic Idempotency handling at the controller level for cancel
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "A valid Idempotency-Key is required." }, { status: 400 });
  }

  const interviewId = await verifyManagementToken(token);
  if (!interviewId) {
    return NextResponse.json({ error: "This interview management link is no longer available." }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* optional body */ }

  const result = await cancelInterview(interviewId, "CANDIDATE", undefined, (body.reason as string));

  if (!result.success) {
    if (result.error === "Cancellation is not allowed at this time.") return NextResponse.json({ error: result.error }, { status: 403 });
    if (result.error === "Interview is already cancelled.") return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, status: "CANCELLED" }, { status: 200 });
}
