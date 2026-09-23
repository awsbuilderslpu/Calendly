import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";

export default async function AppNav() {
  const user = await requireAuth();
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="border-b border-[#deded9] bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#151515] text-xs font-bold text-white">A</span>
          <span className="leading-none"><span className="block text-[10px] uppercase tracking-[.15em] text-[#969691]">AWS LPU</span><span className="mt-1 block text-[15px] font-semibold tracking-[-.03em]">Calendly</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-[12px] text-[#777772] md:flex">
          <Link className="hover:text-[#f48120]" href="/dashboard">Dashboard</Link>
          {(user.role === "ADMIN" || user.role === "RECRUITER") && <Link className="hover:text-[#f48120]" href="/interview-requests">Interview Requests</Link>}
          {(user.role === "ADMIN" || user.role === "RECRUITER") && <Link className="hover:text-[#f48120]" href="/interviews">Interviews</Link>}
          {(user.role === "ADMIN" || user.role === "RECRUITER" || user.role === "INTERVIEWER") && <Link className="hover:text-[#f48120]" href="/availability">Availability</Link>}
          {(user.role === "ADMIN" || user.role === "RECRUITER") && <><Link className="hover:text-[#f48120]" href="/panels">Panels</Link><Link className="hover:text-[#f48120]" href="/scheduling/preview">Preview</Link></>}
          <Link className="hover:text-[#f48120]" href="/settings">Settings</Link>
        </nav>
        <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-[12px] font-medium">{user.name}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#9b9b96]">{user.role}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f48120] text-[11px] font-semibold">{initials}</span><a href="/api/auth/logout" className="text-[11px] text-[#777772] hover:text-[#151515]">Sign out</a></div>
      </div>
    </header>
  );
}
