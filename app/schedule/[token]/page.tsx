import type { Metadata } from "next";
import CandidateScheduler from "@/components/scheduling/candidate-scheduler";
import { validateSchedulingToken } from "@/lib/db/scheduling-links";
import { createDatabaseAdmin } from "@/lib/db/admin";
import crypto from "node:crypto";

export const metadata: Metadata = { title: "Schedule your interview", robots: { index: false, follow: false } };

function hashSchedulingToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const details = await validateSchedulingToken(token);
  
  if (!details) {
    const db = createDatabaseAdmin();
    const { data: linkData } = await db.from("scheduling_links")
      .select("used_at, interview_scheduling_requests(status)")
      .eq("token_hash", hashSchedulingToken(token))
      .maybeSingle();
      
    let isScheduled = false;
    if (linkData) {
      const reqs = linkData.interview_scheduling_requests as any;
      const requestStatus = Array.isArray(reqs) ? reqs[0]?.status : reqs?.status;
      if (linkData.used_at || requestStatus === "SCHEDULED") {
        isScheduled = true;
      }
    }
    
    if (isScheduled) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5 text-center">
          <section>
            <h1 className="text-4xl font-semibold tracking-[-.07em]">Interview already scheduled!</h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#777772]">
              You have already successfully scheduled this interview. Please check your email for the calendar invitation and meeting details.
            </p>
          </section>
        </main>
      );
    }
    
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5 text-center">
        <section>
          <h1 className="text-4xl font-semibold tracking-[-.07em]">This scheduling link is invalid or no longer available.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#777772]">
            Please contact the recruitment team for a new scheduling link.
          </p>
        </section>
      </main>
    );
  }
  
  return <CandidateScheduler token={token} details={{ candidate: { name: details.candidateName }, interview: { round: details.roundName, durationMinutes: details.durationMinutes, position: details.jobTitle }, availableFrom: details.availableFrom, availableUntil: details.availableUntil, expiresAt: details.expiresAt }} />;
}
