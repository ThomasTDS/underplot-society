#!/usr/bin/env bash
# Deploy one published image tag to the staging server. Run on the server as root:
#   sudo bash deploy.sh <tag>        # a commit SHA from the Images workflow, or "main"
# Pulls the images, runs the database migrations, restarts what changed and waits
# until every service is healthy. To roll back, run it again with the previous
# tag, which it prints at the start and keeps in /opt/underplot/staging/deployed-tag.
set -euo pipefail

tag="${1:?Usage: deploy.sh <image tag>}"
dir=/opt/underplot/staging
env_file=/etc/underplot/staging.env
state="$dir/deployed-tag"

[ -f "$env_file" ] || { echo "Missing $env_file (see staging.env.example)"; exit 1; }
cd "$dir"

previous="$(cat "$state" 2>/dev/null || echo none)"
echo "== deploying $tag (previous: $previous)"

export IMAGE_TAG="$tag"
compose=(docker compose --env-file "$env_file")
"${compose[@]}" config --quiet
"${compose[@]}" pull --quiet
"${compose[@]}" up --detach --wait --wait-timeout 180 --remove-orphans

echo "$tag" > "$state"
docker image prune --force --filter "until=168h" >/dev/null

echo "== deployed $tag"
"${compose[@]}" ps --format '{{.Service}}\t{{.Status}}'
curl -fsS http://127.0.0.1:8000/api/health && echo
