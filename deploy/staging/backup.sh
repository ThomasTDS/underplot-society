#!/usr/bin/env bash
# Encrypted database backup, pushed to a private Git repository off the server.
# Runs daily from underplot-backup.timer; can also be run by hand as root:
#   sudo bash backup.sh
# The dump is encrypted on the server with age, to a public key whose private half is
# kept off the server, so neither the server nor the backup repository can read it.
set -euo pipefail

etc=/etc/underplot
repo_dir=/var/lib/underplot/backups
keep_days=30
: "${BACKUP_REMOTE:?Set BACKUP_REMOTE in $etc/backup.env}"

export GIT_SSH_COMMAND="ssh -i $etc/backup_deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$etc/github_known_hosts"
git_() { git -C "$repo_dir" -c user.name="Underplot backup" -c user.email="backup@underplotsociety.com.br" "$@"; }

[ -d "$repo_dir/.git" ] || git clone --quiet "$BACKUP_REMOTE" "$repo_dir"
git_ pull --quiet --rebase

mkdir -p "$repo_dir/staging"
file="staging/$(date -u +%F).dump.age"
tmp="$repo_dir/$file.tmp"

# Custom format: compressed, and restorable table by table with pg_restore.
docker exec underplot-db-1 pg_dump --username=underplot --dbname=underplot --format=custom \
  | age --encrypt --recipients-file "$etc/backup-recipient.txt" > "$tmp"
[ -s "$tmp" ] || { echo "Empty backup"; rm -f "$tmp"; exit 1; }
mv "$tmp" "$repo_dir/$file"

# Drop files older than keep_days from the tree (they stay in the Git history).
cutoff="$(date -u -d "-$keep_days days" +%F)"
for f in "$repo_dir"/staging/*.dump.age; do
  day="$(basename "$f" .dump.age)"
  if [[ "$day" < "$cutoff" ]]; then git_ rm --quiet "staging/$day.dump.age"; fi
done

git_ add "$file"
git_ commit --quiet -m "staging backup $(date -u +%FT%TZ)"
git_ push --quiet
echo "Backed up $file ($(stat -c %s "$repo_dir/$file") bytes)"
