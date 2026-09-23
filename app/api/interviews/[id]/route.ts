import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterview } from "@/lib/db/interviews";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  const interview = await getInterview((await context.params).id);
  return interview ? NextResponse.json({ interview }) : NextResponse.json({ error: "Interview not found." }, { status: 404 });
}
