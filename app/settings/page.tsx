import { requireAuth } from "@/lib/auth/server";
import GoogleCalendarSettings from "@/components/settings/google-calendar-settings";
import AppNav from "@/components/layout/app-nav";

export default async function SettingsPage() {
  const user = await requireAuth();
  const fields = [["Name", user.name], ["Email", user.email], ["Role", user.role], ["SSO User ID", user.ssoUserId]];

  return <><AppNav /><main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 lg:py-16"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Settings / Profile</p><h1 className="mt-5 text-5xl font-semibold tracking-[-.08em]">Your profile.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#777772]">Your identity is managed by AWS LPU SSO. Profile and access fields are read-only in Calendly.</p><section className="mt-10 border border-[#deded9] bg-white">{fields.map(([label, value]) => <div key={label} className="grid gap-2 border-b border-[#deded9] px-5 py-5 last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-center"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9b9b96]">{label}</p><p className="break-all text-sm font-medium">{value}</p></div>)}</section><GoogleCalendarSettings /></main></>;
}
