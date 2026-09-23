export const USER_ROLES = [
  "ADMIN",
  "RECRUITER",
  "INTERVIEWER",
  "CANDIDATE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type SsoUser = {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  role?: string;
};

export type AppUser = {
  id: string;
  ssoUserId: string;
  name: string;
  email: string;
  picture: string | null;
  role: UserRole;
};

export function normalizeRole(role: string | undefined): UserRole {
  const normalized = role?.trim().toUpperCase();

  return USER_ROLES.includes(normalized as UserRole)
    ? (normalized as UserRole)
    : "CANDIDATE";
}

export function mapSsoRole(role: string | undefined): UserRole {
  const configured = process.env.CALENDLY_ROLE_MAP;
  if (!configured) return "CANDIDATE";

  try {
    const mapping = JSON.parse(configured) as Record<string, string>;
    return normalizeRole(mapping[role?.toLowerCase() ?? ""]);
  } catch {
    return "CANDIDATE";
  }
}
