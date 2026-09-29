"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddCandidateModal from "./add-candidate-modal";

type Request = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  roundName: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
};

type Panel = {
  id: string;
  name: string;
};

export default function InterviewRequestsTable({ requests, panels }: { requests: Request[], panels: Panel[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPanel, setSelectedPanel] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.filter(r => r.status === "OPEN").length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.filter(r => r.status === "OPEN").map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/interview-requests/google-sheets", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Sync complete! Added ${data.count} new candidates. (${data.skipped} skipped/already existed)`);
        router.refresh();
      } else {
        alert("Error: " + (data.error || "Failed to sync"));
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0 || !selectedPanel) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch("/api/interview-requests/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: Array.from(selectedIds),
          panelId: selectedPanel
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully processed ${data.results.filter((r: any) => r.status === "success").length} requests.`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert("Error: " + (data.error || "Bulk assignment failed"));
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openCount = requests.filter(r => r.status === "OPEN").length;

  return (
    <div>
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} />}
      
      
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-end gap-3">
        <button onClick={() => setShowAddModal(true)} className="border border-[#deded9] bg-white px-4 py-2 text-sm font-semibold text-black hover:border-black transition-colors">
          + Add Candidate Manually
        </button>
        <button onClick={handleSync} disabled={isSyncing} className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-50 transition-colors">
          {isSyncing ? "Syncing..." : "Sync Shortlisted Students"}
        </button>
      </div>
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-col items-center gap-4 rounded bg-[#eff7ee] p-4 sm:flex-row sm:justify-between border border-[#deded9]">
          <div className="text-sm font-semibold text-[#486d46]">
            {selectedIds.size} candidate(s) selected
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <select 
              className="border border-[#deded9] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
              value={selectedPanel}
              onChange={(e) => setSelectedPanel(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">-- Select Interview Panel --</option>
              {panels.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkGenerate}
              disabled={!selectedPanel || isProcessing}
              className="bg-[#f48120] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:bg-[#e0751a]"
            >
              {isProcessing ? "Processing..." : "Generate Links & Send Emails"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[#deded9] bg-white">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-[#deded9] bg-[#fafaf8] text-[10px] uppercase tracking-[.16em] text-[#9b9b96]">
            <tr>
              <th className="px-5 py-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={openCount > 0 && selectedIds.size === openCount}
                  onChange={toggleSelectAll}
                  disabled={openCount === 0 || isProcessing}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-5 py-4 font-semibold">Candidate</th>
              <th className="px-5 py-4 font-semibold">Position</th>
              <th className="px-5 py-4 font-semibold">Round</th>
              <th className="px-5 py-4 font-semibold">Duration</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#deded9]">
            {requests.map((request) => (
              <tr key={request.id} className={`text-sm ${selectedIds.has(request.id) ? "bg-[#fcfdfc]" : ""}`}>
                <td className="px-5 py-5 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(request.id)}
                    onChange={() => toggleSelect(request.id)}
                    disabled={request.status !== "OPEN" || isProcessing}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-5 py-5">
                  <Link href={`/interview-requests/${request.id}`} className="font-semibold hover:text-[#f48120]">
                    {request.candidateName}
                  </Link>
                  <p className="mt-1 text-xs text-[#8a8a85]">{request.candidateEmail}</p>
                </td>
                <td className="px-5 py-5 text-[#555550]">{request.jobTitle}</td>
                <td className="px-5 py-5 text-[#555550]">{request.roundName}</td>
                <td className="px-5 py-5 text-[#555550]">{request.durationMinutes} min</td>
                <td className="px-5 py-5">
                  <span className={`inline-flex px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${request.status === "OPEN" ? "bg-[#eff7ee] text-[#486d46]" : "bg-[#fff0e2] text-[#8a6038]"}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-5 py-5 text-xs text-[#8a8a85]">
                  {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm text-[#8a8a85]">
                  No interview requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
