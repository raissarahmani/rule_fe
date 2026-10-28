const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadServer } = require("./helpers/load-server.cjs");
const { userInfo } = require("./helpers/user-info.cjs");
const cache = new Map();
const { loginDiagnostic } = loadServer("src/lib/server/oidc.ts", cache);
const { AuthenticationError, userInfoProfile } = loadServer("src/lib/server/user-info.ts", cache);

test("authorization diagnostics preserve the real reason instead of blaming the login cookie", () => {
  const result = loginDiagnostic(new AuthenticationError(403, "No recognized RMT-RU menu grants"), "code_exchange_and_authorization");
  assert.equal(result.code, "AUTHORIZATION_REJECTED");
  assert.equal(result.status, 403);
  assert.equal(result.reason, "No recognized RMT-RU menu grants");
});

test("provider diagnostics expose only allowlisted identifiers, not descriptions, tokens or URLs", () => {
  const error = Object.assign(new Error("private-token-and-personal-data"), {
    code: "OAUTH_RESPONSE_BODY_ERROR",
    cause: { error: "invalid_client", error_description: "private-client-secret", access_token: "private-token" },
  });
  const result = loginDiagnostic(error, "code_exchange_and_authorization");
  assert.equal(result.providerError, "invalid_client");
  assert.equal(result.code, "OAUTH_RESPONSE_BODY_ERROR");
  assert.equal(JSON.stringify(result).includes("private"), false);
  error.code = "https://private.example/?code=secret";
  error.cause.error = "private-provider-text";
  const rejected = loginDiagnostic(error, "code_exchange_and_authorization");
  assert.equal(rejected.code, "OIDC_CALLBACK_FAILED");
  assert.equal(rejected.providerError, undefined);
});

test("UserInfo diagnostics identify the failing requirement without printing the profile", () => {
  for (const [overrides, message] of [
    [{ status: 0 }, "UserInfo status is missing or inactive"],
    [{ isAktif: undefined }, "UserInfo isAktif is missing or inactive"],
    [{ level: 99 }, "UserInfo level must be 1 or 2"],
    [{ profile: [] }, "UserInfo profile is missing or invalid"],
    [{ Modul: [] }, "UserInfo must contain exactly one RMT-RU module"],
  ]) {
    assert.throws(() => userInfoProfile(userInfo(overrides), "user-123", "tester"), { status: 403, message });
  }
});

test("missing menu diagnostics show provider schema without leaking claim values", () => {
  const data = userInfo({ name: "private-person", email: "private-email", access_token: "private-token" });
  data.Modul[0].Menu = [{ Menu: "private-menu-value", Profile: "private-profile", Role: 99 }];
  delete data.Modul[0].menus;
  let rejected;
  try { userInfoProfile(data, "user-123", "tester"); } catch (error) { rejected = error; }
  assert.equal(rejected.status, 403);
  const diagnostic = loginDiagnostic(rejected, "code_exchange_and_authorization");
  const schema = JSON.parse(diagnostic.menuSchema);
  assert.equal(schema.moduleFields.Menu.type, "array");
  assert.deepEqual(schema.moduleFields.Menu.firstItemFields, ["Menu", "Profile", "Role"]);
  assert.equal(JSON.stringify(diagnostic).includes("private-"), false);
  assert.equal(JSON.stringify(diagnostic).includes("user-123"), false);
});

test("empty and unrecognized menu arrays remain denied with distinct schema details", () => {
  for (const menus of [[], [{ label: "private-label", role: 99, profile: "ALL" }]]) {
    const data = userInfo(); data.Modul[0].menus = menus;
    assert.throws(() => userInfoProfile(data, "user-123", "tester"), error => {
      const schema = JSON.parse(error.menuSchema);
      assert.equal(schema.moduleFields.menus.count, menus.length);
      if (menus.length) assert.equal(schema.menuSamples[0].label, "string");
      return error.status === 403;
    });
  }
});
