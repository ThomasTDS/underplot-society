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

  UPTIMEROBOT_API_KEY   the account's Main API Key

Usage:
  python uptimerobot.py --env staging --site https://staging.example.com --admin https://staging-admin.example.com
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.uptimerobot.com/v2/"
HTTP, KEYWORD = 1, 2
ALERT_WHEN_MISSING = 2  # keyword_type: alert when the keyword is not found
INTERVAL = 300


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def call(method, **params):
    params.update(api_key=os.environ["UPTIMEROBOT_API_KEY"], format="json")
    data = urllib.parse.urlencode(params).encode()
    for attempt in range(6):
        req = urllib.request.Request(API + method, data=data,
                                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as err:
            # The free plan allows 10 API calls a minute: wait as told, then retry.
            if err.code != 429 or attempt == 5:
                raise SystemExit(f"{method} failed: HTTP {err.code}") from None
            wait = int(err.headers.get("Retry-After") or 15)
            log(f"rate limited, waiting {wait}s")
            time.sleep(wait)
    if payload.get("stat") != "ok":
        # Never print the payload: an error can echo the API key back.
        error = payload.get("error") or {}
        raise SystemExit(f"{method} failed: {error.get('type')} {error.get('parameter_name', '')}".strip())
    return payload


def wanted(env, site, admin):
    prefix = f"Underplot {env}: "
    return prefix, [
        {"friendly_name": prefix + "site", "url": f"{site}/pt-br", "type": KEYWORD,
         "keyword_type": ALERT_WHEN_MISSING, "keyword_value": "Underplot Society"},
        {"friendly_name": prefix + "API and database", "url": f"{site}/api/health", "type": KEYWORD,
         "keyword_type": ALERT_WHEN_MISSING, "keyword_value": '"status":"ok"'},
        {"friendly_name": prefix + "admin panel", "url": f"{admin}/admin/login", "type": HTTP},
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--env", required=True, help="name in the monitors, e.g. staging or production")
    parser.add_argument("--site", required=True, help="the site's origin, e.g. https://staging.example.com")
    parser.add_argument("--admin", required=True, help="the admin panel's origin")
    args = parser.parse_args()
    if not os.environ.get("UPTIMEROBOT_API_KEY", "").strip():
        raise SystemExit("Set UPTIMEROBOT_API_KEY")

    # Status 0: not activated (email not confirmed), 1: paused, 2: active.
    all_contacts = call("getAlertContacts")["alert_contacts"]
    if not all_contacts:
        raise SystemExit("no alert contact on the account: add one (an email) first")
    if not any(c.get("status") == 2 for c in all_contacts):
        log("WARNING: no alert contact is active, so no alert will be sent. Confirm or resume the email "
            "contact in UptimeRobot (My Settings > Alert Contacts).")
    alert_contacts = "-".join(f"{c['id']}_0_0" for c in all_contacts)  # alert at once, no repeat

    prefix, monitors = wanted(args.env, args.site.rstrip("/"), args.admin.rstrip("/"))
    existing = {m["friendly_name"]: m for m in call("getMonitors")["monitors"] if m["friendly_name"].startswith(prefix)}

    for monitor in monitors:
        fields = {**monitor, "interval": INTERVAL, "alert_contacts": alert_contacts}
        current = existing.pop(monitor["friendly_name"], None)
        if current is None:
            call("newMonitor", **fields)
            log(f"created: {monitor['friendly_name']} -> {monitor['url']}")
        else:
            fields.pop("type")  # cannot change on an existing monitor
            call("editMonitor", id=current["id"], **fields)
            log(f"updated: {monitor['friendly_name']} -> {monitor['url']}")

    for name, stale in existing.items():
        call("deleteMonitor", id=stale["id"])
        log(f"deleted (no longer wanted): {name}")


if __name__ == "__main__":
    main()
