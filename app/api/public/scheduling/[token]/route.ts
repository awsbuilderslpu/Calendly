import { NextResponse } from "next/server";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";
import { validateSchedulingToken } from "@/lib/db/scheduling-links";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowPublicRequest(`${address}:${(await context.params).token.slice(0, 12)}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const data = await validateSchedulingToken((await context.params).token);
  if (!data) return NextResponse.json({ error: "This scheduling link is invalid or no longer available." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  return NextResponse.json({ candidate: { name: data.candidateName }, interview: { round: data.roundName, durationMinutes: data.durationMinutes, position: data.jobTitle }, timezone: "UTC", availableFrom: data.availableFrom, availableUntil: data.availableUntil, expiresAt: data.expiresAt }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
