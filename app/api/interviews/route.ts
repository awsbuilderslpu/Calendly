import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listInterviews } from "@/lib/db/interviews";

export async function GET() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  return NextResponse.json({ interviews: await listInterviews() });
}
