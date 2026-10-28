const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadHook(browserWindow) {
  let subscription;
  const source = fs.readFileSync(
    path.join(__dirname, "../src/hooks/use-mobile.ts"), "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    window: browserWindow,
    require(name) {
      assert.equal(name, "react");
      return {
        useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          subscription = { subscribe, getSnapshot, getServerSnapshot };
          return browserWindow ? getSnapshot() : getServerSnapshot();
        },
      };
    },
  });
  return { useIsMobile: exports.useIsMobile, getSubscription: () => subscription };
}

test("mobile snapshot respects the 768px boundary and removes its listener", () => {
  let listener;
  const browserWindow = {
    innerWidth: 767,
    matchMedia(query) {
      assert.equal(query, "(max-width: 767px)");
      return {
        addEventListener(event, callback) {
          assert.equal(event, "change");
          listener = callback;
        },
        removeEventListener(event, callback) {
          assert.equal(event, "change");
          assert.equal(callback, listener);
          listener = undefined;
        },
      };
    },
  };
  const hook = loadHook(browserWindow);
  assert.equal(hook.useIsMobile(), true);
  const { subscribe, getSnapshot } = hook.getSubscription();
  let notifications = 0;
  const unsubscribe = subscribe(() => notifications++);
  browserWindow.innerWidth = 768;
  listener();
  assert.equal(notifications, 1);
  assert.equal(getSnapshot(), false);
  browserWindow.innerWidth = 767;
  listener();
  assert.equal(getSnapshot(), true);
  unsubscribe();
  assert.equal(listener, undefined);
});

test("server rendering returns false without accessing window", () => {
  const hook = loadHook(undefined);
  assert.equal(hook.useIsMobile(), false);
  assert.equal(hook.getSubscription().getServerSnapshot(), false);
});
