import AppNav from "@/components/layout/app-nav";
import PanelManager from "@/components/panels/panel-manager";
import { getCurrentUser } from "@/lib/auth/server";
import { listPanels, listPanelsForUser } from "@/lib/db/panels";

export default async function PanelsPage() {
  const user = await getCurrentUser();
  if (!user) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><h1 className="text-4xl font-semibold tracking-[-.07em]">Panels</h1><p className="mt-5 text-sm text-[#777772]">Sign in to view panels.</p></main></>;
  const panels = user.role === "ADMIN" || user.role === "RECRUITER" ? await listPanels() : await listPanelsForUser(user.id);
  return <><AppNav /><main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-16"><div className="border-b border-[#deded9] pb-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Scheduling / Panels</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">{user.role === "ADMIN" || user.role === "RECRUITER" ? "Build the room." : "Your panels."}</h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#777772]">{user.role === "ADMIN" || user.role === "RECRUITER" ? "Define eligible interviewers and the minimum number required for each scheduling request." : "Panels you belong to will appear here."}</p></div><div className="mt-8">{user.role === "ADMIN" || user.role === "RECRUITER" ? <PanelManager initialPanels={panels} /> : <div className="grid gap-4 md:grid-cols-2">{panels.map((panel) => <section key={panel.id} className="border border-[#deded9] bg-white p-6"><h2 className="text-xl font-semibold">{panel.name}</h2><p className="mt-2 text-sm text-[#777772]">{panel.description || "No description"}</p><p className="mt-5 text-xs text-[#8a8a85]">{panel.members.length} members · {panel.requiredInterviewers} required</p></section>)}</div>}</div></main></>;
}
