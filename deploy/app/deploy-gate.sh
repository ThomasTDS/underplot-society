#!/usr/bin/env bash
# Forced command for the CI deploy key: the only thing it can do is deploy one image tag.
# authorized_keys runs it as: underplot-deploy-gate <environment>
set -euo pipefail
env_name="${1:-}"
tag="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$env_name" =~ ^(staging|production)$ ]]; then
  echo "Refused: unknown environment" >&2
  exit 2
fi
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Refused: expected a 40-character commit SHA" >&2
  exit 2
fi
exec sudo "/opt/underplot/$env_name/deploy.sh" "$tag"
