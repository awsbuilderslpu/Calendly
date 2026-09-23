"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InterviewActions({ interviewId, status }: { interviewId: string, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this interview?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) router.refresh();
      else alert((await res.json()).error || "Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = () => {
    alert("Reschedule flow would open here for recruiters.");
  };

  if (status === "CANCELLED") return null;

  return (
    <div className="mt-6 flex space-x-4">
      <button 
        onClick={handleReschedule} 
        disabled={loading}
        className="px-4 py-2 border text-sm font-medium rounded hover:bg-gray-50"
      >
        Reschedule
      </button>
      <button 
        onClick={handleCancel} 
        disabled={loading}
        className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded hover:bg-red-50"
      >
        {loading ? "Cancelling..." : "Cancel interview"}
      </button>
    </div>
  );
}
