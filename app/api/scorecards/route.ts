import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listScorecards, createScorecard } from "@/lib/db/scorecards";

export async function GET(request: NextRequest) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  const data = await listScorecards();
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  try {
    const body = await request.json();
    const data = await createScorecard(body);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 400 });
  }
}
