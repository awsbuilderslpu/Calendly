import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const database = createDatabaseAdmin();
  
  const { data: google } = await database.from("google_calendar_connections").select("email").eq("user_id", user.id).maybeSingle();
  const { data: microsoft } = await database.from("microsoft_calendar_connections").select("email").eq("user_id", user.id).maybeSingle();
  const { data: prefs } = await database.from("notification_preferences").select("whatsapp_enabled").eq("user_id", user.id).maybeSingle();

  return NextResponse.json({
    google: { connected: !!google, email: google?.email },
    microsoft: { connected: !!microsoft, email: microsoft?.email },
    whatsapp: { enabled: !!prefs?.whatsapp_enabled }
  });
}
