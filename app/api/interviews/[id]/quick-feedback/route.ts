import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { feedback } = await request.json(); // "Selected" or "Not Selected"
    const id = (await context.params).id;
    const db = createDatabaseAdmin();
    
    // Check if feedback already exists for this interviewer and interview
    const { data: existing } = await db
      .from("interview_feedback")
      .select("id")
      .eq("interview_id", id)
      .eq("interviewer_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("interview_feedback")
        .update({ 
          recommendation: feedback, 
          status: "SUBMITTED",
          updated_at: new Date().toISOString() 
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("interview_feedback")
        .insert({
          interview_id: id,
          interviewer_id: user.id,
          recommendation: feedback,
          status: "SUBMITTED",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) throw new Error(error.message);
    }
    
    // Optionally update the scheduling request status so it shows globally
    const mappedStatus = feedback === "Selected" ? "Selected" : "Rejected";
    // We need to find the scheduling_request_id first
    const { data: interview } = await db.from("interviews").select("scheduling_request_id").eq("id", id).single();
    if (interview?.scheduling_request_id) {
      await db.from("interview_scheduling_requests").update({ status: mappedStatus }).eq("id", interview.scheduling_request_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
