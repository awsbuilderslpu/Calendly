import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { revokeSchedulingLinks } from "@/lib/db/scheduling-links";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  try {
    await revokeSchedulingLinks((await context.params).id, access.user.email);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to revoke scheduling links." }, { status: 500 });
  }
}
