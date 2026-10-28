import "server-only";
import * as oidc from "openid-client";
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from "jose";
import { AuthenticationError, userInfoProfile } from "./user-info";
import type { RuleMenu } from "@/lib/permissions";
import { type CookieReader, readEncryptedCookie, SESSION_COOKIE } from "./session";

export type OIDCUser = {
  id: string; username: string; name: string; email: string;
  branch: string; level: string; groups: string[]; roles: string[]; primaryRole: string;
  profile: string[]; menus: RuleMenu[];
};
export type Session = { accessToken: string; idToken: string; user: OIDCUser; issuer: string; clientId: string };
export type LoginAttempt = { state: string; nonce: string; verifier: string; returnTo: string };

export function loginDiagnostic(error: unknown, stage: string) {
  const details = error && typeof error === "object" ? error as { code?: unknown; cause?: { error?: unknown } } : undefined;
  const code = error instanceof AuthenticationError ? "AUTHORIZATION_REJECTED"
    : typeof details?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(details.code) ? details.code : "OIDC_CALLBACK_FAILED";
  const providerError = details?.cause?.error;
  return {
    stage, code,
    status: error instanceof AuthenticationError ? error.status : 401,
    // Only locally authored AuthenticationError messages; never arbitrary provider text.
    reason: error instanceof AuthenticationError ? error.message : undefined,
    menuSchema: error instanceof AuthenticationError ? error.menuSchema : undefined,
    providerError: typeof providerError === "string" && ["invalid_client", "invalid_grant", "invalid_scope", "unauthorized_client", "access_denied", "server_error", "temporarily_unavailable"].includes(providerError) ? providerError : undefined,
  };
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for server-side OIDC`);
  return value;
}

export function settings() {
  const issuer = new URL(required("OIDC_ISSUER"));
  const redirect = new URL(required("OIDC_REDIRECT_URI"));
  if (issuer.protocol !== "https:" || redirect.protocol !== "https:") {
    throw new Error("OIDC issuer and redirect URI must use public HTTPS URLs");
  }
  if (redirect.pathname !== "/rule/callback" || redirect.search || redirect.hash) {
    throw new Error("OIDC_REDIRECT_URI must end in /rule/callback without query or fragment");
  }
  const secret = required("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  const allowHttp = process.env.OIDC_ALLOW_HTTP === "true";
  const protocol = issuer.href.replace(/\/$/, "") + "/protocol/openid-connect";
  const token = new URL(process.env.OIDC_TOKEN_ENDPOINT || `${protocol}/token`);
  const jwks = new URL(process.env.OIDC_JWKS_URI || token.href.replace(/\/token$/, "/certs"));
  const userinfo = new URL(process.env.OIDC_USERINFO_ENDPOINT || `${protocol}/userinfo`);
  for (const endpoint of [token, jwks, userinfo]) {
    if (endpoint.username || endpoint.password || endpoint.hash ||
        (endpoint.protocol !== "https:" && !(allowHttp && endpoint.protocol === "http:"))) {
      throw new Error("OIDC endpoints require HTTPS, or explicit OIDC_ALLOW_HTTP=true for internal HTTP");
    }
  }
  const logout = new URL(process.env.OIDC_LOGOUT_ENDPOINT || `${protocol}/logout`, issuer.origin);
  if (logout.origin !== issuer.origin || logout.protocol !== "https:") throw new Error("Logout must use the public issuer origin");
  // Accept the legacy relative /protocol/... setting under the configured realm.
  if (logout.pathname.startsWith("/protocol/")) logout.pathname = issuer.pathname.replace(/\/$/, "") + logout.pathname;
  const portal = new URL(process.env.PORTAL_URL || redirect.origin);
  if (portal.origin !== redirect.origin) throw new Error("PORTAL_URL must share the public app origin");
  return {
    issuer: issuer.href.replace(/\/$/, ""), redirect, secret, allowHttp,
    clientId: required("OIDC_CLIENT_ID"), clientSecret: required("OIDC_CLIENT_SECRET"),
    token: token.href, jwks: jwks.href, userinfo: userinfo.href,
    authorization: `${protocol}/auth`, logout: logout.href, portal: portal.href,
    audience: process.env.OIDC_TOKEN_AUDIENCE?.trim() || required("OIDC_CLIENT_ID"),
  };
}

export function configuration() {
  const config = settings();
  const client = new oidc.Configuration({
    issuer: config.issuer,
    authorization_endpoint: config.authorization,
    token_endpoint: config.token,
    jwks_uri: config.jwks,
    userinfo_endpoint: config.userinfo,
    end_session_endpoint: config.logout,
    id_token_signing_alg_values_supported: ["RS256"],
  }, config.clientId, config.clientSecret);
  if (config.allowHttp) oidc.allowInsecureRequests(client);
  oidc.enableNonRepudiationChecks(client);
  client.timeout = 15;
  return client;
}

export function returnPath(value: string | null) {
  if (!value || /[\\\r\n]/.test(value)) return "/rule/home";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || !/^\/rule\/(home(?:\/|$)|otorisasi(?:\/|$)|log-activity(?:\/|$))/.test(url.pathname)) {
      return "/rule/home";
    }
    return url.pathname + url.search;
  } catch { return "/rule/home"; }
}

export function readSession(cookies: CookieReader) {
  const config = settings();
  const session = readEncryptedCookie<Session>(cookies, SESSION_COOKIE, config.secret);
  return session?.issuer === config.issuer && session.clientId === config.clientId ? session : null;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === settings().redirect.origin;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function userProfile(claims: Record<string, unknown>): OIDCUser {
  const text = (name: string) => typeof claims[name] === "string" ? claims[name] as string : "";
  const realm = claims.realm_access as { roles?: unknown } | undefined;
  const clients = claims.resource_access as Record<string, { roles?: unknown }> | undefined;
  const roles = [...new Set([...strings(claims.roles), ...strings(realm?.roles), ...strings(clients?.[settings().clientId]?.roles)])];
  return {
    id: text("sub"), username: text("preferred_username"), name: text("name"), email: text("email"),
    branch: text("branch"), level: text("level"), groups: strings(claims.groups), roles, primaryRole: roles[0] || "",
    profile: [], menus: [],
  };
}

let keyCache: { url: string; keys: ReturnType<typeof createRemoteJWKSet> } | undefined;

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const config = settings();
  if (keyCache?.url !== config.jwks) keyCache = { url: config.jwks, keys: createRemoteJWKSet(new URL(config.jwks), { timeoutDuration: 10000 }) };
  try {
    const { payload } = await jwtVerify(token, keyCache.keys, {
      issuer: config.issuer, audience: config.audience, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat"],
    });
    if (!payload.sub) throw new AuthenticationError(401, "Missing access-token subject");
    return payload;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    if (error instanceof errors.JOSEError && error.code !== "ERR_JWKS_TIMEOUT") {
      const claim = error instanceof errors.JWTClaimValidationFailed && ["aud", "iss", "sub", "exp", "iat", "nbf"].includes(error.claim) ? `; claim=${error.claim}` : "";
      throw new AuthenticationError(401, `Access token rejected: ${error.code}${claim}`);
    }
    throw new AuthenticationError(503, "Keycloak signing keys are unavailable");
  }
}

async function authorizedUser(accessToken: string, expectedSubject: string) {
  const claims = await verifyAccessToken(accessToken);
  if (claims.sub !== expectedSubject) throw new AuthenticationError(401, "OIDC token subjects do not match");
  let response: Response;
  try {
    response = await fetch(settings().userinfo, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch { throw new AuthenticationError(503, "UserInfo is unavailable"); }
  if (!response.ok) throw new AuthenticationError(response.status === 401 ? 401 : response.status === 403 ? 403 : 502, `UserInfo request failed: HTTP ${response.status}`);
  let body: unknown;
  try { body = await response.json(); } catch { throw new AuthenticationError(502, "Invalid UserInfo JSON"); }
  const profile = userInfoProfile(body, claims.sub!, typeof claims.preferred_username === "string" ? claims.preferred_username : undefined);
  return { ...userProfile(claims), ...profile };
}

export async function authorizedSession(cookies: CookieReader) {
  const session = readSession(cookies);
  if (!session) throw new AuthenticationError(401, "Authentication required");
  // Recheck live grants: account disabling and menu removal apply to the next server request.
  return { ...session, user: await authorizedUser(session.accessToken, session.user.id) };
}

export async function completeLogin(callback: URL, attempt: LoginAttempt) {
  const config = settings();
  const tokens = await oidc.authorizationCodeGrant(configuration(), callback, {
    expectedState: attempt.state, expectedNonce: attempt.nonce, pkceCodeVerifier: attempt.verifier, idTokenExpected: true,
  }, config.audience ? { audience: config.audience } : undefined);
  const claims = tokens.claims();
  if (!claims || !tokens.id_token || !tokens.access_token || tokens.token_type.toLowerCase() !== "bearer") {
    throw new Error("OIDC did not return the required bearer and ID tokens");
  }
  const maxAge = Math.min(tokens.expiresIn() || 0, claims.exp - Math.floor(Date.now() / 1000), 8 * 60 * 60);
  if (maxAge <= 0) throw new Error("OIDC returned expired tokens");
  // shortcut: sessions expire with the access token, add refresh rotation when uninterrupted long sessions are required.
  const user = await authorizedUser(tokens.access_token, claims.sub);
  return { session: { accessToken: tokens.access_token, idToken: tokens.id_token, user, issuer: config.issuer, clientId: config.clientId }, maxAge };
}
