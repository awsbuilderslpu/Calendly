import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

function escapeCsv(str: string | null | undefined): string {
  if (!str) return '""';
  const escaped = String(str).replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return new NextResponse("Unauthorized", { status: access.status });

  const database = createDatabaseAdmin();
  const { data, error } = await database
    .from("interviews")
    .select(`
      id, candidate_name, candidate_email, job_title, round_name,
      starts_at, ends_at, timezone, status, created_at,
      calendar_integrations(provider, status),
      interview_panel_members(profiles(email))
    `)
    .order("created_at", { ascending: false })
    .limit(1000); // Hard limit for safety

  if (error) return new NextResponse(error.message, { status: 500 });

  const headers = [
    "ID", "Candidate", "Email", "Job", "Round", "Start", "End", 
    "Timezone", "Status", "Created At", "Calendar Providers", "Interviewers"
  ];
  
  const rows = data.map((row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    const providers = row.calendar_integrations?.map((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => c.provider).join(";") || "";
    const interviewers = row.interview_panel_members?.map((m: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => m.profiles?.email).join(";") || "";
    
    return [
      row.id, row.candidate_name, row.candidate_email, row.job_title, row.round_name,
      row.starts_at, row.ends_at, row.timezone, row.status, row.created_at,
      providers, interviewers
    ].map(escapeCsv).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="interviews-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
