const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadModule(fetch) {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/lib/api/runtime-config.ts"), "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, fetch });
  return exports;
}

test("concurrent API requests share one configuration fetch", async () => {
  let calls = 0;
  const { getApiBaseUrl } = loadModule(async (url, options) => {
    calls++;
    assert.equal(url, "/rule/runtime-config");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => ({ apiBaseUrl: "https://api.example/api" }) };
  });
  const urls = await Promise.all([getApiBaseUrl(), getApiBaseUrl(), getApiBaseUrl()]);
  assert.deepEqual(urls, Array(3).fill("https://api.example/api"));
  assert.equal(await getApiBaseUrl(), "https://api.example/api");
  assert.equal(calls, 1);
});

test("failed configuration loads are retried on the next request", async () => {
  let calls = 0;
  const { getApiBaseUrl } = loadModule(async () => {
    calls++;
    if (calls === 1) {
      return { ok: false, json: async () => ({ error: "API URL is missing" }) };
    }
    return { ok: true, json: async () => ({ apiBaseUrl: "https://recovered.example/api" }) };
  });
  await assert.rejects(getApiBaseUrl(), /API URL is missing/);
  assert.equal(await getApiBaseUrl(), "https://recovered.example/api");
  assert.equal(calls, 2);
});

test("a malformed success response does not send requests to the frontend", async () => {
  const { getApiBaseUrl } = loadModule(async () => ({
    ok: true, json: async () => ({}),
  }));
  await assert.rejects(getApiBaseUrl(), /missing apiBaseUrl/);
});

test("network failures can recover", async () => {
  let calls = 0;
  const { getApiBaseUrl } = loadModule(async () => {
    if (++calls === 1) throw new Error("Network unavailable");
    return { ok: true, json: async () => ({ apiBaseUrl: "https://api.example" }) };
  });
  await assert.rejects(getApiBaseUrl(), /Network unavailable/);
  assert.equal(await getApiBaseUrl(), "https://api.example");
});
