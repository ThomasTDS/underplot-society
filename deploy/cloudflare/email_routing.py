"""Receive mail at an address on the site's domain and forward it to a mailbox.

Cloudflare Email Routing (free) only receives and forwards: replies are sent from the
destination mailbox. Idempotent: every run brings the zone to this state.

  1. The destination mailbox is registered on the account. Cloudflare emails it a
     verification link the first time; forwarding starts once it is clicked.
  2. The zone stops refusing mail: the null MX ("this domain receives no mail") and the
     "-all" SPF record are removed, and Email Routing adds and locks its own MX and SPF
     records. DMARC is left as it is (p=reject: nobody can send mail as the domain).
  3. One rule: <alias>@<zone> is forwarded to the destination. Any other address is
     not accepted.

Only the Python standard library is used. Settings come from the environment:

  CLOUDFLARE_API_TOKEN   API token, with Account: Email Routing Addresses Edit and
                         Zone: Email Routing Rules Edit, DNS Edit

Usage:
  python email_routing.py --zone example.com --alias contato --to mailbox@example.net
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def call(token, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as err:
        payload = json.load(err)
        codes = [e.get("code") for e in payload.get("errors", [])]
        raise SystemExit(f"{method} {path} failed: {err.code} {codes}") from None
    if not payload.get("success"):
        raise SystemExit(f"{method} {path} failed: {[e.get('code') for e in payload.get('errors', [])]}")
    return payload["result"]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--zone", required=True)
    parser.add_argument("--alias", required=True, help="the part before @, e.g. contato")
    parser.add_argument("--to", required=True, help="the mailbox that receives the mail")
    args = parser.parse_args()
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Set CLOUDFLARE_API_TOKEN")

    zone = call(token, "GET", f"/zones?name={args.zone}")[0]
    zone_id, account = zone["id"], zone["account"]["id"]
    address = f"{args.alias}@{args.zone}"

    # 1. Destination mailbox.
    destinations = call(token, "GET", f"/accounts/{account}/email/routing/addresses")
    found = [d for d in destinations if d["email"].lower() == args.to.lower()]
    if not found:
        call(token, "POST", f"/accounts/{account}/email/routing/addresses", {"email": args.to})
        log("destination: registered; Cloudflare sent it a verification link")
    elif not found[0].get("verified"):
        log("destination: registered, still waiting for the verification link to be clicked")
    else:
        log("destination: verified")

    # 2. Let the zone receive mail: drop the records that refuse it, then enable routing.
    for record in call(token, "GET", f"/zones/{zone_id}/dns_records?name={args.zone}&per_page=100"):
        refuses = (record["type"] == "MX" and record["content"] in (".", "")) or (
            record["type"] == "TXT" and record["content"].strip('"').startswith("v=spf1") and "-all" in record["content"]
            and "_spf.mx.cloudflare.net" not in record["content"])
        if refuses:
            call(token, "DELETE", f"/zones/{zone_id}/dns_records/{record['id']}")
            log(f"dns: removed {record['type']} {record['content']}")
    settings = call(token, "GET", f"/zones/{zone_id}/email/routing")
    if not settings.get("enabled"):
        call(token, "POST", f"/zones/{zone_id}/email/routing/dns", {})
        log("email routing: enabled (MX and SPF records added by Cloudflare)")
    else:
        log("email routing: already enabled")

    # 3. The one forwarding rule. Cloudflare refuses it until the destination is verified.
    if not (found and found[0].get("verified")):
        log("rule: skipped until the destination is verified; click the link, then run this again")
        return
    rule = {
        "name": f"{address} to the project mailbox",
        "enabled": True,
        "matchers": [{"type": "literal", "field": "to", "value": address}],
        "actions": [{"type": "forward", "value": [args.to]}],
    }
    rules = call(token, "GET", f"/zones/{zone_id}/email/routing/rules")
    existing = [r for r in rules if any(m.get("value") == address for m in r.get("matchers", []))]
    if existing:
        call(token, "PUT", f"/zones/{zone_id}/email/routing/rules/{existing[0]['id']}", rule)
        log(f"rule: updated, {address} -> destination")
    else:
        call(token, "POST", f"/zones/{zone_id}/email/routing/rules", rule)
        log(f"rule: created, {address} -> destination")


if __name__ == "__main__":
    main()
