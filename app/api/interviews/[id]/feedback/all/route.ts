import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getAllFeedbackForInterview } from "@/lib/db/feedback";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  const { id } = await params;
  const data = await getAllFeedbackForInterview(id);
  return NextResponse.json({ data });
}
