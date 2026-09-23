export const publicConfig = {
  authorizeUrl: process.env.NEXT_PUBLIC_AUTHORIZATION_URL || "http://localhost:3000/api/oauth/authorize",
  authorizationUrl: process.env.NEXT_PUBLIC_AUTHORIZATION_URL || "http://localhost:3000/api/oauth/authorize",
  tokenUrl: process.env.NEXT_PUBLIC_TOKEN_URL || "http://localhost:3000/api/oauth/token",
  userinfoUrl: process.env.NEXT_PUBLIC_USERINFO_URL || "http://localhost:3000/api/oauth/userinfo",
  clientId: process.env.NEXT_PUBLIC_CLIENT_ID || "calendly-client-id",
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3001/auth/callback",
  jwksUrl: process.env.NEXT_PUBLIC_JWKS_URL || "http://localhost:3000/api/oauth/jwks",
  ssoIssuer: process.env.NEXT_PUBLIC_SSO_ISSUER || "http://localhost:3000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"
};

export const serverConfig = {
  clientSecret: process.env.CLIENT_SECRET || "calendly-client-secret",
};

export function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
    encryptionKey: process.env.ENCRYPTION_KEY || "01234567890123456789012345678901"
  };
}

export function getRecruitmentIntegrationSecret() {
  return process.env.RECRUITMENT_SECRET || "recruitment-secret";
}

export function getSchedulingLinkExpiryDays() {
  return Number(process.env.SCHEDULING_LINK_EXPIRY_DAYS) || 7;
}

export function getSsoClientConfig() {
  return {
    clientId: publicConfig.clientId,
    clientSecret: serverConfig.clientSecret,
    authorizationUrl: publicConfig.authorizationUrl,
    authorizeUrl: publicConfig.authorizeUrl,
    tokenUrl: publicConfig.tokenUrl,
    userinfoUrl: publicConfig.userinfoUrl,
    redirectUri: publicConfig.redirectUri,
    jwksUrl: publicConfig.jwksUrl,
    ssoIssuer: publicConfig.ssoIssuer
  };
}

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

// Phase 12: Production Environment Validation
export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CLIENT_SECRET"
  ];

  for (const req of required) {
    if (!process.env[req]) {
      throw new Error(`CRITICAL: Missing required production environment variable: ${req}`);
    }
  }
}
