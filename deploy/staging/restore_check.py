"""Prove that the latest backup can be restored, and that what comes back is whole.

1. Fetches the backup repository (a shallow clone, with your GitHub access).
2. Starts a throwaway PostgreSQL container, the same version as the server's.
3. Inside it, decrypts the latest dump with the private key and restores it.
4. Checks the result:
   - every table the app needs exists;
   - every migration in the dump is one the code knows;
   - there is an administrator, and areas and articles to show;
   - each published article is published in every language;
   - each uploaded image has its file in the mirrored media.
5. Removes the container and the decrypted data, pass or fail.

The private key never leaves this machine except as a read-only mount into the
container, and nothing is written outside a temporary folder.

Needs Docker and git. Only the Python standard library is used.

Usage:
  python deploy/staging/restore_check.py --key C:\\Users\\me\\.underplot\\backup-age-key.txt
  python deploy/staging/restore_check.py --key KEY --repo https://github.com/<owner>/<repo>.git
"""
import argparse
import json
import secrets
import subprocess
import sys
import tempfile
import time
from pathlib import Path

POSTGRES_IMAGE = "postgres:18.6-alpine3.24"  # as in deploy/staging/compose.yaml
MIGRATIONS = Path(__file__).resolve().parents[2] / "backend" / "database" / "migrations"
LOCALES = {"en", "pt-br", "es"}
REQUIRED_TABLES = {
    "users", "migrations", "sessions", "cache",
    "areas", "area_translations", "articles", "article_translations",
    "media", "media_translations",
}


def run(*args, stdin=None, check=True):
    result = subprocess.run(args, input=stdin, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise SystemExit(f"{' '.join(args[:3])}... failed:\n{result.stderr.strip()}")
    return result.stdout


def sql(container, query):
    """Rows of a query, each a list of strings (tab-separated psql output)."""
    out = run("docker", "exec", container, "psql", "-U", "underplot", "-d", "underplot",
              "-At", "-F", "\t", "-c", query)
    return [line.split("\t") for line in out.splitlines() if line]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--key", required=True, help="the age private key (backup-age-key.txt)")
    parser.add_argument("--repo", default="https://github.com/ThomasTDS/underplot-backups.git")
    args = parser.parse_args()
    key = Path(args.key).resolve()
    if not key.is_file():
        raise SystemExit(f"key not found: {key}")

    failures = []

    def check(ok, message):
        print(f"{'ok  ' if ok else 'FAIL'} {message}")
        if not ok:
            failures.append(message)

    with tempfile.TemporaryDirectory(prefix="underplot-restore-") as tmp:
        backups = Path(tmp) / "backups"
        run("git", "clone", "--quiet", "--depth", "1", args.repo, str(backups))
        dumps = sorted((backups / "staging").glob("*.dump.age"))
        if not dumps:
            raise SystemExit("no dump in the backup repository")
        dump = dumps[-1]
        print(f"latest dump: {dump.name} ({dump.stat().st_size} bytes)")
        check(dump.name[:10] >= time.strftime("%Y-%m-%d", time.gmtime(time.time() - 2 * 86400)),
              "the latest dump is at most two days old (the backup is still running)")

        container = f"underplot-restore-check-{secrets.token_hex(4)}"
        run("docker", "run", "-d", "--rm", "--name", container,
            "-e", "POSTGRES_USER=underplot", "-e", "POSTGRES_DB=underplot",
            "-e", f"POSTGRES_PASSWORD={secrets.token_urlsafe(24)}",
            "-v", f"{dump.parent}:/backup:ro", "-v", f"{key}:/key.txt:ro",
            POSTGRES_IMAGE)
        try:
            for _ in range(60):
                if subprocess.run(["docker", "exec", container, "pg_isready", "-U", "underplot", "-d", "underplot"],
                                  capture_output=True).returncode == 0:
                    break
                time.sleep(1)
            else:
                raise SystemExit("the temporary database did not start")
            time.sleep(2)  # the image restarts the server once after its first setup

            run("docker", "exec", container, "apk", "add", "--no-cache", "--quiet", "age")
            run("docker", "exec", container, "sh", "-c",
                f"age --decrypt --identity /key.txt /backup/{dump.name} "
                "| pg_restore --username=underplot --dbname=underplot --no-owner --exit-on-error")
            print("restored into a throwaway database")

            tables = {r[0] for r in sql(container, "select tablename from pg_tables where schemaname = 'public'")}
            missing = REQUIRED_TABLES - tables
            check(not missing, f"all {len(REQUIRED_TABLES)} required tables exist" + (f" (missing: {sorted(missing)})" if missing else ""))

            known = {p.stem for p in MIGRATIONS.glob("*.php")}
            applied = {r[0] for r in sql(container, "select migration from migrations")}
            unknown = applied - known
            check(applied and not unknown, f"{len(applied)} migrations, all known to the code"
                  + (f" (unknown: {sorted(unknown)})" if unknown else ""))

            counts = {t: int(sql(container, f"select count(*) from {t}")[0][0])
                      for t in sorted(REQUIRED_TABLES & tables | ({"page_views"} & tables))}
            print("rows: " + json.dumps(counts))
            check(counts.get("users", 0) >= 1, "there is an administrator")
            check(counts.get("areas", 0) >= 1 and counts.get("articles", 0) >= 1, "there are areas and articles")

            partial = sql(container, """
                select article_id, string_agg(locale, ',' order by locale)
                from article_translations where status = 'published'
                group by article_id""")
            incomplete = [a for a, locales in partial if set(locales.split(",")) != LOCALES]
            check(not incomplete, f"{len(partial)} published articles, each in all three languages"
                  + (f" (incomplete: {incomplete})" if incomplete else ""))

            mirrored = backups / "staging-media"
            paths = [r[0] for r in sql(container, "select path from media")]
            lost = [p for p in paths if not (mirrored / p.removeprefix("media/")).is_file()]
            check(not lost, f"{len(paths)} images, each with its file in the media mirror"
                  + (f" (missing: {lost[:5]})" if lost else ""))
        finally:
            subprocess.run(["docker", "rm", "-f", container], capture_output=True)
            print("removed the throwaway database")

    print()
    if failures:
        print(f"{len(failures)} check(s) failed")
        sys.exit(1)
    print("the backup restores and is whole")


if __name__ == "__main__":
    main()
