import Link from "next/link";
import { Suspense } from "react";
import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listInterviews } from "@/lib/db/interviews";
import { getCandidateStatuses } from "@/lib/integrations/google-sheets/service";

async function InterviewsData() {
  const [interviews, statusesMap] = await Promise.all([
    listInterviews(),
    getCandidateStatuses()
  ]);

  return (
    <div className="mt-8 overflow-x-auto border border-[#deded9] bg-white">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b border-[#deded9] text-[10px] uppercase tracking-[.15em] text-[#999994]">
          <tr>
            <th className="px-5 py-4">Candidate</th>
            <th className="px-5 py-4">Job</th>
            <th className="px-5 py-4">Date/time</th>
            <th className="px-5 py-4">Decision</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#deded9]">
          {interviews.map((interview) => {
            const decision = (interview.applicationId && statusesMap.get(interview.applicationId)) || "Pending";
            let decisionColor = "text-[#888883]";
            if (decision.toLowerCase().includes("select") || decision.toLowerCase().includes("hire")) decisionColor = "text-green-600 font-semibold";
            if (decision.toLowerCase().includes("reject") || decision.toLowerCase().includes("no")) decisionColor = "text-red-600 font-semibold";

            return (
              <tr key={interview.id} className="text-sm">
                <td className="px-5 py-5">
                  <Link href={`/interviews/${interview.id}`} className="font-semibold hover:text-[#f48120]">{interview.candidateName}</Link>
                  <p className="mt-1 text-xs text-[#888883]">{interview.candidateEmail}</p>
                </td>
                <td className="px-5 py-5">
                  <p>{interview.jobTitle}</p>
                  <p className="mt-1 text-xs text-[#888883]">{interview.roundName}</p>
                </td>
                <td className="px-5 py-5">
                  {new Date(interview.startsAt).toLocaleString("en-IN", { timeZone: interview.timezone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} {(interview.timezone || "Asia/Kolkata") === "Asia/Kolkata" ? "IST" : (interview.timezone || "IST")}
                </td>
                <td className={`px-5 py-5 ${decisionColor}`}>
                  {decision}
                </td>
                <td className="px-5 py-5 text-xs">
                  {interview.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function InterviewsPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Interviews</h1><p className="mt-4 text-sm text-[#777772]">Recruiter access required.</p></main></>;
  
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <div className="border-b border-[#deded9] pb-8">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#f48120]">Operations / Interviews</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">Booked interviews.</h1>
        </div>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 text-[#9b9b96]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#deded9] border-t-black mb-4"></div>
            <p className="text-sm font-medium tracking-wide">Loading interviews & sheets data...</p>
          </div>
        }>
          <InterviewsData />
        </Suspense>
      </main>
    </>
  );
}
