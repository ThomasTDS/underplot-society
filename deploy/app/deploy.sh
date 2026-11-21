#!/usr/bin/env bash
# Deploy one published image tag to this server. Run on the server as root:
#   sudo bash /opt/underplot/<environment>/deploy.sh <commit SHA>
# The environment (staging or production) is the name of the folder this script is
# in; its settings are in /etc/underplot/<environment>.env.
#
# 1. Fetches compose.yaml as it was in that commit, so the server always runs the
#    stack the commit was tested with (no hand-copied files).
# 2. Pulls the images, runs the database migrations, restarts what changed and waits
#    until every service is healthy.
# To roll back, run it again with the previous SHA, which it prints at the start and
# keeps in deployed-tag.
set -euo pipefail

tag="${1:?Usage: deploy.sh <commit SHA>}"
[[ "$tag" =~ ^[0-9a-f]{40}$ ]] || { echo "Not a full commit SHA: $tag"; exit 1; }

dir="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
env_name="$(basename "$dir")"
env_file="/etc/underplot/$env_name.env"
state="$dir/deployed-tag"
repo=https://raw.githubusercontent.com/ThomasTDS/underplot-society

[ -f "$env_file" ] || { echo "Missing $env_file (see app.env.example)"; exit 1; }
cd "$dir"

previous="$(cat "$state" 2>/dev/null || echo none)"
echo "== deploying $tag to $env_name (previous: $previous)"

# The stack definition of that exact commit (deploy/app since it was generalised,
# deploy/staging before).
fetched=""
for path in deploy/app/compose.yaml deploy/staging/compose.yaml; do
  if curl -fsSL --retry 3 "$repo/$tag/$path" -o compose.yaml.new; then fetched="$path"; break; fi
done
[ -n "$fetched" ] || { echo "Could not fetch compose.yaml for $tag"; rm -f compose.yaml.new; exit 1; }

export IMAGE_TAG="$tag"
compose=(docker compose --file compose.yaml.new --env-file "$env_file")
"${compose[@]}" config --quiet
mv compose.yaml.new compose.yaml
compose=(docker compose --env-file "$env_file")

"${compose[@]}" pull --quiet
"${compose[@]}" up --detach --wait --wait-timeout 180 --remove-orphans

echo "$tag" > "$state"
docker image prune --force --filter "until=168h" >/dev/null

echo "== deployed $tag to $env_name (compose from $fetched)"
"${compose[@]}" ps --format '{{.Service}}\t{{.Status}}'
curl -fsS http://127.0.0.1:8000/api/health && echo
