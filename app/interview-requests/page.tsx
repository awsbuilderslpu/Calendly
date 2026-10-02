import { Suspense } from "react";
import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listInterviewRequests } from "@/lib/db/interview-requests";
import { createDatabaseAdmin } from "@/lib/db/admin";
import InterviewRequestsTable from "@/components/interview-requests/interview-requests-table";

async function RequestsData() {
  // Fetch these in parallel for maximum speed
  const [requests, panelsData] = await Promise.all([
    listInterviewRequests(),
    createDatabaseAdmin().from("panels").select("id, name").order("name")
  ]);

  const panels = panelsData.data || [];
  return <InterviewRequestsTable requests={requests} panels={panels} />;
}

export default async function InterviewRequestsPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><h1 className="text-4xl font-semibold tracking-[-.07em]">Interview requests</h1><p className="mt-5 text-sm text-[#777772]">This administrative view is available to recruiters and admins only.</p></main></>;
  
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="flex flex-col justify-between gap-5 border-b border-[#deded9] pb-8 sm:flex-row sm:items-end mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Operations / Requests</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">Interview requests.</h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#777772]">
            Requests arrive from the Recruitment Portal. You can select multiple requests to assign a panel and generate scheduling links in bulk.
          </p>
        </div>
        
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 text-[#9b9b96]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#deded9] border-t-black mb-4"></div>
            <p className="text-sm font-medium tracking-wide">Loading candidates...</p>
          </div>
        }>
          <RequestsData />
        </Suspense>
        
      </main>
    </>
  );
}
