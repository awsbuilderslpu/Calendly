import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { cancelInterview } from "@/lib/booking/cancel";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter access required" }, { status: access.status });

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* optional body */ }

  const result = await cancelInterview(id, "RECRUITER", access.user.id, (body.reason as string));

  if (!result.success) {
    if (result.error === "Cancellation is not allowed at this time.") return NextResponse.json({ error: result.error }, { status: 403 });
    if (result.error === "Interview is already cancelled.") return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, status: "CANCELLED" }, { status: 200 });
}
