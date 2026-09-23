import AppNav from "@/components/layout/app-nav";
import SlotPreview from "@/components/scheduling/slot-preview";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listPanels } from "@/lib/db/panels";

export default async function SchedulingPreviewPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><h1 className="text-4xl font-semibold tracking-[-.07em]">Scheduling preview</h1><p className="mt-5 text-sm text-[#777772]">Only recruiters and admins can preview panel availability.</p></main></>;
  const panels = (await listPanels()).map(({ id, name, requiredInterviewers }) => ({ id, name, requiredInterviewers }));
  return <><AppNav /><main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-16"><div className="border-b border-[#deded9] pb-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Scheduling / Preview</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.08em]">Find the overlap.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#777772]">A read-only recruiter preview. This calculates availability but never reserves or books a slot.</p></div><div className="mt-8"><SlotPreview panels={panels} /></div></main></>;
}
