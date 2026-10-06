import Link from "next/link";
import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listInterviews } from "@/lib/db/interviews";
import { createDatabaseAdmin } from "@/lib/db/admin";
import InterviewRowActions from "@/components/interviews/interview-row-actions";

export default async function InterviewsPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Interviews</h1><p className="mt-4 text-sm text-[#777772]">Recruiter access required.</p></main></>;
  const interviews = await listInterviews();
  const db = createDatabaseAdmin();
  const { data: feedbacks } = await db.from("interview_feedback").select("interview_id, recommendation");
  const feedbackMap = new Map();
  if (feedbacks) {
    feedbacks.forEach(f => {
      if (f.recommendation) feedbackMap.set(f.interview_id, f.recommendation);
    });
  }
  return <><AppNav /><main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8"><div className="border-b border-[#deded9] pb-8"><p className="text-[10px] uppercase tracking-[.2em] text-[#f48120]">Operations / Interviews</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">Booked interviews.</h1></div><div className="mt-8 overflow-x-auto border border-[#deded9] bg-white"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-[#deded9] text-[10px] uppercase tracking-[.15em] text-[#999994]"><tr><th className="px-5 py-4">Candidate</th><th className="px-5 py-4">Job</th><th className="px-5 py-4">Round</th><th className="px-5 py-4">Date/time</th><th className="px-5 py-4">Calendar</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-[#deded9]">{interviews.map((interview) => <tr key={interview.id} className="text-sm"><td className="px-5 py-5"><Link href={`/interviews/${interview.id}`} className="font-semibold hover:text-[#f48120]">{interview.candidateName}</Link><p className="mt-1 text-xs text-[#888883]">{interview.candidateEmail}</p></td><td className="px-5 py-5">{interview.jobTitle}</td><td className="px-5 py-5">{interview.roundName}</td><td className="px-5 py-5">{new Date(interview.startsAt).toLocaleString("en-IN", { timeZone: interview.timezone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} {(interview.timezone || "Asia/Kolkata") === "Asia/Kolkata" ? "IST" : (interview.timezone || "IST")}</td><td className="px-5 py-5 text-xs">{interview.calendarSyncStatus ?? "PENDING"}</td><td className="px-5 py-5"><InterviewRowActions interviewId={interview.id} initialStatus={interview.status} feedbackRecommendation={feedbackMap.get(interview.id)} /></td></tr>)}</tbody></table></div></main></>;
}
