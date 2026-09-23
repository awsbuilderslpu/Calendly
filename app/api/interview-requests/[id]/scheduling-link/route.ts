import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterviewRequest } from "@/lib/db/interview-requests";
import { createSchedulingLink } from "@/lib/db/scheduling-links";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  const request = await getInterviewRequest((await context.params).id);
  if (!request) return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
  try {
    const link = await createSchedulingLink(request, access.user.email);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create scheduling link." }, { status: 400 });
  }
}
