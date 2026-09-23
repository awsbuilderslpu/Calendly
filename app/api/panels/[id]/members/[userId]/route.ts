import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { removePanelMember } from "@/lib/db/panels";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  const auth = await getRecruiterOrAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: auth.status });
  const { id, userId } = await context.params;
  const removed = await removePanelMember(id, userId, auth.user.email);
  return removed ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Panel member not found." }, { status: 404 });
}
