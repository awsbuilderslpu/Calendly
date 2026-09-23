import Link from "next/link";
import { notFound } from "next/navigation";
import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterviewRequest } from "@/lib/db/interview-requests";
import OpenRequestButton from "@/components/interview-requests/open-request-button";
import SchedulingLinkManager from "@/components/interview-requests/scheduling-link-manager";

export default async function InterviewRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) notFound();
  const request = await getInterviewRequest((await params).id);
  if (!request) notFound();
  return <><AppNav /><main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 lg:py-16"><Link href="/interview-requests" className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#8b8b86] hover:text-[#f48120]">← All requests</Link><div className="mt-8 border-b border-[#deded9] pb-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Interview request</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">{request.candidateName}</h1><p className="mt-4 text-sm text-[#777772]">{request.roundName} · {request.jobTitle}</p></div><section className="mt-8 grid border border-[#deded9] bg-white sm:grid-cols-2">{[["Email", request.candidateEmail], ["Application", request.applicationId], ["Candidate ID", request.candidateId], ["Position", request.jobTitle], ["Round", request.roundName], ["Duration", `${request.durationMinutes} minutes`], ["Status", request.status], ["Created", new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })]].map(([label, value]) => <div key={label} className="border-b border-[#deded9] px-5 py-5 last:border-b-0 sm:nth-[odd]:border-r"><p className="text-[10px] uppercase tracking-[.16em] text-[#9b9b96]">{label}</p><p className="mt-3 break-all text-sm font-medium">{value}</p></div>)}</section><section className="mt-8 border border-[#deded9] bg-[#151515] p-6 text-white sm:p-8"><p className="text-[10px] uppercase tracking-[.18em] text-[#f48120]">Scheduling</p><p className="mt-4 text-2xl font-semibold tracking-[-.05em]">Availability and scheduling is ready for candidate access.</p><p className="mt-4 max-w-xl text-sm leading-6 text-[#aaa9a4]">The candidate can select a time through a secure link. Selection is not a reservation; booking arrives in the next phase.</p>{request.status === "PENDING" && <OpenRequestButton id={request.id} />}{request.status === "OPEN" && <SchedulingLinkManager requestId={request.id} status={request.status} />}</section></main></>;
}
