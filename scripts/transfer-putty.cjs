const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function deploy(env = process.env, execute = spawnSync) {
      const checks = {
            VPS_HOST: /^[A-Za-z0-9][A-Za-z0-9.-]*$/,
            VPS_USERNAME: /^[A-Za-z_][A-Za-z0-9_-]*$/,
            BUILD_NUMBER: /^[0-9]+$/,
            APP_VERSION: /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/,
            VPS_ENV_FILE: /^\/[A-Za-z0-9_./-]+$/,
      };
      for (const [name, pattern] of Object.entries(checks)) {
            if (!pattern.test(env[name] || ""))
                  throw new Error(`Missing or invalid ${name}`);
      }
      for (const name of ["VPS_SSH_PORT", "VPS_APP_PORT"]) {
            if (
                  !/^[0-9]{1,5}$/.test(env[name] || "") ||
                  Number(env[name]) < 1 ||
                  Number(env[name]) > 65535
            ) {
                  throw new Error(`Invalid ${name}`);
            }
      }
      if (!env.VPS_HOSTKEY || /[\r\n*]/.test(env.VPS_HOSTKEY))
            throw new Error("Set a pinned VPS_HOSTKEY");
      if (!env.VPS_PASSWORD || /[\r\n]/.test(env.VPS_PASSWORD))
            throw new Error("A single-line VPS_PASSWORD is required");

      const archive = path.resolve(
            "artifacts",
            `rule-fe-${env.APP_VERSION}.tar`,
      );
      const script = path.resolve("scripts", "deploy-podman.sh");
      if (fs.statSync(archive).size === 0)
            throw new Error("Image TAR is empty");
      if (fs.readFileSync(script, "utf8").includes("\r"))
            throw new Error("deploy-podman.sh must use LF line endings");

      const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rule-vps-"));
      const passwordFile = path.join(directory, "password");
      try {
            fs.writeFileSync(passwordFile, env.VPS_PASSWORD + "\n", {
                  mode: 0o600,
            });
            const connection = [
                  "-batch",
                  "-P",
                  env.VPS_SSH_PORT,
                  "-hostkey",
                  env.VPS_HOSTKEY,
                  "-pwfile",
                  passwordFile,
            ];
            const target = `${env.VPS_USERNAME}@${env.VPS_HOST}`;
            const remoteDirectory = `rule-fe-deploy/build-${env.BUILD_NUMBER}`;
            function run(executable, args) {
                  const result = execute(executable, args, {
                        stdio: "inherit",
                        windowsHide: true,
                        timeout: 15 * 60 * 1000,
                  });
                  if (result.error)
                        throw new Error(
                              `${executable} could not run (${result.error.code || "process error"})`,
                        );
                  if (result.status !== 0)
                        throw new Error(
                              `${executable} failed with exit code ${result.status}`,
                        );
            }
            run("plink.exe", [
                  ...connection,
                  target,
                  `umask 077; mkdir -p ~/${remoteDirectory}`,
            ]);
            run("pscp.exe", [
                  ...connection,
                  archive,
                  script,
                  `${target}:${remoteDirectory}/`,
            ]);
            run("pscp.exe", [
                  ...connection,
                  path.resolve(".env"),
                  `${target}:${env.VPS_ENV_FILE}`,
            ]);
            run("plink.exe", [
                  ...connection,
                  target,
                  `sh ~/${remoteDirectory}/deploy-podman.sh ${env.BUILD_NUMBER} ${env.APP_VERSION} ${env.VPS_APP_PORT} '${env.VPS_ENV_FILE}'`,
            ]);
      } finally {
            fs.rmSync(passwordFile, { force: true });
            fs.rmdirSync(directory);
      }
}

if (require.main === module) {
      try {
            deploy();
      } catch (error) {
            console.error(error.message);
            process.exitCode = 1;
      }
}

module.exports = { deploy };
