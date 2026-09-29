import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// Ensure environment variables are loaded if running directly via tsx
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importStudents() {
  console.log("Authenticating with Google Sheets...");
  
  // Clean up private key newlines
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  try {
    // Assuming the data is on the first sheet, columns A to C (Name, Email, Job/Role)
    // You can adjust the range "Sheet1!A2:E" depending on your actual column names.
    console.log(`Fetching data from Spreadsheet: ${spreadsheetId}...`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A2:E", // Skips header row, fetches first 5 columns
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in the spreadsheet.");
      return;
    }

    console.log(`Found ${rows.length} students. Creating Interview Requests...`);

    let successCount = 0;
    for (const row of rows) {
      // Adjust these indexes based on your actual Google Sheet columns!
      const name = row[0] || "Unknown Student";
      const email = row[1];
      const jobTitle = row[2] || "Mock Interview";
      const phone = row[3] || null; // If you have WhatsApp phone numbers
      
      if (!email) {
        console.log(`Skipping row without email: ${name}`);
        continue;
      }

      // Create an Interview Request in our new Calendly system
      const { error } = await supabase.from("interview_scheduling_requests").insert({
        id: crypto.randomUUID(),
        application_id: crypto.randomUUID(), // Mock application ID
        candidate_id: crypto.randomUUID(),   // Mock candidate ID
        candidate_name: name,
        candidate_email: email,
        job_title: jobTitle,
        round_name: "Initial Technical Round",
        duration_minutes: 60, // Default 1 hour interview
        status: "PENDING"
      });

      if (error) {
        console.error(`❌ Error inserting ${email}:`, error.message);
      } else {
        console.log(`✅ Created request for ${email}`);
        successCount++;
      }
    }

    console.log(`\nImport complete! Successfully created ${successCount} interview requests.`);
    console.log(`You can now open http://localhost:3000/interview-requests in your dashboard to generate scheduling links for them.`);

  } catch (error: any) {
    console.error("Failed to fetch from Google Sheets:", error.message);
  }
}

importStudents();
