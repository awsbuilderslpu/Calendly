"use client";

import { useEffect, useMemo, useState } from "react";

type Details = { candidate: { name: string }; interview: { round: string; durationMinutes: number; position: string }; availableFrom: string; availableUntil: string; expiresAt: string };
type Slot = { start: string; end: string };
const timezones = ["Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "UTC"];

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (current <= last) { dates.push(current.toISOString().slice(0, 10)); current.setUTCDate(current.getUTCDate() + 1); }
  return dates;
}

function displayTime(value: string, timezone: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone });
}

export default function CandidateScheduler({ token, details }: { token: string; details: Details }) {
  const [timezone, setTimezone] = useState(() => typeof Intl === "undefined" ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadedTimezone, setLoadedTimezone] = useState("");
  const [loadedDate, setLoadedDate] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const dates = useMemo(() => datesBetween(details.availableFrom, details.availableUntil), [details.availableFrom, details.availableUntil]);

  useEffect(() => {
    let active = true;
    Promise.all(dates.map(async (date) => { const response = await fetch(`/api/public/scheduling/${token}/slots?date=${date}&timezone=${encodeURIComponent(timezone)}`); if (!response.ok) return null; const data = await response.json() as { slots?: Slot[] }; return data.slots?.length ? date : null; })).then((result) => { if (!active) return; const valid = result.filter((date): date is string => Boolean(date)); setAvailableDates(valid); setSelectedDate(valid[0] ?? ""); setLoadedTimezone(timezone); }).catch(() => active && setError("We could not load available dates."));
    return () => { active = false; };
  }, [dates, token, timezone]);
  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    fetch(`/api/public/scheduling/${token}/slots?date=${selectedDate}&timezone=${encodeURIComponent(timezone)}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ slots: Slot[] }>; }).then((data) => { if (!active) return; setSlots(data.slots); setLoadedDate(selectedDate); setLoadedTimezone(timezone); }).catch(() => active && setError("We could not load times for this date."));
    return () => { active = false; };
  }, [selectedDate, token, timezone]);

  const loadingDates = loadedTimezone !== timezone;
  const loadingSlots = Boolean(selectedDate) && (loadedDate !== selectedDate || loadedTimezone !== timezone);

  if (reviewing && selectedSlot) return <Review token={token} details={details} timezone={timezone} slot={selectedSlot} onBack={() => setReviewing(false)} />;
  return <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-[#151515] sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><header className="mb-8 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-xs font-bold text-white">A</span><span><span className="block text-[10px] uppercase tracking-[.18em] text-[#999994]">AWS LPU</span><span className="mt-1 block text-sm font-semibold">Calendly scheduling</span></span></header><section className="overflow-hidden border border-[#deded9] bg-white"><div className="grid lg:grid-cols-[.8fr_1.2fr]"><div className="bg-[#151515] p-7 text-white sm:p-10"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Interview invitation</p><h1 className="mt-6 text-4xl font-semibold leading-[.92] tracking-[-.07em]">{details.interview.round}</h1><p className="mt-5 text-sm text-[#c1c1bc]">{details.interview.position}</p><div className="mt-10 border-t border-white/15 pt-5"><p className="text-[10px] uppercase tracking-[.16em] text-[#999994]">Candidate</p><p className="mt-2 text-sm font-medium">{details.candidate.name}</p><p className="mt-5 text-[10px] uppercase tracking-[.16em] text-[#999994]">Duration</p><p className="mt-2 text-sm font-medium">{details.interview.durationMinutes} minutes</p></div></div><div className="p-6 sm:p-10"><div className="flex flex-col justify-between gap-3 border-b border-[#deded9] pb-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#999994]">Step 1</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Choose a date and time</h2></div><label className="text-right text-[10px] uppercase tracking-[.14em] text-[#999994]">Your timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 block border border-[#deded9] bg-[#fafaf8] px-3 py-2 text-xs normal-case tracking-normal"><option value={timezone}>{timezone}</option>{timezones.filter((zone) => zone !== timezone).map((zone) => <option key={zone}>{zone}</option>)}</select></label></div>{error && <p role="alert" className="mt-5 border-l-2 border-[#f48120] bg-[#fff0e2] px-3 py-3 text-xs text-[#765437]">{error}</p>}{loadingDates ? <p className="py-12 text-sm text-[#777772]">Loading available dates...</p> : availableDates.length === 0 ? <p className="py-12 text-sm leading-6 text-[#777772]">No interview times are currently available.<br />Please contact the recruitment team.</p> : <><div className="mt-7"><p className="text-[10px] uppercase tracking-[.16em] text-[#999994]">Available dates</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{dates.map((date) => { const available = availableDates.includes(date); return <button key={date} disabled={!available} aria-pressed={selectedDate === date} onClick={() => setSelectedDate(date)} className={`border px-3 py-3 text-left ${selectedDate === date ? "border-[#151515] bg-[#151515] text-white" : available ? "border-[#deded9] hover:border-[#f48120]" : "cursor-not-allowed border-[#eeeeea] text-[#b4b4af]"}`}><span className="block text-[10px] uppercase tracking-[.14em]">{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short" })}</span><span className="mt-1 block text-lg font-semibold">{new Date(`${date}T12:00:00Z`).getUTCDate()}</span><span className="mt-1 block text-[10px]">{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short" })}</span></button>; })}</div></div><div className="mt-8 border-t border-[#deded9] pt-6"><p className="text-[10px] uppercase tracking-[.16em] text-[#999994]">Available times</p>{loadingSlots ? <p className="py-8 text-sm text-[#777772]">Loading available times...</p> : slots.length === 0 ? <p className="py-8 text-sm text-[#777772]">No times available on this date.<br />Try another date.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{slots.map((slot) => <button key={slot.start} onClick={() => setSelectedSlot(slot)} className={`border px-4 py-3 text-left text-sm font-medium ${selectedSlot?.start === slot.start ? "border-[#f48120] bg-[#fff0e2] text-[#795638]" : "border-[#deded9] hover:border-[#f48120]"}`}>{displayTime(slot.start, timezone)} – {displayTime(slot.end, timezone)}</button>)}</div>}</div><button disabled={!selectedSlot} onClick={() => setReviewing(true)} className="mt-8 w-full bg-[#151515] px-5 py-4 text-sm font-medium text-white hover:bg-[#f48120] hover:text-[#151515] disabled:cursor-not-allowed disabled:opacity-40">Continue to review</button></>}</div></div></section><p suppressHydrationWarning className="mt-5 text-center text-[11px] text-[#9b9b96]">This link expires {new Date(details.expiresAt).toLocaleDateString("en-US")} · Selecting a time does not reserve it.</p></div></main>;
}

function Review({ token, details, timezone, slot, onBack }: { token: string; details: Details; timezone: string; slot: Slot; onBack: () => void }) {
  const when = `${new Date(slot.start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone })}, ${displayTime(slot.start, timezone)} – ${displayTime(slot.end, timezone)}`;
  const [status, setStatus] = useState<"ready" | "booking" | "success" | "error">("ready");
  const [error, setError] = useState("");
  async function book() {
    setStatus("booking");
    const response = await fetch(`/api/public/scheduling/${token}/book`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ startsAt: slot.start, timezone }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "This time slot is no longer available."); setStatus("error"); return; }
    setStatus("success");
  }
  if (status === "success") return <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-4 text-[#151515]"><section className="w-full max-w-lg border border-[#deded9] bg-white p-8 text-center sm:p-10"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Interview scheduled</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.07em]">You&apos;re all set.</h1><p className="mt-5 text-sm leading-6 text-[#777772]">Your interview has been successfully scheduled. Meeting details will appear shortly if calendar sync is enabled.</p><div className="mt-8 border-y border-[#deded9] py-5 text-sm"><p>{when}</p><p className="mt-2 text-[#777772]">{timezone} · {details.interview.round}</p></div><p className="mt-6 text-xs text-[#999994]">Calendar integration will be available in a future update.</p></section></main>;
  return <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-4 py-8 text-[#151515]"><section className="w-full max-w-lg border border-[#deded9] bg-white p-7 sm:p-10"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Step 2 / Review</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.07em]">Review your interview.</h1><div className="mt-8 divide-y divide-[#deded9] border-y border-[#deded9]">{[["Interview", details.interview.round], ["Position", details.interview.position], ["Candidate", details.candidate.name], ["When", when], ["Timezone", timezone], ["Duration", `${details.interview.durationMinutes} minutes`]].map(([label, value]) => <div key={label} className="flex justify-between gap-5 py-4"><span className="text-xs text-[#999994]">{label}</span><span className="text-right text-sm font-medium">{value}</span></div>)}</div>{error && <p role="alert" className="mt-6 border-l-2 border-[#f48120] bg-[#fff0e2] px-4 py-3 text-sm text-[#765437]">{error}</p>}<div className="mt-8 flex gap-3"><button onClick={onBack} disabled={status === "booking"} className="flex-1 border border-[#deded9] px-4 py-3 text-sm hover:border-[#151515]">Back</button><button onClick={book} disabled={status === "booking"} className="flex-1 bg-[#151515] px-4 py-3 text-sm font-medium text-white hover:bg-[#f48120] hover:text-[#151515] disabled:opacity-50">{status === "booking" ? "Booking..." : "Book interview"}</button></div></section></main>;
}
