"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function InterviewRowActions({ interviewId, initialStatus }: { interviewId: string, initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="flex flex-col gap-2">
      {status === "COMPLETED" ? (
        <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          Done
        </span>
      ) : (
        <button 
          onClick={handleMarkDone}
          disabled={loading}
          className="text-left text-blue-600 hover:underline text-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          Mark Done
        </button>
      )}
      <a 
        href={`/interviews/${interviewId}/feedback`} 
        className="text-left text-orange-600 hover:underline text-xs flex items-center gap-1 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Add Feedback
      </a>
    </div>
  );
}
