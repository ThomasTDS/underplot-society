# Deploy

How the servers are built, put behind Cloudflare and deployed to. There are two, each on its own free 1 GB VM: **staging**, which every merge reaches on its own, and **production**, which gets a commit only when it is released by hand. They are built the same way, and everything here can rebuild either one from scratch on a new machine. On the server, the environment is the name of the folder that holds the scripts: `/opt/underplot/staging` or `/opt/underplot/production`. See [ADR-005](../docs/adr/005-hosting.md) for why it is set up this way.

```
visitor --HTTPS--> Cloudflare (TLS, WAF, bot protection)
                        |
                        |  Cloudflare Tunnel (outbound from the server)
                        v
          server: cloudflared --> 127.0.0.1:8000 (API: /api/* on the site's host;
                                              admin panel: its own host, whole)
                              --> 127.0.0.1:3000 (site, everything else)
```

The server opens **no** HTTP or HTTPS port. `cloudflared` connects out to Cloudflare, and Cloudflare sends requests for the server's hostnames down that connection. Requests to the server's IP address get nothing, so the firewall and bot rules cannot be bypassed. The only inbound port is SSH, with keys only.

| Path | What it does |
|---|---|
| [`server/harden.sh`](server/harden.sh) | Updates the system, enables automatic security updates (with reboot at 06:30), adds 2 GB of swap, and restricts SSH to key login for the admin user and the restricted `deploy` user, no root |
| [`server/install-docker.sh`](server/install-docker.sh) | Installs Docker Engine and Compose from Docker's repository, with [`daemon.json`](server/daemon.json): rotated logs, containers survive daemon restarts, no privilege escalation |
| [`tunnel/compose.yaml`](tunnel/compose.yaml) | The `cloudflared` container: read-only, no Linux capabilities, 128 MB limit, image pinned by digest, health check |
| [`app/compose.yaml`](app/compose.yaml) | The site: PostgreSQL, migrations, API and frontend, from the published images, with memory limits sized for a 1 GB server. The database has no published port. Uploaded images live in the `media` volume. Everything that differs between staging and production comes from `/etc/underplot/<environment>.env` ([`app.env.example`](app/app.env.example)): the site and admin hosts, `SITE_INDEXING` (`on` in production only), `REVALIDATE_SECRET` and `NEWSLETTER_URL`. |
| [`app/deploy.sh`](app/deploy.sh) | Deploys one commit: fetches that commit's `compose.yaml`, pulls the images, migrates, restarts and waits until every service is healthy |
| [`app/backup.sh`](app/backup.sh) | Daily encrypted database backup to a private Git repository, run by [`underplot-backup@<environment>.timer`](app/underplot-backup@.timer) |
| [`cloudflare/configure.py`](cloudflare/configure.py) | Creates or updates the tunnel and its routes, the DNS records, TLS settings, bot protection and WAF rules, through the Cloudflare API |
| [`monitoring/uptimerobot.py`](monitoring/uptimerobot.py) | Creates or updates the external uptime monitors on UptimeRobot (site, API with database, admin panel) |
| [`cloudflare/email_routing.py`](cloudflare/email_routing.py) | Receives mail at `contato@` on the domain and forwards it to the project mailbox (Cloudflare Email Routing, free) |
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
5. **Site settings and secrets.** Create `/etc/underplot/<environment>.env` from [`app.env.example`](app/app.env.example), readable by root only:
   ```sh
   sudo install -m 600 /dev/null /etc/underplot/<environment>.env
   sudoedit /etc/underplot/<environment>.env
   ```
   Keep a copy of `APP_KEY` and `DB_PASSWORD` outside the server; restoring a backup needs them.
6. **Deploy.** Copy `deploy/app/deploy.sh` to `/opt/underplot/<environment>/` (root-owned); it fetches `compose.yaml` itself on every deploy. Then follow the next section.
7. **Administrator.** The panel has no sign-up. After the first deploy, create the account on the server; the command asks for the name, email and password (at least 12 characters), and the first sign-in sets up two-factor authentication:
   ```sh
   cd /opt/underplot/<environment>
   sudo IMAGE_TAG="$(cat deployed-tag)" docker compose --env-file /etc/underplot/<environment>.env exec backend php artisan admin:create
   ```
   Restoring a backup brings the account back with the database.

## Deploying

When CI passes on `main`, the [Images workflow](../.github/workflows/images.yml) builds the backend and frontend images on native x86 and ARM runners and publishes them to GitHub Container Registry as `ghcr.io/thomastds/underplot-backend` and `underplot-frontend`, tagged with the commit SHA and `main`. The server never builds anything.

A successful Images run triggers the [Deploy workflow](../.github/workflows/deploy.yml), so every merge reaches staging on its own: **CI → Images → Deploy**. Production gets a commit only when it is released by hand: **Actions → Deploy → Run workflow**, with the commit SHA and `production`, and the `production` environment waits for the maintainer's approval. Deploy connects to the server over SSH and runs `deploy.sh` with the commit SHA, which fails unless every container is healthy and `/api/health` answers `ok` on the server. The check does not go through Cloudflare: Bot Fight Mode blocks requests from GitHub's runners, and the free plan allows no exception. Deploys run one at a time and are never cancelled halfway. Each one is listed under the repository's **Environments**.

`deploy.sh` fetches `compose.yaml` from the repository as it was in that commit, so the server runs exactly the stack the commit was tested with, and a rollback brings back the matching stack too. Nothing is copied to the server by hand. The file is validated with `docker compose config` before it replaces the current one.

`deploy.sh` pulls the images, runs the database migrations, starts the new containers and waits up to three minutes for every health check.

### How CI reaches the server

The workflow logs in as a dedicated `deploy` user whose key is restricted on the server:

- `authorized_keys` has `restrict,command="/usr/local/bin/underplot-deploy-gate <environment>"`, so the key opens no shell, no forwarding and no other command, whatever the client asks for;
- the gate ([`app/deploy-gate.sh`](app/deploy-gate.sh)) accepts only a 40-character commit SHA and runs `sudo /opt/underplot/<environment>/deploy.sh <sha>`;
- `sudoers` allows `deploy` to run that one root-owned script and nothing else;
- each GitHub environment (`staging`, `production`) accepts deployments from `main` only, and holds that server's key, address and SSH host key as secrets (`STAGING_*`, `PRODUCTION_*`). `production` also needs the maintainer's approval.

Setting it up (once per server, as root): create the user with a locked password, install the gate as `/usr/local/bin/underplot-deploy-gate`, add the key with the options above, add `deploy ALL=(root) NOPASSWD: /opt/underplot/<environment>/deploy.sh` to `/etc/sudoers.d/underplot-deploy`, and add `deploy` to `AllowUsers` in the SSH configuration.

### Rolling back

Run the Deploy workflow by hand (**Actions → Deploy → Run workflow**) with the previous commit SHA, from the list of deployments or from `/opt/underplot/<environment>/deployed-tag`, which `deploy.sh` prints as `previous` at the start. By hand on the server, `sudo bash deploy.sh <sha>` does the same.

Migrations are not reversed automatically. If a migration breaks an older version, run `php artisan migrate:rollback` in the backend container before deploying the older SHA.

## Backups

Every day at about 05:30 (UTC), `underplot-backup.timer` dumps the database with `pg_dump`, encrypts it with [age](https://age-encryption.org/) and pushes it to a private GitHub repository, so a lost server or a lost cloud account does not lose the data. The last 30 days stay in the repository tree; older dumps remain in its history.

Each environment has its own folders in the repository: `staging/` and `production/` for the dumps, `staging-media/` and `production-media/` for the images. The same run mirrors the uploaded images into `<environment>-media/`. They are not encrypted: they are published on the site anyway. Unencrypted files also let Git store each image once, instead of a new copy every day.

The server holds only the **public** key, so neither the server nor the repository can read a backup. The private key is kept offline by the maintainer; without it the backups cannot be restored.

**Setting up** (once per server, as root):

1. Install `age` and `git`, and put in `/etc/underplot/`:
   - `backup-recipient.txt`: the age public key;
   - `backup_deploy_key`: an SSH key with write access to the backup repository only (a GitHub deploy key);
   - `github_known_hosts`: GitHub's SSH host key, checked against the [published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints);
   - `backup.env`: `BACKUP_REMOTE=git@github.com:<owner>/<repository>.git`.
2. Copy `backup.sh` to `/opt/underplot/<environment>/` and the two `underplot-backup@.*` units to `/etc/systemd/system/`, then:
   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable --now underplot-backup@<environment>.timer
   sudo systemctl start underplot-backup@<environment>.service   # first backup now
   ```

**Checking that a backup restores** (run it before launch, and after any change to the database or the backup):

```sh
python deploy/app/restore_check.py --key path/to/backup-age-key.txt [--env production]
```

The script works in a throwaway PostgreSQL container, the server's version:
1. It decrypts the latest dump inside the container and restores it there.
2. It checks the result:
   - every table the app needs exists;
   - every migration is one the code knows;
   - there is an administrator, and areas and articles to show;
   - each published article is published in all three languages;
   - each image has its file in the media mirror.
3. It removes the container.

It needs only Docker and git, not `age`: `age` is installed inside the container. It exits with an error if any check fails.

**Restoring** (on a machine with the private key and the stack running):

```sh
age --decrypt --identity backup-age-key.txt <environment>/<date>.dump.age > underplot.dump
docker exec -i underplot-db-1 pg_restore --username=underplot --dbname=underplot --clean --if-exists < underplot.dump
# Images: copy them back into the backend's volume.
docker cp <environment>-media/. underplot-backend-1:/app/storage/app/public/media/
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

## Uptime monitoring

UptimeRobot (free plan) checks every 5 minutes, from outside, what a visitor sees. Each check goes through Cloudflare, the tunnel, the server and the database:

| Monitor | Fails when |
|---|---|
| Site | `/pt-br` does not answer, or the page lacks the site's name |
| API and database | `/api/health` does not answer `{"status":"ok"}` |
| Admin panel | the sign-in page does not answer |

**Why not GitHub's runners:** Cloudflare's Bot Fight Mode blocks them, and the Free plan cannot exempt them. UptimeRobot's checker is a verified bot, so it is let through.

Alerts go to the account's alert contacts. The script warns if none is active: an email contact must be confirmed first.

```sh
export UPTIMEROBOT_API_KEY=...   # the main API key (API v3), read from a file, not typed into history
python deploy/monitoring/uptimerobot.py --env staging \
  --site https://staging.underplotsociety.com.br \
  --admin https://staging-admin.underplotsociety.com.br
```

The script is idempotent, and it only touches monitors named `Underplot <env>: ...`. On the free plan the API allows 10 calls a minute; the script waits when told to.

## Email

The domain receives mail at one address only, `contato@underplotsociety.com.br`, the contact shown on the Privacy and Accessibility pages. Cloudflare Email Routing (free) forwards it to the project mailbox. Replies are sent from that mailbox, because Email Routing only receives. Nobody can send mail as the domain: DMARC stays at `p=reject`.

```sh
export CLOUDFLARE_API_TOKEN=...   # also needs Email Routing Addresses (account) and Email Routing Rules (zone)
python deploy/cloudflare/email_routing.py --zone underplotsociety.com.br --alias contato --to <project mailbox>
```

The script runs these steps:
1. It registers the destination mailbox. The first time, Cloudflare emails it a verification link, and forwarding starts once that link is clicked.
2. It removes the records that refuse mail (the null MX and the `-all` SPF) and enables routing, which adds Cloudflare's MX and SPF records.
3. It creates the forwarding rule.

Any other address on the domain is rejected.
