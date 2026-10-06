import { NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { status } = await request.json();
    const id = (await context.params).id;
    const db = createDatabaseAdmin();
    const { error } = await db.from("interviews").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
