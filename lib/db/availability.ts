import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";
import { mapException, mapRule, type AvailabilityExceptionRecord, type AvailabilityRuleRecord } from "@/types/availability";

export async function listRules(userId: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_rules").select("*").eq("user_id", userId).order("day_of_week").order("start_time");
  if (error) throw new Error("Unable to load availability rules");
  return (data ?? []).map(mapRule);
}

export async function listExceptions(userId: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_exceptions").select("*").eq("user_id", userId).order("date").order("start_time");
  if (error) throw new Error("Unable to load availability exceptions");
  return (data ?? []).map(mapException);
}

export async function createRule(userId: string, input: Omit<AvailabilityRuleRecord, "id" | "userId" | "isActive"> & { isActive?: boolean }, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_rules").insert({ user_id: userId, day_of_week: input.dayOfWeek, start_time: input.startTime, end_time: input.endTime, timezone: input.timezone, is_active: input.isActive ?? true }).select("*").single();
  if (error || !data) throw new Error("Unable to create availability rule");
  await writeAudit(actor, "AVAILABILITY_CREATED", "availability_rule", data.id);
  return mapRule(data);
}

export async function updateRule(id: string, userId: string, input: Partial<Omit<AvailabilityRuleRecord, "id" | "userId">>, actor: string) {
  const update = { ...(input.dayOfWeek === undefined ? {} : { day_of_week: input.dayOfWeek }), ...(input.startTime === undefined ? {} : { start_time: input.startTime }), ...(input.endTime === undefined ? {} : { end_time: input.endTime }), ...(input.timezone === undefined ? {} : { timezone: input.timezone }), ...(input.isActive === undefined ? {} : { is_active: input.isActive }), updated_at: new Date().toISOString() };
  const { data, error } = await createDatabaseAdmin().from("availability_rules").update(update).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
  if (error) throw new Error("Unable to update availability rule");
  if (!data) return null;
  await writeAudit(actor, "AVAILABILITY_UPDATED", "availability_rule", id);
  return mapRule(data);
}

export async function deleteRule(id: string, userId: string, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_rules").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw new Error("Unable to delete availability rule");
  if (!data) return false;
  await writeAudit(actor, "AVAILABILITY_DELETED", "availability_rule", id);
  return true;
}

export async function createException(userId: string, input: Omit<AvailabilityExceptionRecord, "id" | "userId">, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_exceptions").insert({ user_id: userId, date: input.date, start_time: input.startTime, end_time: input.endTime, is_available: input.isAvailable, reason: input.reason }).select("*").single();
  if (error || !data) throw new Error("Unable to create availability exception");
  await writeAudit(actor, "AVAILABILITY_EXCEPTION_CREATED", "availability_exception", data.id);
  return mapException(data);
}

export async function deleteException(id: string, userId: string, actor: string) {
  const { data, error } = await createDatabaseAdmin().from("availability_exceptions").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw new Error("Unable to delete availability exception");
  if (!data) return false;
  await writeAudit(actor, "AVAILABILITY_EXCEPTION_DELETED", "availability_exception", id);
  return true;
}
