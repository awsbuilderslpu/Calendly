import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterviewRequest } from "@/lib/db/interview-requests";
import { createSchedulingLink } from "@/lib/db/scheduling-links";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { SsoMailProvider } from "@/lib/integrations/sso-mail";

export async function POST(request: Request) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  
  const { requestIds, panelId } = body;
  if (!Array.isArray(requestIds) || requestIds.length === 0 || !panelId) {
    return NextResponse.json({ error: "Missing requestIds or panelId." }, { status: 400 });
  }

  const db = createDatabaseAdmin();
  const mailer = new SsoMailProvider();
  
  const results = [];
  
  for (const reqId of requestIds) {
    try {
      // 1. Assign panel
      await db.from("interview_scheduling_requests").update({ panel_id: panelId }).eq("id", reqId);
      
      // 2. Fetch request
      const interviewRequest = await getInterviewRequest(reqId);
      if (!interviewRequest) {
        results.push({ id: reqId, status: "error", error: "Request not found" });
        continue;
      }
      
      if (interviewRequest.status !== "OPEN") {
        results.push({ id: reqId, status: "error", error: "Request is not OPEN" });
        continue;
      }
      
      // 3. Generate Link
      const link = await createSchedulingLink(interviewRequest, access.user.email);
      
      // 4. Send Email
      const mailResult = await mailer.send({
        id: `inv-${Date.now().toString()}-${reqId.substring(0, 8)}`,
        recipientEmail: interviewRequest.candidateEmail,
        subject: `Interview Invitation: ${interviewRequest.jobTitle}`,
        heading: "Interview Invitation",
        greeting: `Hi ${interviewRequest.candidateName},`,
        content: `You have been invited to schedule a ${interviewRequest.roundName} for the ${interviewRequest.jobTitle} position.\n\nPlease select a time that works for you by clicking the link below:\n\n${link.url}\n\nNote: This link will expire in 7 days.`,
        senderName: "AWS LPU Recruitment",
        senderRole: "Recruitment Team"
      });
      
      results.push({ 
        id: reqId, 
        status: mailResult.success ? "success" : "mail_error", 
        error: mailResult.success ? null : mailResult.error 
      });
      
    } catch (err: unknown) {
      results.push({ 
        id: reqId, 
        status: "error", 
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}
