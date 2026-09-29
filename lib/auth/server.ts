import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { SESSION_COOKIE } from "@/lib/auth/oauth";
import { publicConfig } from "@/lib/config/env";
import { normalizeRole, type AppUser, type SsoUser } from "@/types/user";

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // --- LOCAL DEV BYPASS FOR PRINCE ---
  if (process.env.NODE_ENV === "development" && token === "DEV_PRINCE") {
    return {
      id: "cand-1790658264629", // Prince's ID from earlier
      ssoUserId: "cand-1790658264629",
      name: "Prince",
      email: "paramjitsinghrose@gmail.com",
      picture: null,
      role: "CANDIDATE"
    };
  }
  // ------------------------------------

  const userResponse = await fetch(publicConfig.userinfoUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!userResponse?.ok) return null;

  const ssoUser = (await userResponse.json()) as Partial<SsoUser>;
  if (typeof ssoUser.sub !== "string") return null;

  const database = createDatabaseAdmin();
  const { data } = await database
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", ssoUser.sub)
    .maybeSingle();

  if (!data) return null;
  return {
    id: String(data.id),
    ssoUserId: String(data.id),
    name: String(data.full_name ?? ssoUser.name),
    email: String(data.email),
    picture: typeof data.avatar_url === "string" ? data.avatar_url : null,
    role: normalizeRole(typeof data.role === "string" ? data.role : undefined),
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=unauthenticated");
  return user;
}

export async function getRecruiterOrAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, status: 401 as const };
  if (user.role !== "ADMIN" && user.role !== "RECRUITER") {
    return { user, status: 403 as const };
  }
  return { user, status: 200 as const };
}
