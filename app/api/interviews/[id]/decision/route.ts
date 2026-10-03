import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterview } from "@/lib/db/interviews";
import { updateCandidateStatus } from "@/lib/integrations/google-sheets/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { decision } = body;

    if (!decision) return NextResponse.json({ error: "Decision required" }, { status: 400 });

    const interview = await getInterview(id);
    if (!interview || !interview.applicationId) {
      return NextResponse.json({ error: "Interview or Application ID not found" }, { status: 404 });
    }

    await updateCandidateStatus(interview.applicationId, decision);
    
    return NextResponse.json({ success: true, decision });
  } catch (err: any) {
    console.error("Decision update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update decision" }, { status: 500 });
  }
}
