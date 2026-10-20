-- Report-card view tracking (Reports page "Viewed" eye), matching EF migration
-- 20261020115334_AddReportCardViews. EF migrations do not run on live (see CLAUDE.md), so
-- apply this by hand AFTER a backup and BEFORE deploying the code that uses these columns.
-- Additive only: four new columns, existing rows and data unchanged; the code currently live
-- ignores them, so running this first is safe.

ALTER TABLE ReportCardRecords
  ADD COLUMN FirstViewedAt datetime(6) NULL,
  ADD COLUMN LastViewedAt  datetime(6) NULL,
  ADD COLUMN ViewCount     int NOT NULL DEFAULT 0,
  ADD COLUMN DownloadedAt  datetime(6) NULL;

-- Check: should list the four new columns.
SHOW COLUMNS FROM ReportCardRecords WHERE Field IN ('FirstViewedAt','LastViewedAt','ViewCount','DownloadedAt');
