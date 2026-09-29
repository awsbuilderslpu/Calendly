import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  
  const { name, email, jobTitle, roundName, durationMinutes } = body;
  if (!name || !email || !jobTitle || !roundName || !durationMinutes) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const db = createDatabaseAdmin();
  const requestId = crypto.randomUUID();
  
  const { error } = await db.from("interview_scheduling_requests").insert({
    id: requestId,
    external_request_id: `manual-${Date.now()}`,
    application_id: `app-${Date.now()}`,
    candidate_id: `cand-${Date.now()}`,
    candidate_name: name,
    candidate_email: email,
    job_id: `job-${crypto.randomUUID().substring(0,8)}`,
    job_title: jobTitle,
    round_name: roundName,
    duration_minutes: durationMinutes,
    status: "OPEN",
    requested_by: access.user.email
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: requestId }, { status: 201 });
}
