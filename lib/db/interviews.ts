import { createDatabaseAdmin } from "@/lib/db/admin";
import { mapInterview, type Interview } from "@/types/interview";

async function withMembers(row: Record<string, unknown>): Promise<Interview> {
  const database = createDatabaseAdmin();
  const { data, error } = await database.from("interview_panel_members").select("user_id, profiles(id, full_name, email)").eq("interview_id", String(row.id));
  if (error) throw new Error("Unable to load interview members");
  const members = (data ?? []).map((item) => {
    const user = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    return { id: String(user?.id), name: String(user?.full_name), email: String(user?.email) };
  });
  return mapInterview(row, members);
}

export async function listInterviews() {
  const { data, error } = await createDatabaseAdmin().from("interviews").select("*, interview_scheduling_requests(application_id)").order("starts_at", { ascending: true });
  if (error) throw new Error("Unable to load interviews");
  return Promise.all((data ?? []).map(withMembers));
}

export async function getInterview(id: string) {
  const { data, error } = await createDatabaseAdmin().from("interviews").select("*, interview_scheduling_requests(application_id)").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load interview");
  return data ? withMembers(data) : null;
}
