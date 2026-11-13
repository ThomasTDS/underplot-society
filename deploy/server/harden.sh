#!/usr/bin/env bash
# Baseline hardening for an Ubuntu 24.04 server. Idempotent; run as root:
#   sudo bash harden.sh
# Inbound traffic is left to the provider's firewall (on Oracle Cloud, the image's
# iptables rules, which only accept SSH).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== packages"
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
apt-get -y -q install unattended-upgrades

echo "== automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/52underplot-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "06:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

echo "== swap (2 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/90-underplot-swap.conf
sysctl -q --system

echo "== ssh: key only, no root"
cat > /etc/ssh/sshd_config.d/10-underplot.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
X11Forwarding no
MaxAuthTries 3
AllowUsers ubuntu deploy
EOF
sshd -t
systemctl reload ssh

echo "== result"
sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|allowusers|maxauthtries) '
swapon --show
cat /etc/apt/apt.conf.d/20auto-upgrades
[ -f /var/run/reboot-required ] && echo "REBOOT REQUIRED" || echo "no reboot required"
