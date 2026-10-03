import Link from "next/link";
import AppNav from "@/components/layout/app-nav";
import CalendarSyncButton from "@/components/interviews/calendar-sync-button";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterview } from "@/lib/db/interviews";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { NotificationList } from "@/components/NotificationList";
import { InterviewActions } from "@/components/interviews/interview-actions";
import { InterviewTimeline } from "@/components/interviews/interview-timeline";
import { getAllFeedbackForInterview } from "@/lib/db/feedback";
import DecisionActions from "@/components/interviews/decision-actions";
import { getCandidateStatuses } from "@/lib/integrations/google-sheets/service";

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Interview</h1><p className="mt-4 text-sm text-[#777772]">Recruiter access required.</p></main></>;
  
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Interview not found</h1></main></>;
  
  const database = createDatabaseAdmin();
  const { data: notifications } = await database
    .from("notifications")
    .select("id, recipient_email, type, status, scheduled_for, sent_at, attempt_count, last_error, interview_id")
    .eq("interview_id", id)
    .order("created_at", { ascending: false });

  const { data: events } = await database
    .from("interview_events")
    .select("*")
    .eq("interview_id", id)
    .order("created_at", { ascending: false });

  const feedback = await getAllFeedbackForInterview(id);
  const statuses = await getCandidateStatuses();
  const currentDecision = interview.applicationId ? statuses.get(interview.applicationId) || "Pending" : "Pending";

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        <Link href="/interviews" className="text-xs text-[#888883] hover:text-[#f48120]">← All interviews</Link>
        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-5xl font-semibold tracking-[-.08em]">{interview.candidateName}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${interview.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {interview.status}
          </span>
        </div>
        
        <InterviewActions interviewId={id} status={interview.status} />
        <DecisionActions interviewId={id} currentDecision={currentDecision} />

        <div className="mt-8 grid border border-[#deded9] bg-white sm:grid-cols-2">
          {[
            ["Email", interview.candidateEmail], 
            ["Job", interview.jobTitle], 
            ["Round", interview.roundName], 
            ["Date/time", new Date(interview.startsAt).toLocaleString("en-IN", { timeZone: interview.timezone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " " + ((interview.timezone || "Asia/Kolkata") === "Asia/Kolkata" ? "IST" : (interview.timezone || "IST"))], 
            ["Timezone", interview.timezone], 
            ["Duration", `${interview.durationMinutes} minutes`], 
            ["Assigned interviewers", interview.interviewers.map((person) => person.name).join(", ")]
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[#deded9] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[.15em] text-[#999994]">{label}</p>
              <p className="mt-3 text-sm font-medium">{value || "None"}</p>
            </div>
          ))}
        </div>
        
        {feedback && feedback.length > 0 && (
          <section className="mt-8 border border-[#deded9] bg-white p-6">
            <h2 className="text-2xl font-semibold mb-4">Interviewer Feedback</h2>
            <div className="space-y-6">
              {feedback.map((f: any) => (
                <div key={f.id} className="border-b border-[#deded9] pb-6 last:border-0">
                  <p className="font-semibold">{f.profiles?.name || "Unknown"} <span className="text-sm font-normal text-gray-500">({f.status})</span></p>
                  <p className="mt-2 text-sm"><strong>Recommendation:</strong> {f.recommendation || "N/A"}</p>
                  {f.strengths && <p className="mt-2 text-sm"><strong>Strengths:</strong> {f.strengths}</p>}
                  {f.concerns && <p className="mt-2 text-sm"><strong>Concerns:</strong> {f.concerns}</p>}
                  {f.comments && <p className="mt-2 text-sm"><strong>Comments:</strong> {f.comments}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <section className="border border-[#deded9] bg-white p-6">
              <p className="text-[10px] uppercase tracking-[.15em] text-[#999994]">Google Calendar</p>
              <p className="mt-3 text-lg font-semibold">{interview.calendarSyncStatus ?? "PENDING"}</p>
              {interview.googleMeetUrl && <a href={interview.googleMeetUrl} className="mt-4 inline-block text-sm text-[#f48120]">Join Google Meet →</a>}
              {interview.calendarSyncStatus !== "SYNCED" && <CalendarSyncButton id={interview.id} />}
            </section>
            <InterviewTimeline events={events || []} />
          </div>
          <div>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
              <NotificationList notifications={notifications || []} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
