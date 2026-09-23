import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { deletePanel, getPanel, updatePanel } from "@/lib/db/panels";

async function access() {
  return getRecruiterOrAdmin();
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await access();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: auth.status });
  const panel = await getPanel((await context.params).id);
  return panel ? NextResponse.json({ panel }) : NextResponse.json({ error: "Panel not found." }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await access();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: auth.status });
  try {
    const body = await request.json();
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) return NextResponse.json({ error: "Invalid panel name." }, { status: 400 });
    if (body.requiredInterviewers !== undefined && (!Number.isInteger(body.requiredInterviewers) || body.requiredInterviewers < 1 || body.requiredInterviewers > 50)) return NextResponse.json({ error: "Invalid required interviewer count." }, { status: 400 });
    const panel = await updatePanel((await context.params).id, body, auth.user.email);
    return panel ? NextResponse.json({ panel }) : NextResponse.json({ error: "Panel not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Unable to update panel." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await access();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: auth.status });
  const deleted = await deletePanel((await context.params).id, auth.user.email);
  return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Panel not found." }, { status: 404 });
}
