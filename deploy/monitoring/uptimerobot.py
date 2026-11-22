"""Create or update the external uptime monitors on UptimeRobot.

Idempotent: monitors are matched by name, created when missing and updated when they
drift. Monitors whose names do not start with the prefix below are left alone.

Monitors (every 5 minutes, the free plan's interval; alerts go to every active alert
contact on the account, usually the account's email):

  - the site: a page must answer and contain the site's name;
  - the API: /api/health must answer {"status":"ok"} (it checks the database too);
  - the admin panel: its sign-in page must answer.

UptimeRobot checks from outside, from several regions, so it sees what a visitor
sees: Cloudflare, the tunnel, the server and the database. (GitHub's runners cannot do
it: Cloudflare's Bot Fight Mode blocks them, and the Free plan cannot exempt them.)

Only the Python standard library is used. Settings come from the environment:

  UPTIMEROBOT_API_KEY   the account's main API key (API v3)

Usage:
  python uptimerobot.py --env staging --site https://staging.example.com --admin https://staging-admin.example.com
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.uptimerobot.com/v3"
INTERVAL = 300
TIMEOUT = 30


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def call(method, path, body=None):
    """One API call. path is relative to the API, or a full URL (the nextLink of a list)."""
    url = path if path.startswith("https://") else API + path
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(6):
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {os.environ['UPTIMEROBOT_API_KEY'].strip()}",
            "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
            return json.loads(raw) if raw else None
        except urllib.error.HTTPError as err:
            # The free plan allows 10 API calls a minute: wait as told, then retry.
            if err.code == 429 and attempt < 5:
                wait = int(err.headers.get("Retry-After") or 15)
                log(f"rate limited, waiting {wait}s")
                time.sleep(wait)
                continue
            # Validation messages name fields only; never print headers or the request.
            try:
                detail = json.load(err).get("message")
            except ValueError:
                detail = None
            raise SystemExit(f"{method} {url.removeprefix(API)} failed: HTTP {err.code} {detail or ''}".strip()) from None
    raise SystemExit(f"{method} {path} failed: rate limited")


def list_all(path):
    items, url = [], path
    while url:
        page = call("GET", url)
        items += page["data"]
        url = page.get("nextLink")
    return items


def wanted(env, site, admin):
    prefix = f"Underplot {env}: "
    keyword = {"type": "KEYWORD", "keywordType": "ALERT_NOT_EXISTS", "keywordCaseType": "CaseSensitive"}
    return prefix, [
        {"friendlyName": prefix + "site", "url": f"{site}/pt-br", **keyword, "keywordValue": "Underplot Society"},
        {"friendlyName": prefix + "API and database", "url": f"{site}/api/health", **keyword,
         "keywordValue": '"status":"ok"'},
        {"friendlyName": prefix + "admin panel", "url": f"{admin}/admin/login", "type": "HTTP"},
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--env", required=True, help="name in the monitors, e.g. staging or production")
    parser.add_argument("--site", required=True, help="the site's origin, e.g. https://staging.example.com")
    parser.add_argument("--admin", required=True, help="the admin panel's origin")
    args = parser.parse_args()
    if not os.environ.get("UPTIMEROBOT_API_KEY", "").strip():
        raise SystemExit("Set UPTIMEROBOT_API_KEY")

    all_contacts = list_all("/alert-contacts")
    if not all_contacts:
        raise SystemExit("no alert contact on the account: add one (an email) first")
    if not any(c.get("status") == "Active" for c in all_contacts):
        log("WARNING: no alert contact is active, so no alert will be sent. Confirm or resume the email "
            "contact in UptimeRobot.")
    # Alert at once (threshold 0), no repeat (recurrence 0).
    contacts = [{"alertContactId": str(c["id"]), "threshold": 0, "recurrence": 0} for c in all_contacts]

    prefix, monitors = wanted(args.env, args.site.rstrip("/"), args.admin.rstrip("/"))
    existing = {m["friendlyName"]: m for m in list_all("/monitors") if m["friendlyName"].startswith(prefix)}

    for monitor in monitors:
        fields = {**monitor, "interval": INTERVAL, "timeout": TIMEOUT, "assignedAlertContacts": contacts}
        current = existing.pop(monitor["friendlyName"], None)
        if current is None:
            call("POST", "/monitors", fields)
            log(f"created: {monitor['friendlyName']} -> {monitor['url']}")
        else:
            fields.pop("type")  # cannot change on an existing monitor
            call("PATCH", f"/monitors/{current['id']}", fields)
            log(f"updated: {monitor['friendlyName']} -> {monitor['url']}")

    for name, stale in existing.items():
        call("DELETE", f"/monitors/{stale['id']}")
        log(f"deleted (no longer wanted): {name}")


if __name__ == "__main__":
    main()
