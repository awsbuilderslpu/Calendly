import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { syncInterviewCalendar } from "@/lib/integrations/calendar/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  try { return NextResponse.json(await syncInterviewCalendar((await context.params).id)); }
  catch { return NextResponse.json({ error: "CALENDAR_SYNC_FAILED" }, { status: 502 }); }
}
