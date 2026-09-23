import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { addPanelMember } from "@/lib/db/panels";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRecruiterOrAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: auth.status });
  try {
    const body = await request.json();
    if (typeof body.userId !== "string" || !body.userId.trim()) return NextResponse.json({ error: "userId is required." }, { status: 400 });
    await addPanelMember((await context.params).id, body.userId, auth.user.email);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add panel member." }, { status: 400 });
  }
}
