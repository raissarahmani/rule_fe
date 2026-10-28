import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { configuration, returnPath, settings } from "@/lib/server/oidc";
import { loginCookie, writeEncryptedCookie } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = settings();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const url = oidc.buildAuthorizationUrl(configuration(), {
      redirect_uri: config.redirect.href, scope: "openid profile email", state, nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256",
    });
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    writeEncryptedCookie(response.cookies, loginCookie(state), {
      state, nonce, verifier, returnTo: returnPath(request.nextUrl.searchParams.get("returnTo")),
    }, config.secret, 300);
    return response;
  } catch {
    return NextResponse.json({ error: "OIDC login is unavailable. Check the server OIDC configuration." }, { status: 503 });
  }
}
