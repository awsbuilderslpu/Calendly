import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { openInterviewRequest } from "@/lib/integrations/recruitment";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  const { id } = await context.params;
  try {
    const result = await openInterviewRequest(id, access.user.email);
    if (result.kind === "missing") return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
    if (result.kind === "invalid_transition") return NextResponse.json({ error: `Cannot open a request in ${result.status} status.` }, { status: 409 });
    return NextResponse.json({ success: true, data: result.request });
  } catch {
    return NextResponse.json({ error: "Unable to open interview request." }, { status: 500 });
  }
}