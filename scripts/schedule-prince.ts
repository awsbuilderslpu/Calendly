import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = "paramjitsinghrose@gmail.com";
  const name = "Prince";

  console.log(`Creating interview request for ${name} (${email})...`);

  const { data, error } = await supabase.from("interview_scheduling_requests").insert({
    id: crypto.randomUUID(),
    external_request_id: `manual-${Date.now()}`,
    application_id: `app-${Date.now()}`,
    candidate_id: `cand-${Date.now()}`,
    candidate_name: name,
    candidate_email: email,
    job_id: "role-1",
    job_title: "Student Developer",
    round_name: "Technical Interview",
    duration_minutes: 60,
    status: "PENDING",
    requested_by: "Admin"
  }).select();

  if (error) {
    console.error("Error creating request:", error.message);
    return;
  }

  console.log("✅ Successfully created Interview Request!");
  console.log("ID:", data[0].id);
  console.log("\nNext steps:");
  console.log("1. Open http://localhost:3000/interview-requests in your browser");
  console.log("2. Click on Prince's request");
  console.log("3. Select your panel and click 'Generate Scheduling Link'");
  console.log("4. He will instantly receive an email with the link to pick a time!");
}

run();
