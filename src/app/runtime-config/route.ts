import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  // Tokens and backend URLs stay on the server; browser requests use the same origin.
  return NextResponse.json({ apiBaseUrl: "/rule/api/backend" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
