import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import crypto from "node:crypto";
import { getSsoClientConfig, publicConfig } from "@/lib/config/env";
import type { SsoUser } from "@/types/user";

export const SESSION_COOKIE = "calendly_access_token";
const STATE_COOKIE = "calendly_oauth_state";
const NONCE_COOKIE = "calendly_oauth_nonce";
const VERIFIER_COOKIE = "calendly_pkce_verifier";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function base64url(value: Buffer) {
  return value.toString("base64url");
}

export function createOauthRequest() {
  const state = base64url(crypto.randomBytes(32));
  const nonce = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const { clientId, redirectUri } = getSsoClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return { state, nonce, verifier, url: `${publicConfig.authorizeUrl}?${params}` };
}

export function setOauthCookies(response: NextResponse, state: string, nonce: string, verifier: string) {
  response.cookies.set(STATE_COOKIE, state, { ...COOKIE_OPTIONS, maxAge: 600 });
  response.cookies.set(NONCE_COOKIE, nonce, { ...COOKIE_OPTIONS, maxAge: 600 });
  response.cookies.set(VERIFIER_COOKIE, verifier, { ...COOKIE_OPTIONS, maxAge: 600 });
}

export async function getOauthCookies() {
  const store = await cookies();
  return {
    state: store.get(STATE_COOKIE)?.value,
    nonce: store.get(NONCE_COOKIE)?.value,
    verifier: store.get(VERIFIER_COOKIE)?.value,
  };
}

export function clearOauthCookies(response: NextResponse) {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(NONCE_COOKIE);
  response.cookies.delete(VERIFIER_COOKIE);
}

export async function exchangeCode(code: string, verifier: string, nonce: string) {
  const { clientId, clientSecret, redirectUri } = getSsoClientConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenResponse = await fetch(publicConfig.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) throw new Error("SSO token exchange failed");
  const tokens = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; id_token?: string };
  if (!tokens.access_token) throw new Error("SSO did not return an access token");

  if (!tokens.id_token) throw new Error("SSO did not return an ID token");
  const jwks = createRemoteJWKSet(new URL(publicConfig.jwksUrl));
  const verifiedIdToken = await jwtVerify(tokens.id_token, jwks, {
    issuer: publicConfig.ssoIssuer,
    audience: clientId,
  });
  if (verifiedIdToken.payload.nonce !== nonce) {
    throw new Error("SSO ID token nonce validation failed");
  }

  const userResponse = await fetch(publicConfig.userinfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  if (!userResponse.ok) throw new Error("SSO user information request failed");
  const user = (await userResponse.json()) as Partial<SsoUser>;
  if (typeof user.sub !== "string" || typeof user.name !== "string" || typeof user.email !== "string") {
    throw new Error("SSO returned an invalid user profile");
  }

  return {
    accessToken: tokens.access_token,
    expiresIn: Number(tokens.expires_in) || 60 * 60 * 24 * 30,
    user: { sub: user.sub, name: user.name, email: user.email, picture: user.picture, role: user.role },
  };
}

export function setSession(response: NextResponse, accessToken: string, maxAge: number) {
  response.cookies.set(SESSION_COOKIE, accessToken, { ...COOKIE_OPTIONS, maxAge });
}
