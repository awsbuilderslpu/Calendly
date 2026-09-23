import { NextResponse } from "next/server";
import { createOauthRequest, setOauthCookies } from "@/lib/auth/oauth";

export async function GET() {
  try {
    const oauth = createOauthRequest();
    const response = NextResponse.redirect(oauth.url);
    setOauthCookies(response, oauth.state, oauth.nonce, oauth.verifier);
    return response;
  } catch {
    return NextResponse.json({ error: "SSO is not configured." }, { status: 500 });
  }
}
