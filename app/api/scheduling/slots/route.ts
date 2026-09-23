import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getPanelSchedulingData } from "@/lib/db/panels";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { isTimezone, validDate } from "@/lib/scheduling/validation";

export async function GET(request: Request) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  const params = new URL(request.url).searchParams;
  const panelId = params.get("panelId");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const timezone = params.get("timezone");
  const durationMinutes = Number(params.get("duration"));
  const intervalMinutes = Number(params.get("interval") ?? 30);
  if (!panelId || !validDate(startDate) || !validDate(endDate) || !isTimezone(timezone) || ![15, 30, 45, 60, 90, 120].includes(durationMinutes) || ![15, 30, 45, 60].includes(intervalMinutes)) return NextResponse.json({ error: "Invalid slot query." }, { status: 400 });
  try {
    const data = await getPanelSchedulingData(panelId);
    if (!data) return NextResponse.json({ error: "Panel not found." }, { status: 404 });
    const slots = getAvailableSlots({ members: data.members, requiredInterviewers: data.panel.requiredInterviewers, startDate, endDate, durationMinutes, timezone, intervalMinutes });
    return NextResponse.json({ timezone, durationMinutes, slots });
  } catch {
    return NextResponse.json({ error: "Unable to generate availability slots." }, { status: 400 });
  }
}
