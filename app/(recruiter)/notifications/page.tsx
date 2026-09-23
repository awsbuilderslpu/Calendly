import { createDatabaseAdmin } from "@/lib/db/admin";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/NotificationList";
import AppNav from "@/components/layout/app-nav";

export default async function NotificationsPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) redirect("/auth/login");

  const database = createDatabaseAdmin();
  const { data: notifications } = await database
    .from("notifications")
    .select("id, recipient_email, type, status, scheduled_for, sent_at, attempt_count, last_error, interview_id")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <AppNav />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
        </div>
        <NotificationList notifications={notifications || []} />
      </main>
    </div>
  );
}
