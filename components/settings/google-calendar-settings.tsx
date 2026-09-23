"use client";

import { useEffect, useState } from "react";

type Status = { connected: boolean; email?: string | null; selectedCalendarId?: string | null };
type Calendar = { id: string; summary: string; primary: boolean; timeZone?: string };

export default function GoogleCalendarSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  useEffect(() => { fetch("/api/integrations/google/status").then((response) => response.json()).then(setStatus); }, []);
  async function loadCalendars() { const response = await fetch("/api/integrations/google/calendars"); if (response.ok) setCalendars((await response.json()).calendars); }
  async function disconnect() { await fetch("/api/integrations/google/disconnect", { method: "POST" }); setStatus({ connected: false }); setCalendars([]); }
  async function selectCalendar(calendarId: string) { await fetch("/api/integrations/google/calendars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarId }) }); setStatus((current) => current ? { ...current, selectedCalendarId: calendarId } : current); }
  return <section className="mt-8 border border-[#deded9] bg-white p-6"><p className="text-[10px] uppercase tracking-[.16em] text-[#999994]">Calendar integration</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Google Calendar</h2><p className="mt-3 text-sm leading-6 text-[#777772]">Used for interviewer events and Google Meet links. Booking remains successful if calendar sync is unavailable.</p>{status?.connected ? <><p className="mt-5 text-sm font-medium">Connected: {status.email}</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={loadCalendars} className="bg-[#151515] px-4 py-3 text-xs font-semibold text-white hover:bg-[#f48120] hover:text-[#151515]">Load calendars</button><button onClick={disconnect} className="border border-[#deded9] px-4 py-3 text-xs hover:border-[#f48120]">Disconnect</button></div>{calendars.length > 0 && <select value={status.selectedCalendarId ?? ""} onChange={(event) => selectCalendar(event.target.value)} className="mt-4 w-full border border-[#deded9] px-3 py-3 text-sm"><option value="">Select default calendar</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary ? " · Primary" : ""}</option>)}</select>}</> : <a href="/api/integrations/google/connect" className="mt-5 inline-block bg-[#151515] px-4 py-3 text-xs font-semibold text-white hover:bg-[#f48120] hover:text-[#151515]">Connect Google Calendar</a>}</section>;
}
