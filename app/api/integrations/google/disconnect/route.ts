import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";
import { writeAudit } from "@/lib/db/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  await createDatabaseAdmin().from("google_calendar_connections").delete().eq("user_id", user.id);
  await writeAudit(user.email, "GOOGLE_CALENDAR_DISCONNECTED", "google_calendar_connection", user.id);
  return NextResponse.json({ success: true });
}
