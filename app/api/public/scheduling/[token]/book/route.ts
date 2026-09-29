import { NextResponse } from "next/server";
import { bookInterview } from "@/lib/booking/book-interview";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";
import { syncInterviewCalendar } from "@/lib/integrations/calendar/service";
import { createBookingNotifications } from "@/lib/notifications/service";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";

const unavailable = () => NextResponse.json({ error: "This scheduling link is no longer available." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowPublicRequest(`book:${address}:${token.slice(0, 12)}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length > 200) return NextResponse.json({ error: "A valid Idempotency-Key is required." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid booking request." }, { status: 400 }); }
  const value = body as Record<string, unknown>;
  const result = await bookInterview(token, value.startsAt, value.timezone, key);
  if (result.kind === "unavailable") return unavailable();
  if (result.kind === "invalid") return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  if (result.kind === "slot_unavailable") return NextResponse.json({ error: "This time slot is no longer available." }, { status: 409 });
  if (result.kind === "created") {
    void syncInterviewCalendar(result.interview.id).catch(() => undefined);
    createBookingNotifications({ interviewId: result.interview.id }).then(() => processPendingNotifications()).catch(() => undefined);
  }
  return NextResponse.json({ success: true, interview: result.interview, calendarSyncStatus: "PENDING" }, { status: result.kind === "created" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
}
