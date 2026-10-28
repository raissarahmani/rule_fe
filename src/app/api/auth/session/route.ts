import { NextRequest, NextResponse } from "next/server";
import { authorizedSession } from "@/lib/server/oidc";
import { AuthenticationError } from "@/lib/server/user-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await authorizedSession(request.cookies);
    return NextResponse.json({ user: session.user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Session could not be authorized" }, {
      status: error instanceof AuthenticationError ? error.status : 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
