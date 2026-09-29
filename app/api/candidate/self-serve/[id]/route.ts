import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getInterviewRequest } from "@/lib/db/interview-requests";
import { createSchedulingLink } from "@/lib/db/scheduling-links";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  
  const requestId = (await context.params).id;
  const interviewRequest = await getInterviewRequest(requestId);
  
  if (!interviewRequest) {
    return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
  }
  
  if (interviewRequest.candidateEmail !== user.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (interviewRequest.status !== "OPEN") {
    return NextResponse.json({ error: "Request is not open." }, { status: 400 });
  }
  
  try {
    const link = await createSchedulingLink(interviewRequest, user.email);
    return NextResponse.redirect(link.url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create scheduling link." }, { status: 400 });
  }
}
