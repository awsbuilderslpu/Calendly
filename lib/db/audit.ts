import { createDatabaseAdmin } from "@/lib/db/admin";

export async function writeAudit(actor: string, action: string, resource: string, resourceId: string) {
  await createDatabaseAdmin().from("audit_logs").insert({ actor, action, resource, resource_id: resourceId });
}
