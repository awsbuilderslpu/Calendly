import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function GET(request: NextRequest) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const startParam = searchParams.get("from");
  const endParam = searchParams.get("to");
  
  const endDate = endParam ? new Date(endParam) : new Date();
  const startDate = startParam ? new Date(startParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // default 30 days

  const database = createDatabaseAdmin();
  const { data, error } = await database.rpc("get_recruiter_dashboard_metrics", {
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
