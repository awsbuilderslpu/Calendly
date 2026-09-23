"use client";

import { useState } from "react";

export default function OpenRequestButton({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function openRequest() {
    setBusy(true);
    const response = await fetch(`/api/interview-requests/${id}/open`, { method: "POST" });
    setBusy(false);
    if (response.ok) window.location.reload();
    else setMessage((await response.json()).error ?? "Unable to open request.");
  }

  return <div className="mt-6">{message && <p className="mb-3 text-xs text-[#f2a36a]">{message}</p>}<button onClick={openRequest} disabled={busy} className="bg-[#f48120] px-5 py-3 text-xs font-semibold text-[#151515] transition-colors hover:bg-white disabled:opacity-50">{busy ? "Opening..." : "Open scheduling request"}</button></div>;
}
