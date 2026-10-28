const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadServer } = require("./helpers/load-server.cjs");
const { userInfo } = require("./helpers/user-info.cjs");
const { userInfoProfile, normalizeProfiles } = loadServer("src/lib/server/user-info.ts");
const permissions = loadServer("src/lib/permissions.ts");
const parse = data => userInfoProfile(data, "user-123", "tester");

test("RMT-RU matrix: operator edits, supervisor approves; role 99 never elevates level", () => {
  for (const profile of ["CABANG", "RMT-DSO", "RMT-TREASURI"]) {
    for (const level of [1, 2]) {
      const user = parse(userInfo({ profile, level }));
      for (const menu of ["home", "limit", "underlying", "rate", "history"]) assert.equal(permissions.canView(user, menu), true);
      assert.equal(permissions.canView(user, "activity"), level === 2);
      assert.equal(permissions.canView(user, "approvals"), level === 2);
      assert.equal(permissions.canEdit(user, "limit"), level === 1);
      assert.equal(permissions.canApprove(user, "limit"), level === 2);
      assert.equal(permissions.canApprove(user, "underlying"), level === 2);
    }
  }
});

test("UserInfo binds identity, active flags, supported levels, module and profiles", () => {
  for (const override of [
    { sub: "other-user" }, { status: 0 }, { isAktif: false }, { level: 99 }, { level: 3 },
    { profile: "RMT-KEPATUHAN" }, { profile: "RMT-PUSAT" }, { profile: [] }, { Modul: [] },
    { Modul: [{ ...userInfo().Modul[0], modul_code: "RMT-RT" }] },
    { Modul: [{ ...userInfo().Modul[0], has_access: "true" }] },
    { Modul: [{ ...userInfo().Modul[0], menus: [] }] },
  ]) assert.throws(() => parse(userInfo(override)));
  const withoutSub = userInfo(); delete withoutSub.sub;
  assert.equal(parse({ status: "success", data: withoutSub }).id, "user-123");
  assert.throws(() => parse({ status: "error", data: withoutSub }));
  withoutSub.username = "another-user";
  assert.throws(() => parse(withoutSub), { status: 401 });
});

test("profile normalization handles registered strings without promoting malformed data", () => {
  for (const profile of ["CABANG", "[CABANG]", '["CABANG"]', [" cabang "]]) assert.deepEqual(normalizeProfiles(profile), ["CABANG"]);
  assert.deepEqual(normalizeProfiles({ profile: "CABANG" }), []);
  assert.deepEqual(normalizeProfiles("[CABANG"), []);
});

test("Remittance lowercase modul claim grants only a unique eligible RMT-RU module", () => {
  const data = userInfo();
  const { Modul, ...profile } = data;
  assert.deepEqual(parse({ ...profile, modul: Modul }).menus, parse(data).menus);
  assert.throws(() => parse({ ...data, modul: Modul }), { status: 502 });
  assert.throws(() => parse({ ...profile, modul: [...Modul, ...Modul] }), { status: 403 });
  assert.throws(() => parse({ ...profile, modul: [{ ...Modul[0], modul_code: "RMT-RT" }] }), { status: 403 });
  assert.throws(() => parse({ ...profile, modul: [{ ...Modul[0], has_access: false }] }), { status: 403 });
  assert.throws(() => parse({ ...profile, modul: JSON.stringify(Modul) }), { status: 403 });
});

test("menu grants enforce their role/profile, module isolation, and exact known menu names", () => {
  const grant = userInfo().Modul[0];
  const user = parse(userInfo({ Modul: [{ ...grant, menus: [
    { Menu: "Limit", Profile: "RMT-DSO", Role: 99 },
    { Menu: "Rate", Profile: "ALL", Role: 2 },
    { Menu: "Underlying", Profile: "ALL", Role: 99, has_access: false },
    { Menu: "Rate", Profile: "ALL", Role: true },
    { Menu: "Underlying", Profile: "ALL", Role: 99, has_access: "false" },
    { Menu: "Log Activity", Profile: "ALL", Role: 99 },
    { Menu: "Home", Profile: "ALL", Role: 99, Modul_Code: "RMT-TR" },
    { Menu: "Riwayat Otorisasi", Profile: "ALL", Role: 99 },
  ] }] }));
  assert.deepEqual(user.menus, ["history"]);
  assert.equal(permissions.canAccessRoute(user, "/rule/home/limit"), false);
  assert.equal(permissions.canAccessRoute(user, "/rule/otorisasi/history/id"), true);
  assert.equal(permissions.canAccessRoute(user, "/rule/otorisasi/history-evil"), false);
});

test("provider menus inherit module profile only when menu profile is absent, while keeping role and explicit denials", () => {
  const data = userInfo({ profile: "RMT-TREASURI", level: "1" });
  data.Modul[0].menus = [
    { id: 8, code: "RMT-RU", menu: "Home", role: 99 },
    { id: 9, code: "RMT-RU", menu: "Limit", role: 1 },
    { id: 10, code: "RMT-RU", menu: "Underlying", role: 2 },
    { id: 11, code: "RMT-RU", menu: "Rate", role: 99, profile: "RMT-DSO" },
    { menu: "Rate", role: 99, profile: null },
    { menu: "Rate", role: 99, profile: [] },
    { menu: "Rate", role: true },
    { menu: "Rate", role: 99, has_access: false },
    { menu: "Rate" },
  ];
  assert.deepEqual(parse(data).menus, ["home", "limit"]);
  assert.throws(() => parse({ ...data, profile: "RMT-KEPATUHAN" }), { status: 403 });
  delete data.Modul[0].profile;
  assert.throws(() => parse(data), { status: 403 });
});

test("BFF allowlist denies unknown paths, unsupported methods, edits by supervisors and approvals by operators", () => {
  const operator = parse(userInfo());
  const supervisor = parse(userInfo({ level: 2 }));
  const check = (user, method, endpoint) => {
    const url = new URL(endpoint, "https://local.invalid");
    return permissions.canAccessApi(user, method, url.pathname.slice(1).split("/"), url.searchParams);
  };
  assert.equal(check(operator, "PUT", "/limits"), true);
  assert.equal(check(supervisor, "PUT", "/limits"), false);
  assert.equal(check(supervisor, "PUT", "/limits/status"), true);
  assert.equal(check(operator, "PUT", "/limits/status"), false);
  assert.equal(check(operator, "GET", "/limits/history?type=Create"), false);
  assert.equal(check(operator, "GET", "/limits/history"), false);
  assert.equal(check(supervisor, "GET", "/limits/history?type=Create&type=Approve"), false);
  assert.equal(check(operator, "GET", "/limits/history?type=Approve"), true);
  assert.equal(check(supervisor, "GET", "/limits/history?type=Create"), true);
  assert.equal(check(supervisor, "GET", "/limits/admin"), false);
  assert.equal(check(supervisor, "DELETE", "/limits"), false);
  assert.equal(check(supervisor, "GET", "/admin"), false);
  const noApproval = { ...supervisor, menus: supervisor.menus.filter(menu => menu !== "approvals") };
  assert.equal(check(noApproval, "PUT", "/underly-docs/status"), false);
});
