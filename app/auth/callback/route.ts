import { NextRequest, NextResponse } from "next/server";
import { clearOauthCookies, exchangeCode, getOauthCookies, setSession } from "@/lib/auth/oauth";
import { getProvisionedProfile } from "@/lib/db/profiles";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const error = params.get("error");
  const code = params.get("code");
  const returnedState = params.get("state");
  const oauth = await getOauthCookies();

  if (error || !code || !returnedState || !oauth.state || returnedState !== oauth.state || !oauth.verifier || !oauth.nonce) {
    return NextResponse.redirect(new URL("/login?error=invalid_callback", request.url));
  }

  try {
    const result = await exchangeCode(code, oauth.verifier, oauth.nonce);
    await getProvisionedProfile(result.user);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    setSession(response, result.accessToken, result.expiresIn);
    clearOauthCookies(response);
    return response;
  } catch (error) {
    console.error("Calendly SSO callback failed:", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown authentication error");
    return NextResponse.redirect(new URL("/login?error=authentication_failed", request.url));
  }
}
