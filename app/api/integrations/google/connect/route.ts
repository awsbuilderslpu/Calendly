import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { googleAuthorizationUrl, getGoogleStateCookieName } from "@/lib/integrations/google-calendar/oauth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const auth = googleAuthorizationUrl();
    const response = NextResponse.redirect(auth.url);
    response.cookies.set(getGoogleStateCookieName(), auth.state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch { return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 }); }
}
