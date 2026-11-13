#!/usr/bin/env bash
# Forced command for the CI deploy key: the only thing it can do is deploy one image tag.
set -euo pipefail
tag="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Refused: expected a 40-character commit SHA" >&2
  exit 2
fi
exec sudo /opt/underplot/staging/deploy.sh "$tag"
