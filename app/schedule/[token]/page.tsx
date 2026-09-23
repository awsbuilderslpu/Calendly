import type { Metadata } from "next";
import CandidateScheduler from "@/components/scheduling/candidate-scheduler";
import { validateSchedulingToken } from "@/lib/db/scheduling-links";

export const metadata: Metadata = { title: "Schedule your interview", robots: { index: false, follow: false } };

export default async function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const details = await validateSchedulingToken((await params).token);
  if (!details) return <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5 text-center"><section><h1 className="text-4xl font-semibold tracking-[-.07em]">This scheduling link is invalid or no longer available.</h1><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#777772]">Please contact the recruitment team for a new scheduling link.</p></section></main>;
  return <CandidateScheduler token={(await params).token} details={{ candidate: { name: details.candidateName }, interview: { round: details.roundName, durationMinutes: details.durationMinutes, position: details.jobTitle }, availableFrom: details.availableFrom, availableUntil: details.availableUntil, expiresAt: details.expiresAt }} />;
}
