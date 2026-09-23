import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getFeedbackForInterviewer, saveFeedbackDraft } from "@/lib/db/feedback";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await getFeedbackForInterviewer(id, user.id);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    if ((err instanceof Error ? err.message : String(err)) === "Not assigned to this interview") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const feedback = await getFeedbackForInterviewer(id, user.id);
    const body = await request.json();
    await saveFeedbackDraft(feedback.id, user.id, body);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err instanceof Error ? err.message : String(err)) === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if ((err instanceof Error ? err.message : String(err)) === "Cannot edit submitted feedback") return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 409 });
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 400 });
  }
}
