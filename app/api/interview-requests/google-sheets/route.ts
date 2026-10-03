import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { google } from "googleapis";
import { createDatabaseAdmin } from "@/lib/db/admin";
import crypto from "node:crypto";

async function getSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error("Google service account credentials not configured in environment variables.");
  }
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID };
}

export async function POST(request: Request) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  
  const db = createDatabaseAdmin();
  let successCount = 0;
  let skippedCount = 0;

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    if (!spreadsheetId) return NextResponse.json({ error: "Spreadsheet ID not configured." }, { status: 400 });
    
    // Fetch data from the "Applications" sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Applications!A2:Z",
    });

    const rows = response.data.values || [];
    
    // Fetch existing candidates to prevent duplicates
    const { data: existingRequests } = await db.from("interview_scheduling_requests").select("external_request_id, candidate_email");
    const existingIds = new Set(existingRequests?.map(r => String(r.external_request_id)));
    const existingEmails = new Set(existingRequests?.map(r => String(r.candidate_email)));

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const email = row[6] || row[5] || ""; // Prefer personal, fallback to university
      const status = row[2] || "";
      const name = row[3] || "Unknown Student";
      const applicationId = row[0] || `app-${index}`;
      const jobTitle = row[15] || "Student Builder";
      
      // Only process Shortlisted candidates
      if (!status.toLowerCase().includes("shortli")) continue;
      if (!email || !name) continue;

      // Skip if already in database
      if (existingIds.has(applicationId) || existingEmails.has(email)) {
        skippedCount++;
        continue;
      }
      
      const { error } = await db.from("interview_scheduling_requests").insert({
        id: crypto.randomUUID(),
        external_request_id: applicationId,
        application_id: applicationId,
        candidate_id: `cand-sheets-${crypto.randomUUID().substring(0,8)}`,
        candidate_name: name,
        candidate_email: email,
        job_id: `job-${crypto.randomUUID().substring(0,8)}`,
        job_title: jobTitle,
        round_name: "Technical Interview",
        duration_minutes: 30,
        status: "OPEN",
        requested_by: access.user.email
      });
      
      if (!error) successCount++;
    }

    return NextResponse.json({ success: true, count: successCount, skipped: skippedCount });
  } catch (err: any) {
    console.error("Sheets error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync spreadsheet." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
