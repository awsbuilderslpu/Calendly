"use client";

import { useState } from "react";

export default function CalendarSyncButton({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function retry() { setBusy(true); const response = await fetch(`/api/interviews/${id}/calendar-sync`, { method: "POST" }); const data = await response.json(); setBusy(false); setMessage(response.ok ? data.status : data.error ?? "Calendar sync failed."); if (response.ok) window.location.reload(); }
  return <button onClick={retry} disabled={busy} className="mt-4 border border-[#deded9] px-4 py-2 text-xs hover:border-[#f48120] disabled:opacity-50">{busy ? "Syncing..." : "Retry calendar sync"}{message && ` · ${message}`}</button>;
}
