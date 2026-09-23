import AppNav from "@/components/layout/app-nav";
import AvailabilityManager from "@/components/availability/availability-manager";
import { requireAuth } from "@/lib/auth/server";

export default async function AvailabilityPage() {
  const user = await requireAuth();
  if (user.role === "CANDIDATE") return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><h1 className="text-4xl font-semibold tracking-[-.07em]">Availability</h1><p className="mt-5 text-sm text-[#777772]">Only interviewers, recruiters, and admins can configure availability.</p></main></>;
  return <><AppNav /><main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-16"><div className="border-b border-[#deded9] pb-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Scheduling / Availability</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">Make time<br /><span className="text-[#9b9b96]">with intention.</span></h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#777772]">Recurring windows and date exceptions are stored in their IANA timezone and used to calculate panel overlap.</p></div><div className="mt-8"><AvailabilityManager /></div></main></>;
}
