const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { generateKeyPairSync, sign } = require("node:crypto");
const { test } = require("node:test");
const { NextRequest, NextResponse } = require("next/server");
const { loadServer } = require("./helpers/load-server.cjs");
const { userInfo } = require("./helpers/user-info.cjs");
const session = loadServer("src/lib/server/session.ts");
const auth = loadServer("src/lib/server/oidc.ts");
const secret = "test-session-secret-with-at-least-32-characters";

function environment(t, overrides = {}) {
  const values = {
    OIDC_ISSUER: "https://portal.example/auth/realms/remittance",
    OIDC_REDIRECT_URI: "https://portal.example/rule/callback",
    OIDC_CLIENT_ID: "rule", OIDC_CLIENT_SECRET: "test-client-secret",
    OIDC_TOKEN_ENDPOINT: "http://keycloak:8080/auth/realms/remittance/protocol/openid-connect/token",
    OIDC_ALLOW_HTTP: "true", SESSION_SECRET: secret,
    PORTAL_URL: "https://portal.example", OIDC_LOGOUT_ENDPOINT: "/protocol/openid-connect/logout",
    ...overrides,
  };
  const previous = Object.fromEntries(Object.keys(values).map(name => [name, process.env[name]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
}

test("encrypted cookies reject tampering, expiry, and use for another purpose", () => {
  const encrypted = session.seal({ token: "private-token" }, "login", secret, 300);
  assert.equal(encrypted.includes("private-token"), false);
  assert.deepEqual(session.unseal(encrypted, "login", secret), { token: "private-token" });
  assert.equal(session.unseal(encrypted, "session", secret), null);
  const altered = Buffer.from(encrypted, "base64url");
  altered[30] ^= 1;
  assert.equal(session.unseal(altered.toString("base64url"), "login", secret), null);
  assert.equal(session.unseal(session.seal({}, "login", secret, -1), "login", secret), null);
});

test("large sessions use secure HttpOnly cookie chunks and remove stale chunks", () => {
  const response = NextResponse.json({});
  const data = { token: "x".repeat(7000) };
  session.writeEncryptedCookie(response.cookies, session.SESSION_COOKIE, data, secret, 300);
  assert.deepEqual(session.readEncryptedCookie(response.cookies, session.SESSION_COOKIE, secret), data);
  for (const cookie of response.cookies.getAll().filter(cookie => cookie.maxAge > 0)) {
    assert.ok(cookie.value.length <= 3500);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, "lax");
    assert.equal(cookie.path, "/rule");
  }
  session.writeEncryptedCookie(response.cookies, session.SESSION_COOKIE, { token: "small" }, secret, 300);
  assert.deepEqual(session.readEncryptedCookie(response.cookies, session.SESSION_COOKIE, secret), { token: "small" });
});

test("OIDC uses public issuer and callback with internal token and signing-key endpoints", (t) => {
  environment(t);
  const config = auth.settings();
  assert.equal(config.issuer, "https://portal.example/auth/realms/remittance");
  assert.equal(config.redirect.href, "https://portal.example/rule/callback");
  assert.equal(config.jwks, "http://keycloak:8080/auth/realms/remittance/protocol/openid-connect/certs");
  assert.equal(config.logout, "https://portal.example/auth/realms/remittance/protocol/openid-connect/logout");
  process.env.OIDC_ALLOW_HTTP = "false";
  assert.throws(() => auth.settings(), /OIDC endpoints require HTTPS/);
});

test("return paths stay inside protected Rule pages", () => {
  assert.equal(auth.returnPath("/rule/home/limit?tab=all"), "/rule/home/limit?tab=all");
  for (const value of ["https://evil.example", "//evil.example", "/rule/callback", "/rule/home/../../logout", "/rule/home\\evil"]) {
    assert.equal(auth.returnPath(value), "/rule/home");
  }
});

test("runtime TLS compatibility setting matches Remittance without rejecting readiness", (t) => {
  environment(t, { NODE_TLS_REJECT_UNAUTHORIZED: "0" });
  assert.equal(auth.settings().clientId, "rule");
  const health = loadServer("src/app/health/route.ts");
  assert.equal(health.GET().status, 200);
});

test("sessions cannot be reused after changing the issuer or client", (t) => {
  environment(t);
  const response = NextResponse.json({});
  session.writeEncryptedCookie(response.cookies, session.SESSION_COOKIE, {
    issuer: process.env.OIDC_ISSUER, clientId: "rule", user: { id: "user-123" }, accessToken: "private-token",
  }, secret, 300);
  assert.equal(auth.readSession(response.cookies).user.id, "user-123");
  process.env.OIDC_CLIENT_ID = "another-client";
  assert.equal(auth.readSession(response.cookies), null);
});

async function provider(t, scenario) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test", alg: "RS256", use: "sig" };
  let exchanges = 0;
  let profile = userInfo();
  let accessToken;
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url.endsWith("/certs")) return response.end(JSON.stringify({ keys: [jwk] }));
    if (request.url === "/userinfo") {
      assert.equal(request.headers.authorization, `Bearer ${accessToken}`);
      return response.end(JSON.stringify(profile));
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const parameters = new URLSearchParams(body);
    assert.equal(parameters.get("code_verifier"), "test-pkce-verifier");
    assert.equal(parameters.get("client_id"), "rule");
    assert.equal(parameters.get("client_secret"), "test-client-secret");
    assert.equal(parameters.get("redirect_uri"), "https://portal.example/rule/callback");
    exchanges++;
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: scenario === "wrong-issuer" ? "https://evil.example" : process.env.OIDC_ISSUER,
      aud: scenario === "wrong-audience" ? "another-client" : "rule",
      sub: "user-123", preferred_username: "tester", name: "Test User", iat: now, exp: now + 300,
      nonce: scenario === "wrong-nonce" ? "wrong" : "test-nonce",
    };
    const input = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test" })).toString("base64url") + "." +
      Buffer.from(JSON.stringify(claims)).toString("base64url");
    const signingKey = scenario === "bad-signature" ? generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey : privateKey;
    const idToken = input + "." + sign("RSA-SHA256", Buffer.from(input), signingKey).toString("base64url");
    const accessInput = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test" })).toString("base64url") + "." +
      Buffer.from(JSON.stringify({
        ...claims, nonce: undefined,
        aud: scenario === "access-wrong-audience" ? "wrong" : "rule",
        iss: scenario === "access-wrong-issuer" ? "https://evil.example" : process.env.OIDC_ISSUER,
        sub: scenario === "access-wrong-subject" ? "other-user" : "user-123",
        exp: scenario === "access-expired" ? now - 10 : now + 300,
      })).toString("base64url");
    const accessKey = scenario === "access-bad-signature" ? generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey : privateKey;
    accessToken = accessInput + "." + sign("RSA-SHA256", Buffer.from(accessInput), accessKey).toString("base64url");
    response.end(JSON.stringify({ access_token: accessToken, id_token: idToken, token_type: "Bearer", expires_in: 300 }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoint = `http://127.0.0.1:${server.address().port}/token`;
  environment(t, { OIDC_TOKEN_ENDPOINT: endpoint, OIDC_USERINFO_ENDPOINT: endpoint.replace(/token$/, "userinfo") });
  return { exchanges: () => exchanges, setUserInfo: value => { profile = value; } };
}

test("authorization code grant validates ID signature and returns a server session", async (t) => {
  await provider(t, "valid");
  const result = await auth.completeLogin(new URL("https://portal.example/rule/callback?code=test-code&state=test-state"), {
    state: "test-state", nonce: "test-nonce", verifier: "test-pkce-verifier", returnTo: "/rule/home",
  });
  assert.equal(result.session.user.id, "user-123");
  assert.equal(result.session.accessToken.split(".").length, 3);
  assert.equal(result.session.user.level, "1");
  assert.equal(result.session.user.menus.includes("approvals"), false);
  assert.ok(result.maxAge > 0 && result.maxAge <= 300);
});

for (const scenario of ["wrong-nonce", "wrong-issuer", "wrong-audience", "bad-signature", "wrong-state", "access-wrong-audience", "access-wrong-issuer", "access-wrong-subject", "access-expired", "access-bad-signature"]) {
  test(`authorization code grant rejects ${scenario}`, async (t) => {
    const fixture = await provider(t, scenario);
    await assert.rejects(() => auth.completeLogin(new URL(`https://portal.example/rule/callback?code=test-code&state=${scenario === "wrong-state" ? "attacker" : "test-state"}`), {
      state: "test-state", nonce: "test-nonce", verifier: "test-pkce-verifier", returnTo: "/rule/home",
    }));
    if (scenario === "wrong-state") assert.equal(fixture.exchanges(), 0);
  });
}

test("live UserInfo revocation rejects a previously valid session", async (t) => {
  const fixture = await provider(t, "valid");
  const result = await auth.completeLogin(new URL("https://portal.example/rule/callback?code=test-code&state=test-state"), {
    state: "test-state", nonce: "test-nonce", verifier: "test-pkce-verifier", returnTo: "/rule/home",
  });
  const response = NextResponse.json({});
  session.writeEncryptedCookie(response.cookies, session.SESSION_COOKIE, result.session, secret, result.maxAge);
  assert.equal((await auth.authorizedSession(response.cookies)).user.id, "user-123");
  fixture.setUserInfo(userInfo({ isAktif: 0 }));
  await assert.rejects(() => auth.authorizedSession(response.cookies), { status: 403 });
});

test("unauthenticated backend calls and cross-origin writes cannot reach the backend", async (t) => {
  environment(t);
  const route = loadServer("src/app/api/backend/[...path]/route.ts");
  const originalFetch = global.fetch;
  global.fetch = () => assert.fail("Backend must not be reached");
  t.after(() => { global.fetch = originalFetch; });
  const context = { params: Promise.resolve({ path: ["limits"] }) };
  assert.equal((await route.GET(new NextRequest("https://portal.example/rule/api/backend/limits"), context)).status, 401);
  assert.equal((await route.POST(new NextRequest("https://portal.example/rule/api/backend/limits", {
    method: "POST", headers: { origin: "https://evil.example" },
  }), context)).status, 403);
});
