import { google } from "googleapis";
import crypto from "node:crypto";
import { getGoogleConfig } from "@/lib/config/env";

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"];
const stateCookie = "calendly_google_oauth_state";

export function createGoogleClient() {
  const config = getGoogleConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function googleAuthorizationUrl() {
  const state = crypto.randomBytes(32).toString("base64url");
  const url = createGoogleClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: GOOGLE_SCOPES, state });
  return { url, state, cookie: stateCookie };
}

export function getGoogleStateCookieName() {
  return stateCookie;
}
