import { NextResponse } from "next/server";
import { allowPublicRequest } from "@/lib/security/public-rate-limit";
import { validateSchedulingToken } from "@/lib/db/scheduling-links";
import { createDatabaseAdmin } from "@/lib/db/admin";
import crypto from "node:crypto";

function hashSchedulingToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const token = (await context.params).token;
  if (!allowPublicRequest(`${address}:${token.slice(0, 12)}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  
  const data = await validateSchedulingToken(token);
  if (!data) {
    // Determine why it failed
    const db = createDatabaseAdmin();
    const { data: linkData } = await db.from("scheduling_links")
      .select("used_at, interview_scheduling_requests(status)")
      .eq("token_hash", hashSchedulingToken(token))
      .maybeSingle();
      
    if (linkData) {
      const reqs = linkData.interview_scheduling_requests as any;
      const requestStatus = Array.isArray(reqs) ? reqs[0]?.status : reqs?.status;
      if (linkData.used_at || requestStatus === "SCHEDULED") {
        return NextResponse.json({ error: "This interview has already been scheduled." }, { status: 409, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
      }
    }
    
    return NextResponse.json({ error: "This scheduling link is invalid or no longer available." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  
  return NextResponse.json({ candidate: { name: data.candidateName }, interview: { round: data.roundName, durationMinutes: data.durationMinutes, position: data.jobTitle }, timezone: "UTC", availableFrom: data.availableFrom, availableUntil: data.availableUntil, expiresAt: data.expiresAt }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
