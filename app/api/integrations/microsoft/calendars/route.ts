import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { microsoftGraphRequest } from "@/lib/integrations/calendar/microsoft-client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await microsoftGraphRequest(user.id, "/me/calendars");
    if (!result) return NextResponse.json({ data: [] });
    
    const calendars = result.value.map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      isDefault: c.isDefaultCalendar,
      timeZone: c.defaultOnlineMeetingProvider
    }));
    return NextResponse.json({ data: calendars });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
