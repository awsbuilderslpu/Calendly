import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { retryNotification } from "@/lib/notifications/service";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  
  try {
    const p = await params;
    await retryNotification(p.id);
    await processPendingNotifications();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 400 });
  }
}
