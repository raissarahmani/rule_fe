const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { createHash } = require("node:crypto");

// Run in a Linux container: the production deployment target uses POSIX sh.
const linuxOnly = { skip: process.platform !== "linux" };
const deployment = path.join(__dirname, "../scripts/deploy-podman.sh");
const envContent = "NEXT_PUBLIC_BASE_URL=https://api.example/api\n";
const envHash = createHash("sha256").update(envContent).digest("hex");

function exercise(t, scenario, containers = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rule-deploy-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const bin = path.join(directory, "bin");
  const release = path.join(directory, "rule-fe-deploy/build-42");
  fs.mkdirSync(bin);
  fs.mkdirSync(release, { recursive: true });
  fs.writeFileSync(path.join(release, "rule-fe-1.2.3.tar"), "test archive");
  const envFile = path.join(directory, "runtime.env");
  fs.writeFileSync(envFile, envContent);
  const stateFile = path.join(directory, "state.json");
  fs.writeFileSync(stateFile, JSON.stringify({ containers, commands: [] }));
  fs.writeFileSync(path.join(bin, "sleep"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "podman"), `#!${process.execPath}
const fs = require('node:fs');
const state = JSON.parse(fs.readFileSync(process.env.STATE_FILE, 'utf8'));
const args = process.argv.slice(2);
state.commands.push(args);
let status = 0;
switch (args[0]) {
  case 'info': case 'load': case 'image': case 'logs': case 'network': break;
  case 'ps': {
    const filter = args[args.indexOf('--filter') + 1].slice(5);
    console.log(Object.keys(state.containers).filter(name => new RegExp(filter).test(name)).join('\\n'));
    break;
  }
  case 'inspect': {
    const container = state.containers[args.at(-1)];
    const format = args[args.indexOf('--format') + 1];
    if (format === '{{.ImageName}}') console.log(container.image);
    else if (format.includes('env-sha256')) console.log(container.envHash || '');
    else if (format.includes('published-port')) console.log(container.port || '');
    else if (format.includes('container-port')) console.log(container.containerPort || '');
    else if (format.includes('auth-mode')) console.log(container.authMode || '');
    else if (format === '{{.State.Running}}') console.log(container.running);
    else throw new Error('Unexpected inspection: ' + format);
    break;
  }
  case 'rename':
    state.containers[args[2]] = state.containers[args[1]];
    delete state.containers[args[1]];
    break;
  case 'stop': state.containers[args.at(-1)].running = false; break;
  case 'start': state.containers[args[1]].running = true; break;
  case 'restart': state.containers[args.at(-1)].running = true; break;
  case 'rm': delete state.containers[args.at(-1)]; break;
  case 'run':
    if (args.includes('--rm')) {
      if (process.env.SCENARIO === 'invalid-env') status = 1;
    } else {
      const name = args[args.indexOf('--name') + 1];
      const labels = args.filter((value, index) => args[index - 1] === '--label');
      state.containers[name] = {
        running: true,
        image: args.at(-1),
        envHash: labels.find(value => value.startsWith('io.rule-fe.env-sha256=')).split('=')[1],
        port: labels.find(value => value.startsWith('io.rule-fe.published-port=')).split('=')[1],
        containerPort: labels.find(value => value.startsWith('io.rule-fe.container-port=')).split('=')[1],
        authMode: labels.find(value => value.startsWith('io.rule-fe.auth-mode=')).split('=')[1],
      };
      if (!args.includes('3002:3002') || !args.includes('PORT=3002')) throw new Error('Wrong application port mapping');
      if (process.env.SCENARIO === 'run-failure') status = 1;
    }
    break;
  case 'exec': if (process.env.SCENARIO === 'unhealthy') status = 1; break;
  default: throw new Error('Unexpected command: ' + args.join(' '));
}
fs.writeFileSync(process.env.STATE_FILE, JSON.stringify(state));
process.exit(status);
`, { mode: 0o755 });
  const result = spawnSync("sh", [deployment, "42", "1.2.3", "3002", envFile], {
    env: {
      ...process.env,
      HOME: directory,
      PATH: `${bin}:${process.env.PATH}`,
      STATE_FILE: stateFile,
      SCENARIO: scenario,
    },
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(result.error, undefined);
  return { result, state: JSON.parse(fs.readFileSync(stateFile, "utf8")) };
}

test("first deployment starts the loaded image", linuxOnly, (t) => {
  const { result, state } = exercise(t, "healthy");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(state.containers, {
    "rule-fe": { running: true, image: "localhost/rule-fe:1.2.3", envHash, port: "3002", containerPort: "3002", authMode: "oidc-v1" },
  });
});

test("healthy replacement keeps the previous container stopped", linuxOnly, (t) => {
  const { result, state } = exercise(t, "healthy", {
    "rule-fe": { running: true, image: "old" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(state.containers["rule-fe-rollback-42"], { running: false, image: "old" });
  assert.equal(state.containers["rule-fe"].image, "localhost/rule-fe:1.2.3");
});

for (const scenario of ["unhealthy", "run-failure"]) {
  test(`${scenario} restores the previous running container and fails`, linuxOnly, (t) => {
    const original = { "rule-fe": { running: true, image: "old" } };
    const { result, state } = exercise(t, scenario, structuredClone(original));
    assert.notEqual(result.status, 0);
    assert.deepEqual(state.containers, original);
  });
}

test("invalid configuration leaves the running container untouched", linuxOnly, (t) => {
  const original = { "rule-fe": { running: true, image: "old" } };
  const { result, state } = exercise(t, "invalid-env", structuredClone(original));
  assert.notEqual(result.status, 0);
  assert.deepEqual(state.containers, original);
  assert.equal(state.commands.some(args => args[0] === "rename" || args[0] === "stop"), false);
});

test("same tag and settings restart the existing container without replacing it", linuxOnly, (t) => {
  const original = { "rule-fe": { running: true, image: "localhost/rule-fe:1.2.3", envHash, port: "3002", containerPort: "3002", authMode: "oidc-v1" } };
  const { result, state } = exercise(t, "healthy", structuredClone(original));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(state.containers, original);
  assert.equal(state.commands.some(args => args[0] === "restart"), true);
  assert.equal(state.commands.some(args => args[0] === "rename" || (args[0] === "run" && args.includes("--detach"))), false);
});

for (const settings of [{ envHash: "changed", port: "3002" }, { envHash, port: "3001" }, { envHash, port: "3002", containerPort: "3000" }, { envHash, port: "3002", authMode: "" }, {}]) {
  test(`same tag recreates when settings differ: ${JSON.stringify(settings)}`, linuxOnly, (t) => {
    const previous = { running: true, image: "localhost/rule-fe:1.2.3", containerPort: "3002", authMode: "oidc-v1", ...settings };
    const { result, state } = exercise(t, "healthy", { "rule-fe": structuredClone(previous) });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(state.containers["rule-fe-rollback-42"], { ...previous, running: false });
    assert.deepEqual(state.containers["rule-fe"], { running: true, image: "localhost/rule-fe:1.2.3", envHash, port: "3002", containerPort: "3002", authMode: "oidc-v1" });
  });
}

test("failed same-tag restart health check preserves the existing container and fails", linuxOnly, (t) => {
  const original = { "rule-fe": { running: true, image: "localhost/rule-fe:1.2.3", envHash, port: "3002", containerPort: "3002", authMode: "oidc-v1" } };
  const { result, state } = exercise(t, "unhealthy", structuredClone(original));
  assert.notEqual(result.status, 0);
  assert.deepEqual(state.containers, original);
  assert.equal(state.commands.some(args => args[0] === "rm" || args[0] === "rename"), false);
});
