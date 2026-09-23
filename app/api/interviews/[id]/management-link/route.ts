import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createManagementToken } from "@/lib/booking/action-tokens";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter access required" }, { status: access.status });

  const { id } = await params;
  const token = await createManagementToken(id);

  return NextResponse.json({ success: true, token, url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/${token}` }, { status: 200 });
}
