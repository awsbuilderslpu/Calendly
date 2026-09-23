import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI!;
  
  const scopes = "openid profile email offline_access Calendars.ReadWrite";
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${user.id}`;
  
  return NextResponse.redirect(authUrl);
}
