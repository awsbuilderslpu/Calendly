import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listAdminProfiles } from "@/lib/db/profile-users";

export async function GET() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  try {
    return NextResponse.json({ users: await listAdminProfiles() });
  } catch {
    return NextResponse.json({ error: "Unable to load SSO admin profiles." }, { status: 500 });
  }
}
