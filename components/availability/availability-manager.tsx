"use client";

import { useEffect, useState } from "react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Rule = { id: string; dayOfWeek: number; startTime: string; endTime: string; timezone: string };
type Exception = { id: string; date: string; startTime: string; endTime: string; isAvailable: boolean; reason: string | null };

export default function AvailabilityManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [exception, setException] = useState({ date: "", startTime: "09:00", endTime: "17:00", isAvailable: false, reason: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [rulesResponse, exceptionsResponse] = await Promise.all([fetch("/api/availability"), fetch("/api/availability/exceptions")]);
    if (rulesResponse.ok) setRules((await rulesResponse.json()).rules);
    if (exceptionsResponse.ok) setExceptions((await exceptionsResponse.json()).exceptions);
  }
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/availability"), fetch("/api/availability/exceptions")]).then(async ([rulesResponse, exceptionsResponse]) => {
      if (!active) return;
      if (rulesResponse.ok) setRules((await rulesResponse.json()).rules);
      if (exceptionsResponse.ok) setExceptions((await exceptionsResponse.json()).exceptions);
    });
    return () => { active = false; };
  }, []);

  async function addRule() {
    const response = await fetch("/api/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayOfWeek, startTime, endTime, timezone }) });
    setMessage(response.ok ? "Availability window saved." : "Unable to save this window.");
    if (response.ok) await load();
  }
  async function removeRule(id: string) {
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    await load();
  }
  async function addException() {
    const response = await fetch("/api/availability/exceptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exception) });
    setMessage(response.ok ? "Exception saved." : "Unable to save this exception.");
    if (response.ok) await load();
  }
  async function removeException(id: string) {
    await fetch(`/api/availability/exceptions/${id}`, { method: "DELETE" });
    await load();
  }

  return <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
    <section className="border border-[#deded9] bg-white p-6 sm:p-8"><div className="flex flex-col justify-between gap-3 border-b border-[#deded9] pb-6 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#9b9b96]">Recurring availability</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">My working windows</h2></div><select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="border border-[#deded9] bg-[#fafaf8] px-3 py-2 text-xs"><option>Asia/Kolkata</option><option>America/New_York</option><option>Europe/London</option><option>UTC</option></select></div><div className="divide-y divide-[#deded9]">{days.slice(1).map((day, index) => <div key={day} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="w-28 text-sm font-medium">{day}</p><div className="flex flex-1 flex-wrap gap-2">{rules.filter((rule) => rule.dayOfWeek === index + 1).map((rule) => <span key={rule.id} className="inline-flex items-center gap-2 bg-[#fff0e2] px-3 py-2 text-xs text-[#795638]">{rule.startTime} → {rule.endTime}<button onClick={() => removeRule(rule.id)} aria-label={`Delete ${day} window`} className="text-[#b2794c] hover:text-[#151515]">×</button></span>)}{!rules.some((rule) => rule.dayOfWeek === index + 1) && <span className="text-xs text-[#aaa9a4]">No windows</span>}</div></div>)}</div><div className="mt-6 border-t border-[#deded9] pt-6"><p className="text-[10px] uppercase tracking-[.16em] text-[#9b9b96]">Add another time window</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_110px_auto]"><select value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))} className="border border-[#deded9] px-3 py-2 text-xs">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="border border-[#deded9] px-3 py-2 text-xs" /><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="border border-[#deded9] px-3 py-2 text-xs" /><button onClick={addRule} className="bg-[#151515] px-4 py-2 text-xs font-semibold text-white hover:bg-[#f48120] hover:text-[#151515]">Add</button></div></div></section>
    <section className="border border-[#deded9] bg-white p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[.18em] text-[#9b9b96]">Exceptions</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Specific dates</h2><div className="mt-6 space-y-3">{exceptions.map((item) => <div key={item.id} className="border-l-2 border-[#f48120] bg-[#fffaf5] p-3"><div className="flex justify-between gap-2"><p className="text-xs font-semibold">{item.date}</p><button onClick={() => removeException(item.id)} className="text-xs text-[#999994] hover:text-[#151515]">Delete</button></div><p className="mt-1 text-xs text-[#777772]">{item.isAvailable ? "Available" : "Unavailable"} · {item.startTime} - {item.endTime}</p><p className="mt-1 text-[11px] text-[#999994]">{item.reason || "No reason"}</p></div>)}</div><div className="mt-6 border-t border-[#deded9] pt-6"><input type="date" value={exception.date} onChange={(event) => setException({ ...exception, date: event.target.value })} className="w-full border border-[#deded9] px-3 py-2 text-xs" /><div className="mt-2 grid grid-cols-2 gap-2"><input type="time" value={exception.startTime} onChange={(event) => setException({ ...exception, startTime: event.target.value })} className="border border-[#deded9] px-3 py-2 text-xs" /><input type="time" value={exception.endTime} onChange={(event) => setException({ ...exception, endTime: event.target.value })} className="border border-[#deded9] px-3 py-2 text-xs" /></div><input placeholder="Reason" value={exception.reason} onChange={(event) => setException({ ...exception, reason: event.target.value })} className="mt-2 w-full border border-[#deded9] px-3 py-2 text-xs" /><label className="mt-3 flex items-center gap-2 text-xs text-[#777772]"><input type="checkbox" checked={exception.isAvailable} onChange={(event) => setException({ ...exception, isAvailable: event.target.checked })} /> Special availability</label><button onClick={addException} className="mt-4 w-full bg-[#151515] px-4 py-3 text-xs font-semibold text-white hover:bg-[#f48120] hover:text-[#151515]">Add exception</button></div></section>
    {message && <p className="text-xs text-[#486d46] lg:col-span-2">{message}</p>}
  </div>;
}
