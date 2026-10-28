import { NextRequest, NextResponse } from "next/server";
import { authorizedSession, sameOrigin } from "@/lib/server/oidc";
import { AuthenticationError } from "@/lib/server/user-info";
import { canAccessApi } from "@/lib/permissions";
import { clearCookie, SESSION_COOKIE } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context) {
      const mutating = !["GET", "HEAD"].includes(request.method);
      if (mutating && !sameOrigin(request))
            return NextResponse.json(
                  { error: "Invalid request origin" },
                  { status: 403 },
            );
      let session;
      try {
            session = await authorizedSession(request.cookies);
      } catch (error) {
            const status =
                  error instanceof AuthenticationError ? error.status : 503;
            const response = NextResponse.json(
                  { error: "Request could not be authorized" },
                  { status, headers: { "Cache-Control": "no-store" } },
            );
            if (status === 401) clearCookie(response.cookies, SESSION_COOKIE);
            return response;
      }
      const { path } = await context.params;
      if (
            path.some(
                  (segment) =>
                        !segment ||
                        segment === "." ||
                        segment === ".." ||
                        /[\x00-\x1f/\\?#%]/.test(segment),
            )
      ) {
            return NextResponse.json(
                  { error: "Invalid backend path" },
                  { status: 400 },
            );
      }
      if (
            !canAccessApi(
                  session.user,
                  request.method,
                  path,
                  request.nextUrl.searchParams,
            )
      ) {
            return NextResponse.json(
                  { error: "You do not have permission for this operation." },
                  { status: 403, headers: { "Cache-Control": "no-store" } },
            );
      }
      try {
            const base = process.env.RULE_API_URL
                  ? new URL(
                          process.env.RULE_API_PREFIX || "/api/v1/",
                          process.env.RULE_API_URL,
                    )
                  : new URL(process.env.NEXT_PUBLIC_BASE_URL || "");
            if (
                  !["http:", "https:"].includes(base.protocol) ||
                  base.username ||
                  base.password
            )
                  throw new Error("Invalid backend URL");
            base.pathname =
                  base.pathname.replace(/\/$/, "") +
                  "/" +
                  path.map(encodeURIComponent).join("/");
            base.search = request.nextUrl.search;
            const headers = new Headers({
                  Authorization: `Bearer ${session.accessToken}`,
            });
            for (const name of ["accept", "content-type"]) {
                  const value = request.headers.get(name);
                  if (value) headers.set(name, value);
            }
            const upstream = await fetch(base, {
                  method: request.method,
                  headers,
                  body: mutating ? await request.arrayBuffer() : undefined,
                  cache: "no-store",
                  redirect: "error",
                  signal: AbortSignal.timeout(30000),
            });
            const responseHeaders = new Headers({
                  "Cache-Control": "no-store",
            });
            for (const name of ["content-type", "content-disposition"]) {
                  const value = upstream.headers.get(name);
                  if (value) responseHeaders.set(name, value);
            }
            return new NextResponse(upstream.body, {
                  status: upstream.status,
                  headers: responseHeaders,
            });
      } catch {
            return NextResponse.json(
                  {
                        error: "Backend request failed. Check server API routing and connectivity.",
                  },
                  { status: 502 },
            );
      }
}

export {
      forward as GET,
      forward as HEAD,
      forward as POST,
      forward as PUT,
      forward as PATCH,
      forward as DELETE,
};
