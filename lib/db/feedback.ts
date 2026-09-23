import { createDatabaseAdmin } from "@/lib/db/admin";

export async function getFeedbackForInterviewer(interviewId: string, interviewerId: string) {
  const database = createDatabaseAdmin();
  const { data: feedback, error } = await database
    .from("interview_feedback")
    .select("*, feedback_responses(*)")
    .eq("interview_id", interviewId)
    .eq("interviewer_id", interviewerId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  
  // If none exists, verify assignment and create draft
  if (!feedback) {
    const { data: assignment } = await database
      .from("interview_panel_members")
      .select("id")
      .eq("interview_id", interviewId)
      .eq("user_id", interviewerId)
      .maybeSingle();
      
    if (!assignment) throw new Error("Not assigned to this interview");

    const { data: newFeedback, error: insertError } = await database
      .from("interview_feedback")
      .insert({
        interview_id: interviewId,
        interviewer_id: interviewerId,
        status: "DRAFT"
      })
      .select("*, feedback_responses(*)")
      .single();

    if (insertError) throw new Error(insertError.message);
    return newFeedback;
  }
  
  return feedback;
}

export async function getAllFeedbackForInterview(interviewId: string) {
  const database = createDatabaseAdmin();
  const { data, error } = await database
    .from("interview_feedback")
    .select("*, profiles(name, email), feedback_responses(*)")
    .eq("interview_id", interviewId);

  if (error) throw new Error(error.message);
  return data;
}

export async function saveFeedbackDraft(feedbackId: string, interviewerId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const database = createDatabaseAdmin();
  
  // Verify ownership and draft status
  const { data: feedback } = await database
    .from("interview_feedback")
    .select("interviewer_id, status")
    .eq("id", feedbackId)
    .single();

  if (!feedback) throw new Error("Feedback not found");
  if (feedback.interviewer_id !== interviewerId) throw new Error("Forbidden");
  if (feedback.status === "SUBMITTED") throw new Error("Cannot edit submitted feedback");

  await database
    .from("interview_feedback")
    .update({
      overall_rating: data.overallRating,
      recommendation: data.recommendation,
      strengths: data.strengths,
      concerns: data.concerns,
      comments: data.comments,
      updated_at: new Date().toISOString()
    })
    .eq("id", feedbackId);

  if (data.responses && Array.isArray(data.responses)) {
    for (const res of data.responses) {
      await database
        .from("feedback_responses")
        .upsert({
          feedback_id: feedbackId,
          question_id: res.questionId,
          rating_value: res.ratingValue,
          text_value: res.textValue,
          boolean_value: res.booleanValue,
          updated_at: new Date().toISOString()
        }, { onConflict: "feedback_id, question_id" });
    }
  }

  return { success: true };
}

export async function submitFeedback(feedbackId: string, interviewerId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const database = createDatabaseAdmin();
  
  const { error } = await database.rpc("submit_interview_feedback", {
    p_feedback_id: feedbackId,
    p_interviewer_id: interviewerId,
    p_overall_rating: data.overallRating || null,
    p_recommendation: data.recommendation || null,
    p_strengths: data.strengths || null,
    p_concerns: data.concerns || null,
    p_comments: data.comments || null,
    p_responses: data.responses || []
  });

  if (error) {
    if (error.message.includes("FORBIDDEN")) throw new Error("Forbidden");
    if (error.message.includes("ALREADY_SUBMITTED")) throw new Error("Already submitted");
    throw new Error(error.message);
  }

  return { success: true };
}
