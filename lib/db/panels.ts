import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";
import { mapPanel, type Panel } from "@/types/panel";

async function membersFor(panelId: string) {
  const database = createDatabaseAdmin();
  const { data: memberships, error } = await database.from("panel_members").select("user_id").eq("panel_id", panelId);
  if (error) throw new Error("Unable to load panel members");
  const ids = (memberships ?? []).map((row) => String(row.user_id));
  if (!ids.length) return [];
  const { data: users, error: usersError } = await database.from("profiles").select("id, full_name, email").in("id", ids);
  if (usersError) throw new Error("Unable to load panel users");
  return (users ?? []).map((user) => ({ id: String(user.id), name: String(user.full_name), email: String(user.email) }));
}

export async function listPanels(): Promise<Panel[]> {
  const { data, error } = await createDatabaseAdmin().from("panels").select("*").order("created_at");
  if (error) throw new Error("Unable to load panels");
  return Promise.all((data ?? []).map(async (row) => mapPanel(row, await membersFor(String(row.id)))));
}

export async function listPanelsForUser(userId: string): Promise<Panel[]> {
  const database = createDatabaseAdmin();
  const { data: memberships, error: membershipError } = await database.from("panel_members").select("panel_id").eq("user_id", userId);
  if (membershipError) throw new Error("Unable to load panel memberships");
  const ids = (memberships ?? []).map((row) => String(row.panel_id));
  if (!ids.length) return [];
  const { data, error } = await database.from("panels").select("*").in("id", ids).order("created_at");
  if (error) throw new Error("Unable to load panels");
  return Promise.all((data ?? []).map(async (row) => mapPanel(row, await membersFor(String(row.id)))));
}

export async function getPanel(id: string) {
  const { data, error } = await createDatabaseAdmin().from("panels").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load panel");
  return data ? mapPanel(data, await membersFor(id)) : null;
}

export async function getPanelSchedulingData(id: string) {
  const panel = await getPanel(id);
  if (!panel) return null;
  const database = createDatabaseAdmin();
  const memberIds = panel.members.map((member) => member.id);
  if (!memberIds.length) return { panel, members: [] };
  const [{ data: rules, error: rulesError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
    database.from("availability_rules").select("*").in("user_id", memberIds).eq("is_active", true),
    database.from("availability_exceptions").select("*").in("user_id", memberIds),
  ]);
  if (rulesError || exceptionsError) throw new Error("Unable to load panel availability");
  return {
    panel,
    members: panel.members.map((member) => ({
      ...member,
      rules: (rules ?? []).filter((rule) => String(rule.user_id) === member.id).map((rule) => ({ dayOfWeek: Number(rule.day_of_week), startTime: String(rule.start_time).slice(0, 5), endTime: String(rule.end_time).slice(0, 5), timezone: String(rule.timezone), isActive: Boolean(rule.is_active) })),
      exceptions: (exceptions ?? []).filter((exception) => String(exception.user_id) === member.id).map((exception) => ({ date: String(exception.date), startTime: String(exception.start_time).slice(0, 5), endTime: String(exception.end_time).slice(0, 5), isAvailable: Boolean(exception.is_available) })),
    })),
  };
}

export async function createPanel(input: { name: string; description?: string; requiredInterviewers: number }, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("panels").insert({ name: input.name.trim(), description: input.description?.trim() || null, required_interviewers: input.requiredInterviewers }).select("*").single();
  if (error || !data) throw new Error("Unable to create panel");
  await writeAudit(actor, "PANEL_CREATED", "panel", data.id);
  return mapPanel(data);
}

export async function updatePanel(id: string, input: { name?: string; description?: string; requiredInterviewers?: number }, actor: string) {
  const update = { ...(input.name === undefined ? {} : { name: input.name.trim() }), ...(input.description === undefined ? {} : { description: input.description.trim() || null }), ...(input.requiredInterviewers === undefined ? {} : { required_interviewers: input.requiredInterviewers }), updated_at: new Date().toISOString() };
  const { data, error } = await createDatabaseAdmin().from("panels").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Unable to update panel");
  if (!data) return null;
  await writeAudit(actor, "PANEL_UPDATED", "panel", id);
  return mapPanel(data, await membersFor(id));
}

export async function deletePanel(id: string, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("panels").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error("Unable to delete panel");
  if (!data) return false;
  await writeAudit(actor, "PANEL_DELETED", "panel", id);
  return true;
}

export async function addPanelMember(panelId: string, userId: string, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("panel_members").insert({ panel_id: panelId, user_id: userId }).select("id").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "User is already a panel member" : "Unable to add panel member");
  await writeAudit(actor, "PANEL_MEMBER_ADDED", "panel", panelId);
}

export async function removePanelMember(panelId: string, userId: string, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("panel_members").delete().eq("panel_id", panelId).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw new Error("Unable to remove panel member");
  if (!data) return false;
  await writeAudit(actor, "PANEL_MEMBER_REMOVED", "panel", panelId);
  return true;
}
