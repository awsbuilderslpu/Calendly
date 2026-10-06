"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function InterviewRowActions({ interviewId, initialStatus, feedbackRecommendation }: { interviewId: string, initialStatus: string, feedbackRecommendation?: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const router = useRouter();

  const handleMarkDone = async () => {
    setLoading(true);
    const toastId = toast.loading("Marking as done...");
    try {
      const res = await fetch(`/api/interviews/${interviewId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Interview marked as done!", { id: toastId });
      setStatus("COMPLETED");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error updating status", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText) return;
    setLoading(true);
    const toastId = toast.loading("Saving feedback...");
    try {
      const res = await fetch(`/api/interviews/${interviewId}/quick-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText })
      });
      if (!res.ok) throw new Error("Failed to save feedback");
      toast.success("Feedback saved successfully!", { id: toastId });
      setShowFeedbackBox(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error saving feedback", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative">
      {status === "COMPLETED" ? (
        <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          Done
        </span>
      ) : (
        <button 
          onClick={handleMarkDone}
          disabled={loading}
          className="text-left text-blue-600 hover:underline text-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer w-max"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          Mark Done
        </button>
      )}

      {feedbackRecommendation ? (
        <span className={`text-xs font-semibold flex items-center gap-1 ${feedbackRecommendation === "YES" ? "text-green-600" : "text-red-600"}`}>
          {feedbackRecommendation === "YES" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          )}
          {feedbackRecommendation === "YES" ? "Selected" : "Not Selected"}
        </span>
      ) : (
        <button 
        onClick={() => setShowFeedbackBox(!showFeedbackBox)}
        className="text-left text-orange-600 hover:underline text-xs flex items-center gap-1 cursor-pointer w-max"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Add Feedback
      </button>
      )}

      {showFeedbackBox && (
        <div className="absolute top-full right-0 z-50 w-48 bg-white border border-[#deded9] shadow-2xl p-3 mt-2">
          <p className="text-xs font-semibold mb-2 text-[#555]">Quick Feedback</p>
          <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-2">
            <select 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="text-xs border border-[#deded9] p-1 w-full"
              required
            >
              <option value="" disabled>Select outcome...</option>
              <option value="Selected">Selected</option>
              <option value="Not Selected">Not Selected</option>
            </select>
            <div className="flex justify-end gap-2 mt-1">
              <button 
                type="button" 
                onClick={() => setShowFeedbackBox(false)}
                className="text-[10px] text-gray-500 hover:text-black cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading || !feedbackText}
                className="text-[10px] bg-black text-white px-2 py-1 hover:bg-[#f48120] cursor-pointer disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
