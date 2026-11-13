"""Configure Cloudflare for one hostname served through a Cloudflare Tunnel.

Idempotent: every run brings the account and zone to the state below, creating
what is missing and overwriting what drifted.

  1. Tunnel (remotely managed) whose only route is HOSTNAME -> ORIGIN; anything else gets 404.
  2. Proxied DNS CNAME HOSTNAME -> <tunnel id>.cfargotunnel.com.
  3. Zone TLS and HTTPS settings (full strict, TLS 1.2+, HTTPS only, HSTS).
  4. Bot Fight Mode and JavaScript detections.
  5. WAF custom rules: block common probes for secrets and admin tools.

Only the Python standard library is used. Settings come from the environment:

  CLOUDFLARE_API_TOKEN   API token (account: Cloudflare Tunnel Edit; zone: DNS, Zone,
                         Zone Settings, Zone WAF and Bot Management Edit)
  CLOUDFLARE_ACCOUNT_ID  Account ID

Usage:
  python configure.py --zone example.com --hostname staging.example.com --tunnel example-staging
  python configure.py ... --print-tunnel-token | ssh server 'sudo tee ...'

Progress goes to stderr. With --print-tunnel-token, stdout gets only the line
TUNNEL_TOKEN=<token>, meant to be piped straight to the server and never shown.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"

ZONE_SETTINGS = {
    "ssl": "strict",
    "always_use_https": "on",
    "min_tls_version": "1.2",
    "tls_1_3": "on",
    "automatic_https_rewrites": "on",
    "security_level": "medium",
    "browser_check": "on",
    "security_header": {
        "strict_transport_security": {
            "enabled": True,
            "max_age": 15552000,  # 180 days
            "include_subdomains": False,
            "preload": False,
            "nosniff": True,
        }
    },
}

PROBE_PATHS = ["/.env", "/.git", "/.aws", "/wp-", "xmlrpc.php", "phpmyadmin", "/.ds_store", "/server-status"]

WAF_RULES = [
    {
        "description": "Block probes for secrets and admin tools",
        "expression": " or ".join(f'(lower(http.request.uri.path) contains "{p}")' for p in PROBE_PATHS),
        "action": "block",
        "enabled": True,
    },
]


def log(msg):
    print(msg, file=sys.stderr, flush=True)


class Cloudflare:
    def __init__(self, token):
        self.token = token

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(API + path, data=data, method=method, headers={
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.load(resp)
        except urllib.error.HTTPError as err:
            payload = json.load(err)
            raise SystemExit(f"{method} {path} failed: {err.code} {payload.get('errors')}")
        if not payload.get("success"):
            raise SystemExit(f"{method} {path} failed: {payload.get('errors')}")
        return payload["result"]


def ensure_tunnel(cf, account, name, hostname, origin):
    found = cf.call("GET", f"/accounts/{account}/cfd_tunnel?name={name}&is_deleted=false")
    if found:
        tunnel_id = found[0]["id"]
        log(f"tunnel {name}: exists")
    else:
        tunnel_id = cf.call("POST", f"/accounts/{account}/cfd_tunnel",
                            {"name": name, "config_src": "cloudflare"})["id"]
        log(f"tunnel {name}: created")
    cf.call("PUT", f"/accounts/{account}/cfd_tunnel/{tunnel_id}/configurations", {"config": {"ingress": [
        {"hostname": hostname, "service": origin},
        {"service": "http_status:404"},
    ]}})
    log(f"tunnel {name}: {hostname} -> {origin}, everything else 404")
    return tunnel_id


def ensure_dns(cf, zone_id, hostname, tunnel_id, tunnel_name):
    record = {"type": "CNAME", "name": hostname, "content": f"{tunnel_id}.cfargotunnel.com",
              "proxied": True, "ttl": 1, "comment": f"Cloudflare Tunnel {tunnel_name}"}
    found = cf.call("GET", f"/zones/{zone_id}/dns_records?name={hostname}")
    if found:
        cf.call("PUT", f"/zones/{zone_id}/dns_records/{found[0]['id']}", record)
    else:
        cf.call("POST", f"/zones/{zone_id}/dns_records", record)
    log(f"dns {hostname}: proxied CNAME to the tunnel")


def ensure_zone_security(cf, zone_id):
    for setting, value in ZONE_SETTINGS.items():
        cf.call("PATCH", f"/zones/{zone_id}/settings/{setting}", {"value": value})
    log(f"zone settings: {', '.join(ZONE_SETTINGS)}")

    cf.call("PUT", f"/zones/{zone_id}/bot_management", {"fight_mode": True, "enable_js": True})
    log("bots: Bot Fight Mode and JavaScript detections on")

    # PUT on the phase entrypoint replaces all custom rules, so the list above is the whole truth.
    cf.call("PUT", f"/zones/{zone_id}/rulesets/phases/http_request_firewall_custom/entrypoint",
            {"rules": WAF_RULES})
    log(f"waf: {len(WAF_RULES)} custom rule(s)")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--zone", required=True)
    parser.add_argument("--hostname", required=True)
    parser.add_argument("--tunnel", required=True, help="tunnel name")
    parser.add_argument("--origin", default="http://127.0.0.1:3000")
    parser.add_argument("--print-tunnel-token", action="store_true")
    args = parser.parse_args()

    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    if not token or not account:
        raise SystemExit("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID")

    cf = Cloudflare(token)
    zones = cf.call("GET", f"/zones?name={args.zone}")
    if not zones:
        raise SystemExit(f"zone {args.zone} not found for this token")
    zone_id = zones[0]["id"]

    tunnel_id = ensure_tunnel(cf, account, args.tunnel, args.hostname, args.origin)
    ensure_dns(cf, zone_id, args.hostname, tunnel_id, args.tunnel)
    ensure_zone_security(cf, zone_id)

    if args.print_tunnel_token:
        print("TUNNEL_TOKEN=" + cf.call("GET", f"/accounts/{account}/cfd_tunnel/{tunnel_id}/token"))


if __name__ == "__main__":
    main()
