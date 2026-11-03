# Nightly database backups

| File | Installed as | What it does |
|---|---|---|
| `leetec-backup.sh` | `/usr/local/sbin/leetec-backup.sh` | Dumps `leetec_sms` (consistent snapshot, no locks), gzips it, checks it, keeps 14 nightly + 8 weekly (Sunday) copies, deletes older ones |
| `leetec-backup.cron` | `/etc/cron.d/leetec-backup` | Runs the backup every night at 02:15 server time |
| `leetec-restore-test.sh` | `/usr/local/sbin/leetec-restore-test.sh` | Run by hand: restores the newest backup into a temporary database, compares row counts with live, drops it. Never touches `leetec_sms` |

Backups go to `/root/backups/nightly/` and `/root/backups/weekly/`.
Uses root's socket login to MySQL: no password is stored.

## Install / update (on the server, as root)

```
cd /var/www/leetec-sms && git pull origin main && \
install -m 700 ops/backup/leetec-backup.sh /usr/local/sbin/leetec-backup.sh && \
install -m 700 ops/backup/leetec-restore-test.sh /usr/local/sbin/leetec-restore-test.sh && \
install -m 644 ops/backup/leetec-backup.cron /etc/cron.d/leetec-backup && \
/usr/local/sbin/leetec-backup.sh && cat /root/backups/LAST_BACKUP_OK
```

## Check it is working

```
cat /root/backups/LAST_BACKUP_OK          # date, file and size of the last good backup
ls /root/backups/LAST_BACKUP_FAILED       # exists only if the last run failed (it says why)
tail -n 20 /var/log/leetec-backup.log     # history
ls -lh /root/backups/nightly/             # the backup files
```

## Restore (only in an emergency, after a fresh backup of the current state)

```
zcat /root/backups/nightly/leetec_sms_YYYY-MM-DD_HHMM.sql.gz | mysql leetec_sms
```

These backups live on the same server. Keep a copy somewhere else too (see the off-site copy
instructions), or a server failure loses both the database and its backups.
