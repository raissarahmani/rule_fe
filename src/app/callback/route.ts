import { NextRequest, NextResponse } from "next/server";
import { completeLogin, loginDiagnostic, type LoginAttempt, returnPath, settings } from "@/lib/server/oidc";
import { clearCookie, loginCookie, readEncryptedCookie, SESSION_COOKIE, writeEncryptedCookie } from "@/lib/server/session";
import { AuthenticationError } from "@/lib/server/user-info";
import { canAccessRoute, ruleMenus, type RuleMenu } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let flowCookie: string | undefined;
  let validatedAttempt = false;
  let stage = "configuration";
  try {
    const config = settings();
    stage = "login_transaction";
    const state = request.nextUrl.searchParams.get("state") || "";
    flowCookie = loginCookie(state);
    const attempt = readEncryptedCookie<LoginAttempt>(request.cookies, flowCookie, config.secret);
    if (!attempt || attempt.state !== state) throw new AuthenticationError(401, "Missing or expired login transaction cookie");
    validatedAttempt = true;
    stage = "code_exchange_and_authorization";
    // Reconstruct the trusted public callback URL instead of trusting proxy Host headers.
    const callback = new URL(config.redirect);
    callback.search = request.nextUrl.search;
    const { session, maxAge } = await completeLogin(callback, attempt);
    const destinations: Record<RuleMenu, string> = {
      home: "/rule/home", limit: "/rule/home/limit", underlying: "/rule/home/underly", rate: "/rule/home/rate",
      approvals: "/rule/otorisasi/list", history: "/rule/otorisasi/history", activity: "/rule/log-activity",
    };
    const requested = returnPath(attempt.returnTo);
    const destination = canAccessRoute(session.user, requested) ? requested : destinations[(Object.keys(ruleMenus) as RuleMenu[]).find(menu => session.user.menus.includes(menu))!];
    const response = NextResponse.redirect(new URL(destination, config.redirect.origin));
    response.headers.set("Cache-Control", "no-store");
    clearCookie(response.cookies, flowCookie);
    stage = "session_cookie";
    writeEncryptedCookie(response.cookies, SESSION_COOKIE, session, config.secret, maxAge);
    return response;
  } catch (error) {
    console.error("OIDC callback rejected:", loginDiagnostic(error, stage));
    const response = NextResponse.json({ error: "OIDC login failed. Check Keycloak identity and Rule Treasury module/menu access." }, { status: error instanceof AuthenticationError ? error.status : 401 });
    if (flowCookie) clearCookie(response.cookies, flowCookie);
    if (validatedAttempt) clearCookie(response.cookies, SESSION_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
