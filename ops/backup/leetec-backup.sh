#!/usr/bin/env bash
# Nightly backup of the LeeTec SMS database.
# Installed as /usr/local/sbin/leetec-backup.sh and run by /etc/cron.d/leetec-backup (see README.md).
# Uses root's local socket login to MySQL, so no password is stored anywhere.
set -euo pipefail
umask 077

DB="${LEETEC_DB:-leetec_sms}"
ROOT="${LEETEC_BACKUP_ROOT:-/root/backups}"
DAILY_DIR="$ROOT/nightly"
WEEKLY_DIR="$ROOT/weekly"
KEEP_DAILY="${LEETEC_KEEP_DAILY:-14}"
KEEP_WEEKLY="${LEETEC_KEEP_WEEKLY:-8}"
LOG="${LEETEC_BACKUP_LOG:-/var/log/leetec-backup.log}"
MIN_BYTES="${LEETEC_MIN_BYTES:-10240}"   # a real dump of this database is far bigger; smaller means something went wrong

STAMP="$(date +%F_%H%M)"
OUT="$DAILY_DIR/${DB}_${STAMP}.sql.gz"
TMP="$OUT.part"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }
fail() {
  log "FAILED: $*"
  rm -f "$TMP"
  echo "$(date '+%F %T') $*" > "$ROOT/LAST_BACKUP_FAILED"
  exit 1
}

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"
log "Starting backup of $DB"

# 1. Dump (consistent snapshot, no table locks) and compress.
mysqldump --single-transaction --quick --routines --triggers --events "$DB" | gzip -6 > "$TMP" \
  || fail "mysqldump/gzip exited with an error"

# 2. Check the file before keeping it.
gzip -t "$TMP" || fail "compressed file is corrupt"
size=$(stat -c %s "$TMP")
[ "$size" -ge "$MIN_BYTES" ] || fail "backup is only $size bytes"
zcat "$TMP" | tail -n 1 | grep -q "Dump completed" || fail "dump is incomplete (no 'Dump completed' line)"
mv "$TMP" "$OUT"

# 3. Sundays: keep a weekly copy as well.
if [ "$(date +%u)" = "7" ]; then
  cp -p "$OUT" "$WEEKLY_DIR/"
fi

# 4. Delete the oldest copies beyond the keep limits.
prune() {  # prune <dir> <keep>
  find "$1" -maxdepth 1 -type f -name "${DB}_*.sql.gz" -printf '%T@ %p\n' \
    | sort -rn | tail -n +"$(( $2 + 1 ))" | cut -d' ' -f2- | xargs -r rm -f --
}
prune "$DAILY_DIR" "$KEEP_DAILY"
prune "$WEEKLY_DIR" "$KEEP_WEEKLY"

rm -f "$ROOT/LAST_BACKUP_FAILED"
echo "$(date '+%F %T') $OUT ($(du -h "$OUT" | cut -f1))" > "$ROOT/LAST_BACKUP_OK"
log "OK: $OUT ($(du -h "$OUT" | cut -f1))"
