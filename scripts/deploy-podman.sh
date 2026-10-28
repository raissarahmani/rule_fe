#!/bin/sh
set -eu

release=${1:?Missing build number}
version=${2:?Missing application version}
port=${3:?Missing published port}
env_file=${4:?Missing runtime environment file}
case "$release" in ''|*[!0-9]*) echo 'Invalid build number' >&2; exit 1 ;; esac
case "$version" in ''|[!A-Za-z0-9_]*|*[!A-Za-z0-9_.-]*) echo 'Invalid image version' >&2; exit 1 ;; esac
[ "${#version}" -le 128 ]
case "$port" in ''|*[!0-9]*) echo 'Invalid published port' >&2; exit 1 ;; esac
[ "$port" -ge 1 ] && [ "$port" -le 65535 ]
case "$env_file" in /*) ;; *) echo 'Environment file path must be absolute' >&2; exit 1 ;; esac

image="localhost/rule-fe:$version"
archive="$HOME/rule-fe-deploy/build-$release/rule-fe-$version.tar"
container=rule-fe
backup="rule-fe-rollback-$release"

check_health() {
    attempt=0
    until podman exec "$container" node -e '
Promise.all(["/rule/health", "/rule/runtime-config"].map(async path => {
  const response = await fetch("http://127.0.0.1:3002" + path, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(path + ": HTTP " + response.status);
})).catch(error => { console.error(error.message); process.exit(1); });
'; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 12 ]; then
            echo 'Application health check failed.' >&2
            return 1
        fi
        sleep 5
    done
}

command -v podman >/dev/null
podman info >/dev/null
podman network exists remit-shared
test -r "$env_file"
env_hash=$(sha256sum "$env_file")
env_hash=${env_hash%% *}
test -s "$archive"
podman load --input "$archive"
podman image exists "$image"

# Validate configuration before interrupting the current application.
podman run --rm --pull=never --env-file "$env_file" "$image" node -e '
for (const name of ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_REDIRECT_URI", "SESSION_SECRET"]) {
  if (!process.env[name]) throw new Error(name + " is required");
}
if (process.env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET is too short");
'

existing=$(podman ps --all --filter "name=^${container}$" --format '{{.Names}}')
previous_running=false
if [ -n "$existing" ]; then
    current_image=$(podman inspect --format '{{.ImageName}}' "$container")
    current_env_hash=$(podman inspect --format '{{ index .Config.Labels "io.rule-fe.env-sha256" }}' "$container")
    current_port=$(podman inspect --format '{{ index .Config.Labels "io.rule-fe.published-port" }}' "$container")
    current_container_port=$(podman inspect --format '{{ index .Config.Labels "io.rule-fe.container-port" }}' "$container")
    current_auth_mode=$(podman inspect --format '{{ index .Config.Labels "io.rule-fe.auth-mode" }}' "$container")
    if [ "$current_image" = "$image" ] && [ "$current_env_hash" = "$env_hash" ] && [ "$current_port" = "$port" ] && [ "$current_container_port" = 3002 ] && [ "$current_auth_mode" = oidc-v1 ]; then
        echo "Same image tag and runtime settings; restarting $container."
        podman restart --time 30 "$container"
        if ! check_health; then
            podman logs --tail 50 "$container" >&2 || true
            exit 1
        fi
        echo "Restarted $container using $image."
        exit 0
    fi

    # Never overwrite a rollback container from an earlier attempt of this release.
    test -z "$(podman ps --all --filter "name=^${backup}$" --format '{{.Names}}')"
    previous_running=$(podman inspect --format '{{.State.Running}}' "$container")
    podman rename "$container" "$backup"
fi

rollback() {
    status=$?
    trap - EXIT HUP INT TERM
    if [ "$status" -ne 0 ]; then
        echo 'Deployment failed; restoring the previous container if present.' >&2
        podman logs --tail 50 "$container" >&2 || true
        podman rm --force "$container" >/dev/null 2>&1 || true
        if [ -n "$existing" ]; then
            podman rename "$backup" "$container"
            if [ "$previous_running" = true ]; then
                podman start "$container"
            fi
        fi
    fi
    exit "$status"
}
trap rollback EXIT
trap 'exit 1' HUP INT TERM

if [ "$previous_running" = true ]; then
    podman stop --time 30 "$backup"
fi
podman run --detach --pull=never --name "$container" --restart=unless-stopped --network remit-shared \
    --label "io.rule-fe.env-sha256=$env_hash" --label "io.rule-fe.published-port=$port" \
    --label io.rule-fe.container-port=3002 \
    --label io.rule-fe.auth-mode=oidc-v1 \
    --env-file "$env_file" --env PORT=3002 --publish "$port:3002" "$image"

check_health

trap - EXIT HUP INT TERM
echo "Deployed $image as $container on port $port."
if [ -n "$existing" ]; then
    echo "Previous container retained as $backup."
fi
