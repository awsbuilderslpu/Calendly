import { NextResponse } from "next/server";
import { getCurrentUser, getRecruiterOrAdmin } from "@/lib/auth/server";
import { createPanel, listPanels, listPanelsForUser } from "@/lib/db/panels";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const panels = user.role === "ADMIN" || user.role === "RECRUITER" ? await listPanels() : await listPanelsForUser(user.id);
  return NextResponse.json({ panels });
}

export async function POST(request: Request) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  try {
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 200 || typeof body.requiredInterviewers !== "number" || !Number.isInteger(body.requiredInterviewers) || body.requiredInterviewers < 1 || body.requiredInterviewers > 50) return NextResponse.json({ error: "Invalid panel." }, { status: 400 });
    const panel = await createPanel(body, access.user.email);
    return NextResponse.json({ panel }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create panel." }, { status: 400 });
  }
}
