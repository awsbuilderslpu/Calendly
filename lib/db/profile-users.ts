import { createDatabaseAdmin } from "@/lib/db/admin";
import { normalizeRole } from "@/types/user";

export async function listAdminProfiles() {
  const database = createDatabaseAdmin();
  const { data: profiles, error: profilesError } = await database
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("role", "admin")
    .order("full_name");

  if (profilesError) throw new Error("Unable to load SSO admin profiles");
  return (profiles ?? []).map((profile) => ({
    id: String(profile.id),
    name: typeof profile.full_name === "string" ? profile.full_name : "AWS LPU Admin",
    email: typeof profile.email === "string" ? profile.email : "",
    role: normalizeRole(String(profile.role)),
  }));
}
