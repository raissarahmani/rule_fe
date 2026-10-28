const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
const { createHash, generateKeyPairSync, sign } = require("node:crypto");
const { test } = require("node:test");
const { userInfo } = require("./helpers/user-info.cjs");

// Exercise the built production server with a local OIDC provider, without using real credentials.
test("production OIDC login, protected pages, API proxy, and logout", {
  skip: process.platform !== "linux" || process.env.CONTAINER_SMOKE !== "1",
}, async (t) => {
  const issuer = "https://portal.example/auth/realms/remittance";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test", alg: "RS256", use: "sig" };
  let authorization;
  let accessToken;
  let profile = userInfo();
  const provider = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/certs") return response.end(JSON.stringify({ keys: [jwk] }));
    if (request.url === "/userinfo") {
      assert.equal(request.headers.authorization, `Bearer ${accessToken}`);
      const { Modul, ...fields } = profile;
      return response.end(JSON.stringify({ ...fields, modul: Modul }));
    }
    if (request.url.startsWith("/api/v1/limits")) {
      assert.equal(request.headers.authorization, `Bearer ${accessToken}`);
      assert.equal(request.headers.cookie, undefined);
      return response.end(JSON.stringify({ data: [], query: request.url }));
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const parameters = new URLSearchParams(body);
    assert.equal(request.url, "/token");
    assert.equal(parameters.get("client_id"), "rule");
    assert.equal(parameters.get("client_secret"), "test-secret");
    assert.equal(parameters.get("redirect_uri"), "https://portal.example/rule/callback");
    assert.equal(createHash("sha256").update(parameters.get("code_verifier")).digest("base64url"), authorization.searchParams.get("code_challenge"));
    const now = Math.floor(Date.now() / 1000);
    const input = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test" })).toString("base64url") + "." +
      Buffer.from(JSON.stringify({
        iss: issuer, aud: "rule", sub: "user-123", preferred_username: "tester", name: "Test User",
        nonce: authorization.searchParams.get("nonce"), iat: now, exp: now + 300,
      })).toString("base64url");
    const idToken = input + "." + sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
    accessToken = idToken;
    response.end(JSON.stringify({ access_token: accessToken, id_token: idToken, token_type: "Bearer", expires_in: 300 }));
  });
  await new Promise(resolve => provider.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => provider.close(resolve)));
  const providerURL = `http://127.0.0.1:${provider.address().port}`;
  const server = spawn(process.execPath, ["server.js"], {
    stdio: "inherit",
    env: {
      ...process.env, HOSTNAME: "127.0.0.1", NODE_TLS_REJECT_UNAUTHORIZED: "1",
      OIDC_ISSUER: issuer, OIDC_REDIRECT_URI: "https://portal.example/rule/callback",
      OIDC_CLIENT_ID: "rule", OIDC_CLIENT_SECRET: "test-secret", SESSION_SECRET: "a-test-secret-with-at-least-32-characters",
      OIDC_ALLOW_HTTP: "true", OIDC_TOKEN_ENDPOINT: providerURL + "/token",
      OIDC_JWKS_URI: providerURL + "/certs", OIDC_USERINFO_ENDPOINT: providerURL + "/userinfo",
      OIDC_LOGOUT_ENDPOINT: "/protocol/openid-connect/logout", PORTAL_URL: "https://portal.example",
      RULE_API_URL: providerURL, RULE_API_PREFIX: "/api/v1/",
    },
  });
  t.after(() => server.kill());
  const base = "http://127.0.0.1:3002";
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(base + "/rule/health", { signal: AbortSignal.timeout(1000) })).ok) {
        ready = true;
        break;
      }
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "Production server did not become ready");
  const unauthenticated = await fetch(base + "/rule/home", { redirect: "manual" });
  assert.equal(unauthenticated.status, 307);
  assert.equal(new URL(unauthenticated.headers.get("location")).pathname, "/rule/login");
  const runtimeConfig = await fetch(base + "/rule/runtime-config");
  assert.deepEqual(await runtimeConfig.json(), { apiBaseUrl: "/rule/api/backend" });

  const jar = new Map();
  function acceptCookies(response) {
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";", 1)[0];
      const delimiter = pair.indexOf("=");
      jar.set(pair.slice(0, delimiter), pair.slice(delimiter + 1));
    }
  }
  function cookieHeader() {
    return [...jar].filter(([, value]) => value).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  const login = await fetch(base + "/rule/login?returnTo=%2Frule%2Fhome%2Flimit", { redirect: "manual" });
  assert.equal(login.status, 307);
  authorization = new URL(login.headers.get("location"));
  assert.equal(authorization.origin, "https://portal.example");
  assert.equal(authorization.pathname, "/auth/realms/remittance/protocol/openid-connect/auth");
  assert.equal(authorization.searchParams.get("client_id"), "rule");
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  acceptCookies(login);
  const callback = await fetch(base + `/rule/callback?code=test-code&state=${authorization.searchParams.get("state")}`, {
    redirect: "manual", headers: { Cookie: cookieHeader() },
  });
  assert.equal(callback.status, 307, await callback.clone().text());
  assert.equal(callback.headers.get("location"), "https://portal.example/rule/home/limit");
  acceptCookies(callback);
  assert.equal((await fetch(base + "/rule/home", { redirect: "manual", headers: { Cookie: cookieHeader() } })).status, 200);
  const sessionResponse = await fetch(base + "/rule/api/auth/session", { headers: { Cookie: cookieHeader() } });
  const sessionJSON = await sessionResponse.text();
  assert.equal(JSON.parse(sessionJSON).user.username, "tester");
  assert.equal(sessionJSON.includes(accessToken), false);
  const api = await fetch(base + "/rule/api/backend/limits?type=FX", { headers: { Cookie: cookieHeader(), Authorization: "Bearer attacker-token" } });
  assert.deepEqual(await api.json(), { data: [], query: "/api/v1/limits?type=FX" });
  const deniedWrite = await fetch(base + "/rule/api/backend/limits/status", {
    method: "PUT", headers: { Cookie: cookieHeader(), Origin: "https://portal.example" }, body: "{}",
  });
  assert.equal(deniedWrite.status, 403);
  assert.equal((await fetch(base + "/rule/log-activity", { headers: { Cookie: cookieHeader() } })).status, 403);
  assert.equal((await fetch(base + "/rule/api/backend/limits", {
    method: "PUT", headers: { Cookie: cookieHeader(), Origin: "https://portal.example" }, body: "{}",
  })).status, 200);
  profile = userInfo({ level: 2 });
  assert.equal((await fetch(base + "/rule/api/backend/limits/status", {
    method: "PUT", headers: { Cookie: cookieHeader(), Origin: "https://portal.example" }, body: "{}",
  })).status, 200);
  assert.equal((await fetch(base + "/rule/api/backend/limits", {
    method: "PUT", headers: { Cookie: cookieHeader(), Origin: "https://portal.example" }, body: "{}",
  })).status, 403);
  profile = userInfo({ isAktif: 0 });
  assert.equal((await fetch(base + "/rule/api/backend/limits", { headers: { Cookie: cookieHeader() } })).status, 403);
  profile = userInfo();
  const invalidCallback = await fetch(base + "/rule/callback?state=unmatched&code=invalid", {
    redirect: "manual", headers: { Cookie: cookieHeader() },
  });
  assert.equal(invalidCallback.status, 401);
  acceptCookies(invalidCallback);
  assert.equal((await fetch(base + "/rule/api/auth/session", { headers: { Cookie: cookieHeader() } })).status, 200);
  const pendingLogin = await fetch(base + "/rule/login", { redirect: "manual" });
  acceptCookies(pendingLogin);
  assert.equal((await fetch(base + "/rule/logout", {
    method: "POST", redirect: "manual", headers: { Cookie: cookieHeader(), Origin: "https://evil.example" },
  })).status, 403);
  const logout = await fetch(base + "/rule/logout", {
    method: "POST", redirect: "manual", headers: { Cookie: cookieHeader(), Origin: "https://portal.example" },
  });
  assert.equal(logout.status, 303);
  const endSession = new URL(logout.headers.get("location"));
  assert.equal(endSession.pathname, "/auth/realms/remittance/protocol/openid-connect/logout");
  assert.equal(endSession.searchParams.get("post_logout_redirect_uri"), "https://portal.example/");
  acceptCookies(logout);
  assert.equal([...jar].some(([name, value]) => name.startsWith("__Secure-rule-login-") && value), false);
  assert.equal((await fetch(base + "/rule/api/auth/session", { headers: { Cookie: cookieHeader() } })).status, 401);
});
