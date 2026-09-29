"use client";

import { useState, useEffect } from "react";

export default function SchedulingLinkManager({ requestId, status }: { requestId: string; status: string }) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [panels, setPanels] = useState<{id: string, name: string}[]>([]);
  const [selectedPanel, setSelectedPanel] = useState("");

  useEffect(() => {
    fetch("/api/panels").then(r => r.json()).then(data => {
      if (data.panels) setPanels(data.panels);
    });
  }, []);

  async function generate() {
    setBusy(true);
    const response = await fetch(`/api/interview-requests/${requestId}/scheduling-link`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panelId: selectedPanel || undefined })
    });
    const data = await response.json();
    setBusy(false);
    if (response.ok) { 
      setLink(data.link); 
      setMessage("New link generated. It is shown only once here."); 
    } else {
      setMessage(data.error ?? "Unable to generate link.");
    }
  }

  async function revoke() {
    setBusy(true);
    const response = await fetch(`/api/interview-requests/${requestId}/scheduling-link/revoke`, { method: "POST" });
    setBusy(false);
    setMessage(response.ok ? "Active scheduling links revoked." : "Unable to revoke link.");
    if (response.ok) setLink(null);
  }

  return <div className="mt-8 border-t border-white/15 pt-6">
    <p className="text-[10px] uppercase tracking-[.18em] text-[#f48120]">Candidate access</p>
    <p className="mt-3 text-sm text-[#c2c2bd]">Generate a secure link after the request is open. The raw token is never stored or shown again.</p>
    
    {link && <div className="mt-4 break-all border border-white/15 bg-white/5 p-3 text-xs text-white"><p>{link.url}</p><p className="mt-2 text-[#aaa9a4]">Expires {new Date(link.expiresAt).toLocaleString()}</p><button onClick={() => navigator.clipboard.writeText(link.url).then(() => setMessage("Link copied."))} className="mt-3 text-[#f48120] hover:text-white">Copy link</button></div>}
    
    {message && <p className="mt-3 text-xs text-[#f2a36a]">{message}</p>}
    
    {status === "OPEN" && <div className="mt-4 flex flex-col gap-3">
      {panels.length > 0 && (
        <select 
          value={selectedPanel} 
          onChange={(e) => setSelectedPanel(e.target.value)}
          className="w-full sm:w-auto bg-[#252525] border border-white/15 px-3 py-2 text-xs text-white max-w-xs"
        >
          <option value="">Select an interviewing panel...</option>
          {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {panels.length === 0 && <p className="text-xs text-[#f2a36a]">⚠️ You need to create a Panel first (go to Panels in the top menu).</p>}
      
      <div className="flex flex-wrap gap-3">
        <button onClick={generate} disabled={busy || (!selectedPanel && panels.length > 0)} className="bg-[#f48120] px-4 py-3 text-xs font-semibold text-[#151515] disabled:opacity-50">
          {busy ? "Working..." : link ? "Generate new link" : "Generate scheduling link"}
        </button>
        <button onClick={revoke} disabled={busy} className="border border-white/20 px-4 py-3 text-xs text-white hover:border-[#f48120] disabled:opacity-50">Revoke active links</button>
      </div>
    </div>}
  </div>;
}
