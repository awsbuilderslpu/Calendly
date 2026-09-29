import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { getInterviewRequest } from "@/lib/db/interview-requests";
import { createSchedulingLink } from "@/lib/db/scheduling-links";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { SsoMailProvider } from "@/lib/integrations/sso-mail";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: access.status === 401 ? "Authentication required." : "Recruiter or admin access required." }, { status: access.status });
  
  const requestId = (await context.params).id;
  
  try {
    const body = await request.json();
    if (body.panelId) {
      const db = createDatabaseAdmin();
      await db.from("interview_scheduling_requests").update({ panel_id: body.panelId }).eq("id", requestId);
    }
  } catch (e) {
    // ignore
  }

  const interviewRequest = await getInterviewRequest(requestId);
  if (!interviewRequest) return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
  
  try {
    const link = await createSchedulingLink(interviewRequest, access.user.email);
    
    // --- SEND EMAIL NOTIFICATION ---
    const mailer = new SsoMailProvider();
    const result = await mailer.send({
      id: "inv-" + Date.now().toString(),
      recipientEmail: interviewRequest.candidateEmail,
      subject: `Interview Invitation: ${interviewRequest.jobTitle}`,
      heading: "Interview Invitation",
      greeting: `Hi ${interviewRequest.candidateName},`,
      content: `You have been invited to schedule a ${interviewRequest.roundName} for the ${interviewRequest.jobTitle} position.\n\nPlease select a time that works for you by clicking the link below:\n\n${link.url}\n\nNote: This link will expire in 7 days.`,
      senderName: "AWS LPU Recruitment",
      senderRole: "Recruitment Team"
    });
    
    if (!result.success) {
      console.error("Mail error:", result.error);
    }
    // --------------------------------

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create scheduling link." }, { status: 400 });
  }
}
