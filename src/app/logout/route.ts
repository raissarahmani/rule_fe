import { NextRequest, NextResponse } from "next/server";
import { readSession, sameOrigin, settings } from "@/lib/server/oidc";
import { clearCookie, LOGIN_COOKIE, SESSION_COOKIE } from "@/lib/server/session";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const config = settings();
  const session = readSession(request.cookies);
  const url = new URL(config.logout);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("post_logout_redirect_uri", config.portal);
  if (session) url.searchParams.set("id_token_hint", session.idToken);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  clearCookie(response.cookies, SESSION_COOKIE);
  clearCookie(response.cookies, LOGIN_COOKIE);
  for (const cookie of request.cookies.getAll()) {
    if (/^__Secure-rule-login-[A-Za-z0-9_-]{1,128}$/.test(cookie.name)) clearCookie(response.cookies, cookie.name);
  }
  return response;
}
