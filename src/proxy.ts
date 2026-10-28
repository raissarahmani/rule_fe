import { NextRequest, NextResponse } from "next/server";
import { authorizedSession, returnPath, settings } from "@/lib/server/oidc";
import { AuthenticationError } from "@/lib/server/user-info";
import { canAccessRoute } from "@/lib/permissions";

export async function proxy(request: NextRequest) {
  try {
    const session = await authorizedSession(request.cookies);
    if (!canAccessRoute(session.user, request.nextUrl.pathname)) {
      return NextResponse.json({ error: "You do not have access to this Rule Treasury menu." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (!(error instanceof AuthenticationError) || error.status !== 401) {
      return NextResponse.json({ error: "Rule Treasury access could not be authorized." }, {
        status: error instanceof AuthenticationError ? error.status : 503, headers: { "Cache-Control": "no-store" },
      });
    }
    const login = new URL("/rule/login", settings().redirect.origin);
    login.searchParams.set("returnTo", returnPath(request.nextUrl.pathname.startsWith("/rule/")
      ? request.nextUrl.pathname + request.nextUrl.search
      : "/rule" + request.nextUrl.pathname + request.nextUrl.search));
    const response = NextResponse.redirect(login);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

export const config = { matcher: ["/home/:path*", "/otorisasi/:path*", "/log-activity/:path*"] };
