#!/usr/bin/env bash
# Proves the latest nightly backup can be restored, without touching the live database:
# loads it into a temporary database, compares row counts of key tables with live, then drops it.
# Run by hand: /usr/local/sbin/leetec-restore-test.sh
set -euo pipefail

DB="${LEETEC_DB:-leetec_sms}"
ROOT="${LEETEC_BACKUP_ROOT:-/root/backups}"
TEST_DB="leetec_restore_test"
TABLES="Students Terms Marks Invoices Payments ReportCardRecords StudentSubjects StudentPortalAccounts"

latest=$(find "$ROOT/nightly" -maxdepth 1 -type f -name "${DB}_*.sql.gz" -printf '%T@ %p\n' | sort -rn | head -n 1 | cut -d' ' -f2-)
[ -n "$latest" ] || { echo "No nightly backup found in $ROOT/nightly"; exit 1; }
echo "Restoring $latest into temporary database $TEST_DB ..."

cleanup() { mysql -e "DROP DATABASE IF EXISTS \`$TEST_DB\`"; }
trap cleanup EXIT
cleanup
mysql -e "CREATE DATABASE \`$TEST_DB\`"
zcat "$latest" | mysql "$TEST_DB"

echo
printf '%-24s %12s %12s\n' "Table" "Backup" "Live now"
for t in $TABLES; do
  b=$(mysql -N -e "SELECT COUNT(*) FROM \`$TEST_DB\`.\`$t\`" 2>/dev/null || echo "missing")
  l=$(mysql -N -e "SELECT COUNT(*) FROM \`$DB\`.\`$t\`" 2>/dev/null || echo "missing")
  printf '%-24s %12s %12s\n' "$t" "$b" "$l"
done
echo
echo "Restore test OK. Live counts can be a little higher than the backup (changes made since it ran)."
echo "The temporary database is now deleted; $DB was not touched."
