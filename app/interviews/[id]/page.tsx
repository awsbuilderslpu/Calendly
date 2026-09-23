import Link from "next/link";
import AppNav from "@/components/layout/app-nav";
import CalendarSyncButton from "@/components/interviews/calendar-sync-button";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterview } from "@/lib/db/interviews";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { NotificationList } from "@/components/NotificationList";
import { InterviewActions } from "@/components/interviews/interview-actions";
import { InterviewTimeline } from "@/components/interviews/interview-timeline";

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

        <div className="mt-8 grid border border-[#deded9] bg-white sm:grid-cols-2">
          {[
            ["Email", interview.candidateEmail], 
            ["Job", interview.jobTitle], 
            ["Round", interview.roundName], 
            ["Date/time", new Date(interview.startsAt).toLocaleString()], 
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <section className="mt-8 border border-[#deded9] bg-white p-6">
              <p className="text-[10px] uppercase tracking-[.15em] text-[#999994]">Google Calendar</p>
              <p className="mt-3 text-lg font-semibold">{interview.calendarSyncStatus ?? "PENDING"}</p>
              {interview.googleMeetUrl && <a href={interview.googleMeetUrl} className="mt-4 inline-block text-sm text-[#f48120]">Join Google Meet →</a>}
              {interview.calendarSyncStatus !== "SYNCED" && <CalendarSyncButton id={interview.id} />}
            </section>
            <InterviewTimeline events={events || []} />
          </div>
          <div>
            <section className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
              <NotificationList notifications={notifications || []} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
