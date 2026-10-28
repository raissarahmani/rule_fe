import { NextResponse } from "next/server";
import { settings } from "@/lib/server/oidc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  try {
    settings();
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("OIDC readiness failed:", error instanceof Error ? error.message : "Invalid server configuration");
    return NextResponse.json({ status: "error", error: "Server OIDC configuration is missing or invalid." }, { status: 503 });
  }
}
