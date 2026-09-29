import { createDatabaseAdmin } from "@/lib/db/admin";
import { normalizeRole, type AppUser, type SsoUser } from "@/types/user";

function toAppUser(row: Record<string, unknown>, fallback: SsoUser): AppUser {
  return {
    id: String(row.id),
    ssoUserId: String(row.id),
    name: typeof row.full_name === "string" && row.full_name ? row.full_name : fallback.name,
    email: String(row.email ?? fallback.email),
    picture: typeof row.avatar_url === "string" ? row.avatar_url : fallback.picture ?? null,
    role: normalizeRole(typeof row.role === "string" ? row.role : fallback.role),
  };
}

export async function getProvisionedProfile(ssoUser: SsoUser): Promise<AppUser> {
  const db = createDatabaseAdmin();
  let { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", ssoUser.sub)
    .maybeSingle();

  if (error) throw new Error("Unable to read the SSO profile");
  
  if (!data) {
    const { data: newData, error: insertError } = await db
      .from("profiles")
      .insert({
        id: ssoUser.sub,
        email: ssoUser.email,
        full_name: ssoUser.name,
        avatar_url: ssoUser.picture || null,
        role: "CANDIDATE"
      })
      .select("id, full_name, email, avatar_url, role")
      .single();
      
    if (insertError) throw new Error("Unable to provision SSO profile: " + insertError.message);
    data = newData;
  }
  
  return toAppUser(data, ssoUser);
}
