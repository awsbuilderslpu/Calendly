import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listNotifications } from "@/lib/notifications/service";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";

export async function GET() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  return NextResponse.json({ notifications: await listNotifications() });
}

export async function POST() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  try { return NextResponse.json({ results: await processPendingNotifications() }); }
  catch { return NextResponse.json({ error: "NOTIFICATION_PROCESSING_FAILED" }, { status: 500 }); }
}
