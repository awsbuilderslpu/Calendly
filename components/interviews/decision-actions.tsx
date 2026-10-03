"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function DecisionActions({ interviewId, currentDecision }: { interviewId: string, currentDecision: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  async function updateDecision(decision: string) {
    setIsUpdating(true);
    const loadingToast = toast.loading(`Marking as ${decision}...`);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(`Candidate marked as ${decision}`, { id: loadingToast });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="mt-8 border border-[#deded9] bg-white p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-[#9b9b96]">Final Decision</h3>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[#555]">
          Current Status: <strong className={currentDecision.toLowerCase().includes("select") ? "text-green-600" : currentDecision.toLowerCase().includes("reject") ? "text-red-600" : ""}>{currentDecision || "Pending"}</strong>
        </p>
        <div className="flex gap-3">
          <button 
            disabled={isUpdating}
            onClick={() => updateDecision("Rejected")}
            className="cursor-pointer border border-[#deded9] bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-600 transition-colors disabled:opacity-50"
          >
            Reject Candidate
          </button>
          <button 
            disabled={isUpdating}
            onClick={() => updateDecision("Selected")}
            className="cursor-pointer bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Select Candidate
          </button>
        </div>
      </div>
    </div>
  );
}
