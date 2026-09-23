import AppNav from "@/components/layout/app-nav";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { listScorecards } from "@/lib/db/scorecards";

export default async function ScorecardsPage() {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return <><AppNav /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-4xl font-semibold">Unauthorized</h1></main></>;

  const scorecards = await listScorecards();

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold mb-8">Scorecards</h1>
        <div className="space-y-4">
          {scorecards.map((sc) => (
            <div key={sc.id} className="border p-4 bg-white">
              <h2 className="text-xl font-medium">{sc.name}</h2>
              <p className="text-sm text-gray-500">Version {sc.version} • {sc.is_active ? "Active" : "Inactive"}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
