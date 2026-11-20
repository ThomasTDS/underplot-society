"""Check, from outside, that AI crawlers are blocked at the edge and everyone else is not.

For every AI training crawler and agent in frontend/src/seo/ai-crawlers.json, a request
with its name in the User-Agent must get 403. Ordinary browsers and the search
crawlers in the "allowed" list must get 200. /robots.txt stays readable to the blocked
crawlers, so they can see they are asked to stay away.

Limitation: this checks by User-Agent, which anyone can fake. Cloudflare's own bot
verification (by IP and signature) is the real defence; this script proves the rules
are in place and do not catch legitimate visitors. Search crawlers that Cloudflare
verifies (Googlebot, Bingbot) may be refused when faked from here, so they are
checked only for not being blocked by these rules (any answer but 403 counts).

Only the Python standard library is used.

Usage:
  python check_ai_block.py https://staging.underplotsociety.com.br/en
  python check_ai_block.py URL --ca-file ca-bundle.crt   # if the system's CA store is stale
"""
import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

LIST = Path(__file__).resolve().parents[2] / "frontend" / "src" / "seo" / "ai-crawlers.json"

BROWSERS = {
    "Chrome": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Firefox": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Safari (iPhone)": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
}

# Verified by Cloudflare by IP: a fake one from here may be refused for that reason.
VERIFIED_SEARCH = {"Googlebot", "Bingbot", "DuckDuckBot", "Applebot"}


def crawler_agent(name):
    """A User-Agent in the shape real crawlers use."""
    return f"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; {name}/1.0; +https://example.com/bot)"


def status(url, user_agent, context):
    req = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=context) as resp:
            return resp.status
    except urllib.error.HTTPError as err:
        return err.code


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("url", help="a page of the site, e.g. https://staging.example.com/en")
    parser.add_argument("--ca-file", help="CA bundle to verify TLS with, instead of the system's store")
    args = parser.parse_args()
    context = ssl.create_default_context(cafile=args.ca_file)
    url = args.url
    robots = url.split("/", 3)[0] + "//" + url.split("/", 3)[2] + "/robots.txt"

    crawlers = json.loads(LIST.read_text(encoding="utf-8"))
    checks = []  # (label, user agent, url, expectation, description)
    for name in crawlers["training"] + crawlers["agents"]:
        checks.append((name, crawler_agent(name), url, lambda s: s == 403, "403"))
    for name in crawlers["training"][:3]:
        checks.append((f"{name} on robots.txt", crawler_agent(name), robots, lambda s: s != 403, "not 403"))
    for label, agent in BROWSERS.items():
        checks.append((label, agent, url, lambda s: s == 200, "200"))
    for name in crawlers["allowed"]:
        if name in VERIFIED_SEARCH:
            checks.append((name, crawler_agent(name), url, lambda s: s != 403, "not 403"))
        else:
            checks.append((name, crawler_agent(name), url, lambda s: s == 200, "200"))

    failures = 0
    for label, agent, target, ok, expected in checks:
        got = status(target, agent, context)
        good = ok(got)
        failures += not good
        print(f"{'ok  ' if good else 'FAIL'} {got}  {label}  (expected {expected})")
        time.sleep(0.2)  # be gentle with the site and the edge

    print(f"\n{len(checks) - failures} of {len(checks)} checks passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
