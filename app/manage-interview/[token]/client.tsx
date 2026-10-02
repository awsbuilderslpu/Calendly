"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";

export function ManageInterviewClient({ interview, token }: { interview: Record<string, unknown>, token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (String(interview.status) === "CANCELLED") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Interview Cancelled</h1>
        <p className="mt-4 text-gray-600">This interview has been cancelled.</p>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this interview?")) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/interviews/${token}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `cancel-${Date.now()}`
        },
        body: JSON.stringify({ reason: "Cancelled by candidate via management link" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      router.refresh();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = () => {
    // In a full implementation, we'd load the slots and show a calendar.
    // Since Phase 8 is backend heavy, we'll implement a stub for candidate reschedule frontend.
    toast("Reschedule flow would open a calendar slot picker here.", { icon: "ℹ️" });
  };

  const start = DateTime.fromISO(String(interview.starts_at)).setZone(String(interview.timezone));
  const end = DateTime.fromISO(String(interview.ends_at)).setZone(String(interview.timezone));

  return (
    <div className="bg-white p-8 rounded shadow">
      <h1 className="text-3xl font-semibold text-gray-900 mb-6">Interview Scheduled</h1>
      
      <div className="mb-6 space-y-2 text-gray-700">
        <p><strong>Role:</strong> {String(interview.job_title)}</p>
        <p><strong>Round:</strong> {String(interview.round_name)}</p>
        <p><strong>Date:</strong> {start.toFormat("cccc, LLLL d, yyyy")}</p>
        <p><strong>Time:</strong> {start.toFormat("h:mm a")} – {end.toFormat("h:mm a")} {start.toFormat("ZZZZZ")}</p>
        <p><strong>Timezone:</strong> {String(interview.timezone)}</p>
      </div>

      {interview.google_meet_url as string && (
        <div className="mb-8">
          <a href={interview.google_meet_url as string} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Join Google Meet
          </a>
        </div>
      )}

      {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}

      <div className="flex space-x-4 border-t pt-6">
        <button 
          onClick={handleReschedule} 
          disabled={loading}
          className="px-4 py-2 border rounded hover:bg-gray-50 text-gray-700 font-medium"
        >
          Reschedule
        </button>
        <button 
          onClick={handleCancel} 
          disabled={loading}
          className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium"
        >
          {loading ? "Processing..." : "Cancel"}
        </button>
      </div>
    </div>
  );
}
