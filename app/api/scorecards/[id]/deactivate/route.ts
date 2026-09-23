import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  const { id } = await params;
  await createDatabaseAdmin().from("scorecard_templates").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true });
}
