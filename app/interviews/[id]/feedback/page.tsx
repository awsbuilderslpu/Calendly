import AppNav from "@/components/layout/app-nav";
import { getCurrentUser } from "@/lib/auth/server";
import { getFeedbackForInterviewer } from "@/lib/db/feedback";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Unauthorized</h1></main></>;

  const { id } = await params;
  let feedback = null;
  let errorMsg = null;
  
  try {
    feedback = await getFeedbackForInterviewer(id, user.id);
  } catch (err: unknown) {
    errorMsg = (err instanceof Error ? err.message : String(err));
  }

  if (errorMsg) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-2xl font-semibold text-red-600">{errorMsg}</h1></main></>;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold mb-8">Interview Feedback</h1>
        <div className="border p-6 bg-white space-y-4">
          <p><strong>Status:</strong> {feedback?.status}</p>
          <p><strong>Overall Rating:</strong> {feedback?.overall_rating || "None"}</p>
          <p><strong>Recommendation:</strong> {feedback?.recommendation || "None"}</p>
        </div>
      </main>
    </>
  );
}
