import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getPanelSchedulingData } from "@/lib/db/panels";
import { validateSchedulingToken } from "@/lib/db/scheduling-links";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";
import { isTimezone, validDate } from "@/lib/scheduling/validation";

const genericError = () => NextResponse.json({ error: "This scheduling link is invalid or no longer available." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowPublicRequest(`${address}:${token.slice(0, 12)}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const data = await validateSchedulingToken(token);
  if (!data) return genericError();
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const timezone = params.get("timezone");
  if (!validDate(date) || !isTimezone(timezone) || date < data.availableFrom || date > data.availableUntil) return NextResponse.json({ error: "No availability is available for that date." }, { status: 400, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  if (DateTime.fromISO(date, { zone: timezone }).startOf("day") < DateTime.now().setZone(timezone).startOf("day")) return NextResponse.json({ date, timezone, durationMinutes: data.durationMinutes, slots: [] }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  const panel = await getPanelSchedulingData(data.panelId);
  if (!panel) return genericError();
  try {
    const slots = getAvailableSlots({ members: panel.members, requiredInterviewers: panel.panel.requiredInterviewers, startDate: date, endDate: date, durationMinutes: data.durationMinutes, timezone, intervalMinutes: 30 });
    return NextResponse.json({ date, timezone, durationMinutes: data.durationMinutes, slots: slots.map((slot) => ({ start: slot.start, end: slot.end })) }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return genericError();
  }
}
