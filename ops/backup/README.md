# Nightly database backups

| File | Installed as | What it does |
|---|---|---|
| `leetec-backup.sh` | `/usr/local/sbin/leetec-backup.sh` | Dumps `leetec_sms` (consistent snapshot, no locks), gzips it, checks it, keeps 14 nightly + 8 weekly (Sunday) copies, deletes older ones |
| `leetec-backup.cron` | `/etc/cron.d/leetec-backup` | Runs the backup every night at 02:15 server time |
| `leetec-offsite.sh` | `/usr/local/sbin/leetec-offsite.sh` | 02:45: copies the backups to Google Drive (`gdrive:AHA-Backups/`), copy-only, deletes Drive copies older than 60 days. Skipped until the `gdrive` remote exists |
| `leetec-restore-test.sh` | `/usr/local/sbin/leetec-restore-test.sh` | Run by hand: restores the newest backup into a temporary database, compares row counts with live, drops it. Never touches `leetec_sms` |

Backups go to `/root/backups/nightly/` and `/root/backups/weekly/`.
Uses root's socket login to MySQL: no password is stored.

## Install / update (on the server, as root)

```
cd /var/www/leetec-sms && git pull origin main && \
install -m 700 ops/backup/leetec-backup.sh /usr/local/sbin/leetec-backup.sh && \
install -m 700 ops/backup/leetec-restore-test.sh /usr/local/sbin/leetec-restore-test.sh && \
install -m 700 ops/backup/leetec-offsite.sh /usr/local/sbin/leetec-offsite.sh && \
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

## Off-site copy to Google Drive (one-time setup)

Uses rclone with the `drive.file` scope: it can only see the files it creates, nothing else in the Drive.
Use the school's Google account, with 2-step verification on. The files contain student data.

1. On a Windows PC (PowerShell): `winget install Rclone.Rclone`, then close and reopen PowerShell.
2. On the PC: `rclone authorize "drive" "eyJzY29wZSI6ImRyaXZlLmZpbGUifQ=="`
   A browser opens: sign in, click Allow. PowerShell then prints a token between
   `Paste the following into your remote machine --->` and `<---End paste`. Copy that line. It is a
   secret: do not share it.
3. On the server (`ssh root@…`): `apt-get install -y rclone`, then create `/root/.config/rclone/rclone.conf`
   (mode 600) containing:
   ```
   [gdrive]
   type = drive
   scope = drive.file
   token = <the token line from step 2>
   ```
4. Test: `/usr/local/sbin/leetec-offsite.sh && cat /root/backups/LAST_OFFSITE_OK`

Check later: `cat /root/backups/LAST_OFFSITE_OK` (and `LAST_OFFSITE_FAILED` if it exists).
