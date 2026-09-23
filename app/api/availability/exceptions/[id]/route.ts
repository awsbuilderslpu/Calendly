import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteException } from "@/lib/db/availability";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role === "CANDIDATE") return NextResponse.json({ error: "Interviewer access required." }, { status: 403 });
  const deleted = await deleteException((await context.params).id, user.id, user.email);
  return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Availability exception not found." }, { status: 404 });
}
