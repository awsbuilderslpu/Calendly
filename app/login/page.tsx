import Link from "next/link";

const messages: Record<string, string> = {
  unauthenticated: "Sign in to continue to Calendly.",
  invalid_callback: "The sign-in request expired or was invalid. Please try again.",
  authentication_failed: "We could not complete sign-in. Please try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const message = params.error ? messages[params.error] ?? "Please sign in again." : null;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5 py-12">
      <section className="w-full max-w-md border border-[#deded9] bg-white p-8 sm:p-10">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-xs font-bold text-white">A</span><div><p className="text-[10px] uppercase tracking-[.18em] text-[#999994]">AWS LPU</p><p className="mt-1 text-lg font-semibold tracking-[-.04em]">Calendly</p></div></div>
        <div className="mt-16"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f48120]">Interview operations</p><h1 className="mt-4 text-4xl font-semibold leading-[.95] tracking-[-.07em]">Make time<br /><span className="text-[#9b9b96]">for great people.</span></h1><p className="mt-6 text-sm leading-6 text-[#777772]">Sign in with your AWS LPU account to access the interview scheduling workspace.</p></div>
        {message && <p className="mt-6 border-l-2 border-[#f48120] bg-[#fff0e2] px-3 py-3 text-xs leading-5 text-[#765437]">{message}</p>}
        <a href="/api/auth/login" className="mt-8 flex h-12 items-center justify-between bg-[#151515] px-5 text-sm font-medium text-white transition-colors duration-300 hover:bg-[#f48120] hover:text-[#151515]">Continue with AWS LPU SSO <span>→</span></a>
        <Link href="/" className="mt-6 block text-center text-xs text-[#9b9b96] hover:text-[#151515]">Back to home</Link>
      </section>
    </main>
  );
}
