import { createDatabaseAdmin } from "@/lib/db/admin";
import { verifyManagementToken } from "@/lib/booking/action-tokens";
import { ManageInterviewClient } from "./client";

export default async function ManageInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const interviewId = await verifyManagementToken(token);
  
  if (!interviewId) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Link Unavailable</h1>
        <p className="mt-4 text-gray-600">This interview management link is no longer available.</p>
      </main>
    );
  }

  const database = createDatabaseAdmin();
  const { data: interview } = await database
    .from("interviews")
    .select("id, status, job_title, round_name, starts_at, ends_at, timezone, google_meet_url, scheduling_request_id")
    .eq("id", interviewId)
    .single();

  if (!interview) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Interview Not Found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <ManageInterviewClient interview={interview} token={token} />
    </main>
  );
}
