import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-3xl px-5 py-20">
          <h1 className="text-4xl font-semibold">Unauthorized</h1>
        </main>
      </>
    );
  }

  const database = createDatabaseAdmin();
  
  // Dashboard Metrics (Last 30 days)
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

  // Upcoming Interviews
  const { data: upcoming } = await database
    .from("interviews")
    .select("id, candidate_name, job_title, round_name, starts_at, status")
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
                {upcoming.map((u: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                  <li key={u.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{u.candidate_name}</p>
                      <p className="text-sm text-gray-500">{u.job_title} • {u.round_name}</p>
                      <p className="text-sm text-gray-400">{new Date(u.starts_at).toLocaleString()}</p>
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
