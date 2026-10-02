"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AddCandidateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", jobTitle: "Student Developer", roundName: "Technical Interview", durationMinutes: 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/interview-requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Candidate added successfully");
        router.refresh();
        onClose();
      } else {
        toast.error("Failed to add candidate");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-md bg-white p-6 shadow-xl border border-[#deded9]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-.05em]">Add Candidate</h2>
          <button onClick={onClose} className="text-xl text-[#9b9b96] hover:text-black">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
          <div>
            <label className="mb-1 block font-semibold text-[#555550]">Full Name</label>
            <input required type="text" className="w-full border border-[#deded9] px-3 py-2 outline-none focus:border-black" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#555550]">Email Address</label>
            <input required type="email" className="w-full border border-[#deded9] px-3 py-2 outline-none focus:border-black" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#555550]">Job Title</label>
            <input required type="text" className="w-full border border-[#deded9] px-3 py-2 outline-none focus:border-black" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-semibold text-[#555550]">Round</label>
              <input required type="text" className="w-full border border-[#deded9] px-3 py-2 outline-none focus:border-black" value={formData.roundName} onChange={e => setFormData({...formData, roundName: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-[#555550]">Duration (min)</label>
              <input required type="number" min="15" step="15" className="w-full border border-[#deded9] px-3 py-2 outline-none focus:border-black" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-[#555550] hover:text-black">Cancel</button>
            <button type="submit" disabled={loading} className="bg-black px-4 py-2 font-medium text-white hover:bg-[#333] disabled:opacity-50">
              {loading ? "Adding..." : "Add Candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
