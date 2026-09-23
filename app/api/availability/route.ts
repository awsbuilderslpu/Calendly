import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createRule, listRules } from "@/lib/db/availability";
import { isTimezone, validWindow } from "@/lib/scheduling/validation";

async function actor() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (user.role === "CANDIDATE") return { response: NextResponse.json({ error: "Interviewer access required." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await actor();
  if (access.response) return access.response;
  return NextResponse.json({ rules: await listRules(access.user.id) });
}

export async function POST(request: Request) {
  const access = await actor();
  if (access.response) return access.response;
  try {
    const body = await request.json();
    if (typeof body.dayOfWeek !== "number" || body.dayOfWeek < 0 || body.dayOfWeek > 6 || !validWindow(body.startTime, body.endTime) || !isTimezone(body.timezone)) return NextResponse.json({ error: "Invalid availability rule." }, { status: 400 });
    const rule = await createRule(access.user.id, body, access.user.email);
    return NextResponse.json({ rule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create availability rule." }, { status: 400 });
  }
}
