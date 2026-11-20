# Deploy

How the staging server is built, put behind Cloudflare and deployed to. Everything here can rebuild the server from scratch on a new machine. See [ADR-005](../docs/adr/005-hosting.md) for why it is set up this way.

```
visitor --HTTPS--> Cloudflare (TLS, WAF, bot protection)
                        |
                        |  Cloudflare Tunnel (outbound from the server)
                        v
          server: cloudflared --> 127.0.0.1:8000 (API: /api/* on the site's host;
                                              admin panel: its own host, whole)
                              --> 127.0.0.1:3000 (site, everything else)
```

The server opens **no** HTTP or HTTPS port. `cloudflared` connects out to Cloudflare, and Cloudflare sends requests for the staging hostname down that connection. Requests to the server's IP address get nothing, so the firewall and bot rules cannot be bypassed. The only inbound port is SSH, with keys only.

| Path | What it does |
|---|---|
| [`server/harden.sh`](server/harden.sh) | Updates the system, enables automatic security updates (with reboot at 06:30), adds 2 GB of swap, and restricts SSH to key login for the admin user and the restricted `deploy` user, no root |
| [`server/install-docker.sh`](server/install-docker.sh) | Installs Docker Engine and Compose from Docker's repository, with [`daemon.json`](server/daemon.json): rotated logs, containers survive daemon restarts, no privilege escalation |
| [`tunnel/compose.yaml`](tunnel/compose.yaml) | The `cloudflared` container: read-only, no Linux capabilities, 128 MB limit, image pinned by digest, health check |
| [`staging/compose.yaml`](staging/compose.yaml) | The site: PostgreSQL, migrations, API and frontend, from the published images, with memory limits sized for a 1 GB server. The database has no published port. Uploaded images live in the `media` volume. The frontend gets `SITE_URL` and no `SITE_INDEXING`, so staging stays out of search engines. `REVALIDATE_SECRET`, in `/etc/underplot/staging.env`, lets the panel drop the site's cached pages after a change; without it, changes show within 5 minutes. `NEWSLETTER_URL` (the Substack address) also comes from that file; empty, the site shows no newsletter link. |
| [`staging/deploy.sh`](staging/deploy.sh) | Deploys one image tag: pulls, migrates, restarts and waits until every service is healthy |
| [`staging/backup.sh`](staging/backup.sh) | Daily encrypted database backup to a private Git repository, run by [`underplot-backup.timer`](staging/underplot-backup.timer) |
| [`cloudflare/configure.py`](cloudflare/configure.py) | Creates or updates the tunnel and its routes, the DNS records, TLS settings, bot protection and WAF rules, through the Cloudflare API |
| [`cloudflare/check_ai_block.py`](cloudflare/check_ai_block.py) | Checks from outside that AI training crawlers and agents get `403` at the edge, while browsers and search crawlers do not |

## Cloudflare settings

Applied by `configure.py` on every run. The script overwrites drift, so it is the source of truth.

| Area | Setting |
|---|---|
| Tunnel route | `staging.underplotsociety.com.br`: `/api/*` and `/storage/*` (uploaded images) to the backend on `127.0.0.1:8000`, everything else to the site on `127.0.0.1:3000`. `staging-admin.underplotsociety.com.br`: everything to the backend, which serves the admin panel at `/admin` (the panel needs several paths: its pages, Livewire and its assets). Any other hostname gets 404. |
| DNS | Proxied CNAMEs to the tunnel. The server's IP address is never published. The admin host is `staging-admin`, not `admin.staging`, because Cloudflare's free certificate covers one level of subdomain only. |
| TLS | Full (strict), minimum TLS 1.2, TLS 1.3 on, HTTP redirected to HTTPS, HSTS for 180 days with `nosniff` |
| Bots | Bot Fight Mode and JavaScript detections. Cloudflare's AI crawler categories: Training and Agent blocked on every page, Search allowed |
| WAF | Cloudflare Free Managed Ruleset (on by default), plus two custom rules. One blocks probes for `/.env`, `/.git`, WordPress and phpMyAdmin paths and similar. The other blocks the AI training crawlers and agents in [`frontend/src/seo/ai-crawlers.json`](../frontend/src/seo/ai-crawlers.json) by User-Agent, except on `/robots.txt` |

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
     --api-origin http://127.0.0.1:8000 \
     --admin-hostname staging-admin.underplotsociety.com.br \
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
5. **Site secrets.** Create `/etc/underplot/staging.env` from [`staging.env.example`](staging/staging.env.example), readable by root only:
   ```sh
   sudo install -m 600 /dev/null /etc/underplot/staging.env
   sudoedit /etc/underplot/staging.env
   ```
   Keep a copy of `APP_KEY` and `DB_PASSWORD` outside the server; restoring a backup needs them.
6. **Deploy.** Copy `deploy/staging/compose.yaml` and `deploy.sh` to `/opt/underplot/staging/`, then follow the next section.
7. **Administrator.** The panel has no sign-up. After the first deploy, create the account on the server; the command asks for the name, email and password (at least 12 characters), and the first sign-in sets up two-factor authentication:
   ```sh
   cd /opt/underplot/staging
   sudo IMAGE_TAG="$(cat deployed-tag)" docker compose --env-file /etc/underplot/staging.env exec backend php artisan admin:create
   ```
   Restoring a backup brings the account back with the database.

## Deploying

When CI passes on `main`, the [Images workflow](../.github/workflows/images.yml) builds the backend and frontend images on native x86 and ARM runners and publishes them to GitHub Container Registry as `ghcr.io/thomastds/underplot-backend` and `underplot-frontend`, tagged with the commit SHA and `main`. The server never builds anything.

A successful Images run triggers the [Deploy workflow](../.github/workflows/deploy.yml), so every merge reaches staging on its own: **CI → Images → Deploy**. Deploy connects to the server over SSH and runs `deploy.sh` with the commit SHA, which fails unless every container is healthy and `/api/health` answers `ok` on the server. The check does not go through Cloudflare: Bot Fight Mode blocks requests from GitHub's runners, and the free plan allows no exception. Deploys run one at a time and are never cancelled halfway. Each one is listed under the repository's **Environments → staging**.

`deploy.sh` pulls the images, runs the database migrations, starts the new containers and waits up to three minutes for every health check.

### How CI reaches the server

The workflow logs in as a dedicated `deploy` user whose key is restricted on the server:

- `authorized_keys` has `restrict,command="/usr/local/bin/underplot-deploy-gate"`, so the key opens no shell, no forwarding and no other command, whatever the client asks for;
- the gate ([`staging/deploy-gate.sh`](staging/deploy-gate.sh)) accepts only a 40-character commit SHA and runs `sudo /opt/underplot/staging/deploy.sh <sha>`;
- `sudoers` allows `deploy` to run that one root-owned script and nothing else;
- the `staging` environment in GitHub accepts deployments from `main` only, and holds the key, the server address and its SSH host key as secrets.

Setting it up (once per server, as root): create the user with a locked password, install the gate as `/usr/local/bin/underplot-deploy-gate`, add the key with the options above, add `deploy ALL=(root) NOPASSWD: /opt/underplot/staging/deploy.sh` to `/etc/sudoers.d/underplot-deploy`, and add `deploy` to `AllowUsers` in the SSH configuration.

### Rolling back

Run the Deploy workflow by hand (**Actions → Deploy → Run workflow**) with the previous commit SHA, from the list of deployments or from `/opt/underplot/staging/deployed-tag`, which `deploy.sh` prints as `previous` at the start. By hand on the server, `sudo bash deploy.sh <sha>` does the same.

Migrations are not reversed automatically. If a migration breaks an older version, run `php artisan migrate:rollback` in the backend container before deploying the older SHA.

## Backups

Every day at about 05:30 (UTC), `underplot-backup.timer` dumps the database with `pg_dump`, encrypts it with [age](https://age-encryption.org/) and pushes it to a private GitHub repository, so a lost server or a lost cloud account does not lose the data. The last 30 days stay in the repository tree; older dumps remain in its history.

The same run mirrors the uploaded images into `staging-media/`. They are not encrypted: they are published on the site anyway. Unencrypted files also let Git store each image once, instead of a new copy every day.

The server holds only the **public** key, so neither the server nor the repository can read a backup. The private key is kept offline by the maintainer; without it the backups cannot be restored.

**Setting up** (once per server, as root):

1. Install `age` and `git`, and put in `/etc/underplot/`:
   - `backup-recipient.txt`: the age public key;
   - `backup_deploy_key`: an SSH key with write access to the backup repository only (a GitHub deploy key);
   - `github_known_hosts`: GitHub's SSH host key, checked against the [published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints);
   - `backup.env`: `BACKUP_REMOTE=git@github.com:<owner>/<repository>.git`.
2. Copy `backup.sh` to `/opt/underplot/staging/` and the two `underplot-backup.*` units to `/etc/systemd/system/`, then:
   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable --now underplot-backup.timer
   sudo systemctl start underplot-backup.service   # first backup now
   ```

**Restoring** (on a machine with the private key and the staging stack running):

```sh
age --decrypt --identity backup-age-key.txt staging/<date>.dump.age > underplot.dump
docker exec -i underplot-db-1 pg_restore --username=underplot --dbname=underplot --clean --if-exists < underplot.dump
# Images: copy them back into the backend's volume.
docker cp staging-media/. underplot-backend-1:/app/storage/app/public/media/
```

## Checking it

```sh
curl -I http://staging.underplotsociety.com.br/        # 301 to HTTPS
curl -I https://staging.underplotsociety.com.br/       # the site, through Cloudflare
curl https://staging.underplotsociety.com.br/api/health # {"status":"ok"}
curl -I https://staging.underplotsociety.com.br/.env   # 403, blocked by the WAF
curl -I https://staging-admin.underplotsociety.com.br/admin  # 302 to the panel's login
curl -IL https://staging.underplotsociety.com.br/admin       # ends in the site's 404: the panel is not on its host
curl -m 5 http://<server-ip>/                          # fails: no port open
```

## Notes

- Until free Ampere A1 capacity is available, staging runs on the smaller free x86 shape (1 GB of memory). The steps above are the same on both; moving means rebuilding on the new machine and pointing the tunnel at it, with no DNS change.
- To rotate the tunnel token, reset it in Cloudflare, rerun step 3 and restart the container.

## AI crawlers

The site asks AI training crawlers and AI agents to stay away, and blocks them at the edge. Search crawlers stay allowed, AI search included, so the site can be found and cited with a link.

- **One list:** [`frontend/src/seo/ai-crawlers.json`](../frontend/src/seo/ai-crawlers.json). `robots.txt` (production only; staging disallows everything), the WAF rule and the check all read it.
- **Two layers at the edge:** Cloudflare's own AI crawler categories, and the WAF rule for crawlers Cloudflare does not classify. One example is `meta-externalagent`, which passed before the rule.
- **Check:**
  ```sh
  python deploy/cloudflare/check_ai_block.py https://staging.underplotsociety.com.br/en
  ```
  It exits with an error if any crawler is let in or any browser is blocked. On Windows, if Python reports an expired certificate, the system's CA store is stale: pass `--ca-file` with another bundle, such as Git's `usr/ssl/certs/ca-bundle.crt`.
- **Limitation:** on the Free plan, both layers match the User-Agent, which anyone can fake. A crawler that pretends to be a browser gets through. Cloudflare's verification of known bots, by IP and signature, is the stronger defence. The check proves the rules are in place and spare legitimate visitors; it cannot prove a disguised crawler is stopped.
