# Deploy

How the staging server is built and put behind Cloudflare. Everything here can rebuild the server from scratch on a new machine. See [ADR-005](../docs/adr/005-hosting.md) for why it is set up this way.

```
visitor --HTTPS--> Cloudflare (TLS, WAF, bot protection)
                        |
                        |  Cloudflare Tunnel (outbound from the server)
                        v
          server: cloudflared --> 127.0.0.1:3000 (site)
```

The server opens **no** HTTP or HTTPS port. `cloudflared` connects out to Cloudflare, and Cloudflare sends requests for the staging hostname down that connection. Requests to the server's IP address get nothing, so the firewall and bot rules cannot be bypassed. The only inbound port is SSH, with keys only.

| Path | What it does |
|---|---|
| [`server/harden.sh`](server/harden.sh) | Updates the system, enables automatic security updates (with reboot at 06:30), adds 2 GB of swap, and restricts SSH to key login for one user, no root |
| [`server/install-docker.sh`](server/install-docker.sh) | Installs Docker Engine and Compose from Docker's repository, with [`daemon.json`](server/daemon.json): rotated logs, containers survive daemon restarts, no privilege escalation |
| [`tunnel/compose.yaml`](tunnel/compose.yaml) | The `cloudflared` container: read-only, no Linux capabilities, 128 MB limit, image pinned by digest, health check |
| [`cloudflare/configure.py`](cloudflare/configure.py) | Creates or updates the tunnel and its route, the DNS record, TLS settings, bot protection and WAF rules, through the Cloudflare API |

## Cloudflare settings

Applied by `configure.py` on every run. The script overwrites drift, so it is the source of truth.

| Area | Setting |
|---|---|
| Tunnel route | Only the staging hostname, to `http://127.0.0.1:3000`. Any other hostname gets 404. |
| DNS | Proxied CNAME to the tunnel. The server's IP address is never published. |
| TLS | Full (strict), minimum TLS 1.2, TLS 1.3 on, HTTP redirected to HTTPS, HSTS for 180 days with `nosniff` |
| Bots | Bot Fight Mode and JavaScript detections |
| WAF | Cloudflare Free Managed Ruleset (on by default), plus a custom rule that blocks probes for `/.env`, `/.git`, WordPress and phpMyAdmin paths and similar |

## Rebuilding the server

Needs: an Ubuntu 24.04 server reachable by SSH with a key, a Cloudflare zone, and an API token with the permissions listed at the top of `configure.py`.

1. **Server firewall.** Allow inbound SSH only. On Oracle Cloud this is the subnet's security list plus the image's own iptables rules, which already reject everything else. Keep those rules: Oracle advises against replacing them with `ufw`.
2. **Harden and install Docker.** Copy `deploy/server/` to the server and run:
   ```sh
   sudo bash harden.sh
   sudo bash install-docker.sh
   ```
   Reboot if `harden.sh` reports `REBOOT REQUIRED`.
3. **Cloudflare.** From any machine with Python 3, run the script and pipe the tunnel token straight to the server. The token is a secret: it is never printed or saved locally.
   ```sh
   export CLOUDFLARE_API_TOKEN=...   # read it from a file, not typed into history
   export CLOUDFLARE_ACCOUNT_ID=...
   python deploy/cloudflare/configure.py \
     --zone underplotsociety.com.br \
     --hostname staging.underplotsociety.com.br \
     --tunnel underplot-staging \
     --print-tunnel-token \
     | ssh <server> "sudo install -d -m 700 /etc/underplot && sudo tee /etc/underplot/tunnel.env >/dev/null && sudo chmod 600 /etc/underplot/tunnel.env"
   ```
4. **Start the tunnel.** Copy `deploy/tunnel/compose.yaml` to the server, then:
   ```sh
   sudo install -d /opt/underplot/tunnel
   sudo cp compose.yaml /opt/underplot/tunnel/
   cd /opt/underplot/tunnel && sudo docker compose up -d
   ```
   `docker compose ps` should show `healthy` within a minute. The container restarts on boot.

## Checking it

```sh
curl -I http://staging.underplotsociety.com.br/        # 301 to HTTPS
curl -I https://staging.underplotsociety.com.br/       # served through Cloudflare (502 until the site runs)
curl -I https://staging.underplotsociety.com.br/.env   # 403, blocked by the WAF
curl -m 5 http://<server-ip>/                          # fails: no port open
```

## Notes

- Until free Ampere A1 capacity is available, staging runs on the smaller free x86 shape (1 GB of memory). The steps above are the same on both; moving means rebuilding on the new machine and pointing the tunnel at it, with no DNS change.
- To rotate the tunnel token, reset it in Cloudflare, rerun step 3 and restart the container.
