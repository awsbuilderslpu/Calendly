import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getFeedbackForInterviewer, submitFeedback } from "@/lib/db/feedback";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const feedback = await getFeedbackForInterviewer(id, user.id);
    const body = await request.json();
    
    // Limits
    if (body.strengths && body.strengths.length > 5000) return NextResponse.json({ error: "Strengths too long" }, { status: 400 });
    if (body.concerns && body.concerns.length > 5000) return NextResponse.json({ error: "Concerns too long" }, { status: 400 });
    if (body.comments && body.comments.length > 5000) return NextResponse.json({ error: "Comments too long" }, { status: 400 });

    await submitFeedback(feedback.id, user.id, body);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err instanceof Error ? err.message : String(err)) === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if ((err instanceof Error ? err.message : String(err)) === "Already submitted") return NextResponse.json({ error: "Feedback has already been submitted and cannot be edited." }, { status: 409 });
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 400 });
  }
}
