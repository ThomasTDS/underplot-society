#!/usr/bin/env bash
# Install Docker Engine and the Compose plugin from Docker's apt repository
# (Ubuntu 24.04), then apply daemon.json from this folder. Idempotent; run as root:
#   sudo bash install-docker.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
here="$(cd "$(dirname "$0")" && pwd)"

echo "== docker apt repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
# shellcheck disable=SC1091
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${codename} stable" \
  > /etc/apt/sources.list.d/docker.list

echo "== packages"
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "== daemon settings"
install -m 0644 "$here/daemon.json" /etc/docker/daemon.json
dockerd --validate --config-file /etc/docker/daemon.json
systemctl reset-failed docker docker.socket 2>/dev/null || true
systemctl enable --now docker
systemctl restart docker

echo "== result"
docker version --format 'docker {{.Server.Version}}'
docker compose version
