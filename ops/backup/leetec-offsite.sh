#!/usr/bin/env bash
# Copies the nightly/weekly database backups off the server to Google Drive (rclone remote "gdrive").
# Installed as /usr/local/sbin/leetec-offsite.sh and run by /etc/cron.d/leetec-backup after the backup.
# Copy-only: files deleted on the server are never deleted from Drive by this. Drive copies older
# than KEEP_DAYS are removed so the folder does not grow forever.
set -euo pipefail
umask 077

ROOT="${LEETEC_BACKUP_ROOT:-/root/backups}"
REMOTE="${LEETEC_OFFSITE_REMOTE:-gdrive:AHA-Backups}"
KEEP_DAYS="${LEETEC_OFFSITE_KEEP_DAYS:-60}"
LOG="${LEETEC_BACKUP_LOG:-/var/log/leetec-backup.log}"

log() { echo "$(date '+%F %T') offsite: $*" >> "$LOG"; }
fail() {
  log "FAILED: $*"
  echo "$(date '+%F %T') $*" > "$ROOT/LAST_OFFSITE_FAILED"
  exit 1
}

[ -f "$ROOT/LAST_BACKUP_FAILED" ] && log "warning: last local backup failed; copying what exists"

for kind in nightly weekly; do
  # Nothing to send yet (e.g. no Sunday copy so far).
  [ -n "$(find "$ROOT/$kind" -maxdepth 1 -type f -name '*.sql.gz' 2>/dev/null | head -n 1)" ] || continue
  rclone copy "$ROOT/$kind" "$REMOTE/$kind" --include "*.sql.gz" --retries 3 --low-level-retries 10 \
    || fail "upload of $kind backups to $REMOTE failed"
  rclone delete "$REMOTE/$kind" --min-age "${KEEP_DAYS}d" --include "*.sql.gz" \
    || log "warning: could not prune old $kind copies on $REMOTE"
done

# Confirm the newest local backup is really there.
newest=$(find "$ROOT/nightly" -maxdepth 1 -type f -name '*.sql.gz' -printf '%T@ %f\n' | sort -rn | head -n 1 | cut -d' ' -f2-)
if [ -n "$newest" ]; then
  rclone lsf "$REMOTE/nightly" --include "$newest" | grep -qx "$newest" \
    || fail "$newest is not on $REMOTE after upload"
fi

count=$(rclone lsf "$REMOTE/nightly" --include "*.sql.gz" | wc -l)
rm -f "$ROOT/LAST_OFFSITE_FAILED"
echo "$(date '+%F %T') $newest copied to $REMOTE ($count nightly copies there)" > "$ROOT/LAST_OFFSITE_OK"
log "OK: $newest copied to $REMOTE ($count nightly copies there)"
