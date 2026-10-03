import AppNav from "@/components/layout/app-nav";
import { getCurrentUser, getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import Link from "next/link";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const database = createDatabaseAdmin();

  // -------------------------------------------------------------
  // CANDIDATE DASHBOARD
  // -------------------------------------------------------------
  if (user.role === "CANDIDATE" || false) {
    const { data: rawRequests } = await database
      .from("interview_scheduling_requests")
      .select("id, job_title, round_name, status, scheduling_links(token_hash, expires_at, revoked_at, used_at)")
      .eq("candidate_email", user.email)
      .order("created_at", { ascending: false });
    
    const requests = (rawRequests || []).filter(r => {
      const links = Array.isArray(r.scheduling_links) ? r.scheduling_links : [r.scheduling_links];
      const isUsed = links.some(l => l && l.used_at);
      return r.status !== "SCHEDULED" && !isUsed;
    });

    const { data: upcoming } = await database
      .from("interviews")
      .select("id, job_title, round_name, starts_at, status, timezone, google_meet_url, calendar_integrations(meeting_url)")
      .eq("candidate_email", user.email)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    return (
      <>
        <AppNav />
        <main className="mx-auto w-full max-w-5xl px-5 py-12">
          <h1 className="text-3xl font-semibold mb-8">Candidate Dashboard</h1>
          
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Pending Interview Requests</h2>
            {requests && requests.length > 0 ? (
              <ul className="border rounded bg-white divide-y">
                {requests.map((r: any) => {
                  const links = Array.isArray(r.scheduling_links) ? r.scheduling_links : [r.scheduling_links];
                  const activeLink = links.find((l: any) => l && !l.revoked_at && !l.used_at && new Date(l.expires_at) > new Date());
                  
                  return (
                    <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <p className="font-medium">{r.job_title}</p>
                        <p className="text-sm text-gray-500">{r.round_name}</p>
                        <p className="text-sm text-gray-400 mt-1">Status: {r.status}</p>
                      </div>
                      <div>
                        {r.status === "OPEN" ? (
                          <a href={`/api/candidate/self-serve/${r.id}`} className="px-4 py-2 bg-[#f48120] text-black text-sm font-semibold hover:bg-orange-500 rounded-sm">
                            Schedule Now
                          </a>
                        ) : r.status === "PENDING" ? (
                          <span className="text-sm text-gray-400 italic">Pending panel assignment...</span>
                        ) : (
                          <span className="text-sm text-gray-400">{r.status}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
                You have no pending interview requests.
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Upcoming Interviews</h2>
            {upcoming && upcoming.length > 0 ? (
              <ul className="border rounded bg-white divide-y">
                {upcoming.map((u: any) => {
                  const meets = Array.isArray(u.calendar_integrations) ? u.calendar_integrations : [u.calendar_integrations];
                  const meetingUrl = u.google_meet_url || meets.find((m: any) => m?.meeting_url)?.meeting_url;
                  
                  return (
                    <li key={u.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <p className="font-medium">{u.job_title} • {u.round_name}</p>
                        <p className="text-sm text-gray-600 mt-1">{new Date(u.starts_at).toLocaleString("en-IN", { timeZone: u.timezone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} {u.timezone || "Asia/Kolkata"}</p>
                        <p className="text-sm text-gray-400">Status: {u.status}</p>
                      </div>
                      <div>
                        {meetingUrl ? (
                          <a href={meetingUrl} target="_blank" rel="noreferrer" className="px-4 py-2 border border-gray-300 text-sm hover:border-black rounded-sm">
                            Join Meeting
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Meeting link pending...</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
                No upcoming interviews scheduled.
              </div>
            )}
          </section>
        </main>
      </>
    );
  }

  // -------------------------------------------------------------
  // RECRUITER / ADMIN DASHBOARD
  // -------------------------------------------------------------
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const { data: metricsData } = await database.rpc("get_recruiter_dashboard_metrics", {
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString()
  });

  const metrics = metricsData || {
    scheduled: 0, upcoming: 0, completed: 0, cancelled: 0, rescheduled: 0,
    feedback: { pending: 0, submitted: 0 }, calendar: { synced: 0, failed: 0, pending: 0 }
  };

  const { data: upcoming } = await database
    .from("interviews")
    .select("id, candidate_name, job_title, round_name, starts_at, status, timezone")
    .eq("status", "SCHEDULED")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Recruiter Dashboard</h1>
          <Link href="/api/interviews/export" className="px-4 py-2 bg-black text-white rounded-md text-sm">
            Export CSV
          </Link>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Scheduled</p>
            <p className="text-2xl font-bold">{metrics.scheduled}</p>
          </div>
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-2xl font-bold">{metrics.upcoming}</p>
          </div>
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold">{metrics.completed}</p>
          </div>
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Cancelled</p>
            <p className="text-2xl font-bold">{metrics.cancelled}</p>
          </div>
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Rescheduled</p>
            <p className="text-2xl font-bold">{metrics.rescheduled}</p>
          </div>
          <div className="p-4 border rounded shadow-sm bg-white">
            <p className="text-sm text-gray-500">Pending Feedback</p>
            <p className="text-2xl font-bold">{metrics.feedback.pending}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-medium mb-4">Upcoming Interviews</h2>
            {upcoming && upcoming.length > 0 ? (
              <ul className="border rounded bg-white divide-y">
                {upcoming.map((u: any) => (
                  <li key={u.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{u.candidate_name}</p>
                      <p className="text-sm text-gray-500">{u.job_title} • {u.round_name}</p>
                      <p className="text-sm text-gray-400">{new Date(u.starts_at).toLocaleString("en-IN", { timeZone: u.timezone || "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} {u.timezone || "Asia/Kolkata"}</p>
                    </div>
                    <Link href={`/interviews/${u.id}`} className="text-sm text-blue-600 hover:underline">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 border rounded bg-gray-50 text-center text-gray-500">
                No upcoming interviews
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-medium mb-4">System Health</h2>
            <div className="border rounded bg-white p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Calendar Sync</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Synced: {metrics.calendar.synced}</span>
                  <span className="text-yellow-600">Pending: {metrics.calendar.pending}</span>
                  <span className="text-red-600">Failed: {metrics.calendar.failed}</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Feedback Completion</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Submitted: {metrics.feedback.submitted}</span>
                  <span className="text-yellow-600">Pending: {metrics.feedback.pending}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
