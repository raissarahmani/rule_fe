const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { deploy } = require("../scripts/transfer-putty.cjs");

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rule-transfer-test-"));
  const originalDirectory = process.cwd();
  const project = path.join(directory, "project with spaces");
  fs.mkdirSync(path.join(project, "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(project, "scripts"));
  fs.writeFileSync(path.join(project, "artifacts/rule-fe-1.2.3.tar"), "archive");
  fs.writeFileSync(path.join(project, "scripts/deploy-podman.sh"), "#!/bin/sh\n");
  process.chdir(project);
  t.after(() => {
    process.chdir(originalDirectory);
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.equal(path.basename(directory).startsWith("rule-transfer-test-"), true);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return {
    VPS_HOST: "192.0.2.10",
    VPS_USERNAME: "deploy",
    VPS_PASSWORD: 'test-%!&^"|<>-password',
    VPS_SSH_PORT: "22",
    VPS_APP_PORT: "3002",
    VPS_HOSTKEY: "SHA256:test-fingerprint",
    VPS_ENV_FILE: "/home/deploy/rule-fe/.env",
    BUILD_NUMBER: "42",
    APP_VERSION: "1.2.3",
  };
}

test("PuTTY transfers use a temporary password file and preserve argument boundaries", (t) => {
  const env = setup(t);
  const calls = [];
  let passwordFile;
  deploy(env, (executable, args, options) => {
    passwordFile = args[args.indexOf("-pwfile") + 1];
    assert.equal(fs.readFileSync(passwordFile, "utf8"), env.VPS_PASSWORD + "\n");
    assert.equal(args.some(value => value.includes(env.VPS_PASSWORD)), false);
    assert.equal(options.shell, undefined);
    calls.push({ executable, args });
    return { status: 0 };
  });
  assert.deepEqual(calls.map(call => call.executable), ["plink.exe", "pscp.exe", "plink.exe"]);
  assert.equal(calls[1].args.at(-1), "deploy@192.0.2.10:rule-fe-deploy/build-42/");
  assert.equal(calls[1].args.at(-3), path.resolve("artifacts/rule-fe-1.2.3.tar"));
  assert.equal(calls[2].args.at(-1), "sh ~/rule-fe-deploy/build-42/deploy-podman.sh 42 1.2.3 3002 '/home/deploy/rule-fe/.env'");
  assert.equal(fs.existsSync(path.dirname(passwordFile)), false);
});

test("failed upload stops deployment and removes the password file", (t) => {
  const env = setup(t);
  let count = 0;
  let passwordFile;
  assert.throws(() => deploy(env, (executable, args) => {
    passwordFile = args[args.indexOf("-pwfile") + 1];
    count++;
    return { status: executable === "pscp.exe" ? 1 : 0 };
  }), /pscp.exe failed with exit code 1/);
  assert.equal(count, 2);
  assert.equal(fs.existsSync(path.dirname(passwordFile)), false);
});

test("invalid remote settings are rejected before invoking PuTTY", (t) => {
  const env = setup(t);
  env.VPS_USERNAME = "deploy;unexpected-command";
  assert.throws(() => deploy(env, () => assert.fail("PuTTY must not execute")), /VPS_USERNAME/);
});
