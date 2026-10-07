# LeeTec SMS — Project Guide

School management system for **Advent Hope Academy** (adventhopeacademy.com), a Zimbabwean school
group running Cambridge and ZIMSEC programmes across three campuses: **AHA** (O-Level, Forms 1–4),
**AHS** (A-Level, Lower 6 / Upper 6) and **AHJ** (junior: Nursery, ECD A/B, Grades 1–7).

## Repos

- **C:\leetec-sms** is the working repo. `main` matches what is deployed. Branch from main for every change.
- **C:\leetec-sms-dev** is an older clone holding unmerged WIP (permissions/RequirePermission, attendance,
  audit log, login security). It is not deployed; don't assume its features exist in C:\leetec-sms.

## Tech stack

**Backend**: `backend/LeeTec.API`
- ASP.NET Core / .NET 8 Web API, EF Core with Pomelo MySQL (MariaDB 10.4 compatibility mode)
- JWT bearer auth (admin token carries user id, email, name only: no roles, schoolId or permissions yet)
- BCrypt.Net-Next for passwords, MailKit for email
- DB connection from env vars `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
  (see top of `Program.cs`). Never commit credentials.

**Frontend**: `frontend/`
- React 19 + TypeScript, Vite 8, Tailwind CSS 4, react-router-dom 7, axios
- jspdf/jspdf-autotable, xlsx, docx for exports; lucide-react icons
- API base URL from `VITE_API_URL` (falls back to `http://localhost:5208`)

## Production hosting

- **API:** Contabo VPS (Ubuntu 24.04). Published to `/var/www/leetec-api`, run by systemd unit
  `leetec-api` on `localhost:5208`, behind nginx (`api.adventhopeacademy.com`). DB settings live in the
  unit file's environment, not in git.
- **Server git checkout:** `/var/www/leetec-sms`. Deploy = pull there, `dotnet publish` into
  `/var/www/leetec-api` (keep the server's own `appsettings*.json`), `systemctl restart leetec-api`.
- **Database:** MySQL 8 on the same server, database `leetec_sms`. Root uses socket auth locally.
- **Backups:** `/root/backups/`. Take one (`mysqldump --single-transaction leetec_sms > …`) before any
  data fix or deploy.
- **Frontend:** Vercel static build from GitHub (`vercel.json` routes everything to `frontend/index.html`).
- `railway.toml` and the "Health check for Railway" comment are leftovers; Railway is not in use.

### EF migrations do NOT run on live
`__EFMigrationsHistory` on live lists only the first 2 migrations. `Program.cs` calls `Migrate()`,
which fails on migration #3 ("table exists") and is swallowed as "Migration warning". So a new
migration never applies on live. Generate SQL with `dotnet ef migrations script <last-applied> <new>`
and apply it by hand (after a backup). Fixing the history table is a separate, unstarted task.

## Domain model (Controllers + Models)

- **Auth & access**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`; `AuthController`,
  `TeacherAuthController`, `ActivationController`, `UsersController`
- **Students**: `Student`, `Family`, `Guardian`, `EmergencyContact`, `InvoicingDetail`; `StudentsController`
- **Fees & billing**: `Term`, `FeeCategory`, `FeePackage`, `FeePackageItem`, `Invoice`, `InvoiceItem`,
  `Payment`, `Bursary`; `FeesController` (also owns term create/activate)
- **Academics**: `Subject`, `StudentSubject`, `SubjectChangeRequest`, `TeacherSubjectAssignment`;
  `SubjectsController`, `TeacherAssignmentsController`
- **Marks & reports**: `Mark`, `ReportCardRecord`; `MarksController`, `ReportsController`, `ReportCardService`
- **Term registrations**: `TermRegistration`; `TermRegistrationsController` (register, promote, copy subjects)
- **Portals**: `StudentPortalAccount`/`StudentPortalController`; teacher dashboard uses `MarksController`
- **Other**: `Homework`, `Announcement`, `DailyVerse`, `SuperAdminController`

## Data model gotchas

- **StudentSubjects are per term** (`TermId`). Only the "Copy Subjects from Previous Term" button (or
  creating a student, campus change, approved subject request, manual add) creates them.
- **Teacher entry sheet** (`GET /api/marks/entry-sheet`) lists students from StudentSubjects
  (subject + term, IsActive) joined to **Student.Form/Campus**, not from TermRegistrations.
  No subjects for the term means "No students registered for … in this term" for every teacher.
- **Subjects are campus + curriculum wide** (`Subjects.Level` is one value per campus), not per form.
- **Registering students** (`/termregistrations/register`, Promote All Paid) creates TermRegistrations
  only: no invoices, no subjects.
- **Invoices** come only from Fees → Generate Invoices (all Active students; skips anyone who already has
  an invoice for that term) or Charge Individual.

## Term rollover checklist (every new term, in this order)

1. **Back up** the live database into `/root/backups/` with a dated name.
2. **Create and activate the term** (Admin → Terms & Periods). Activating only flips `IsActive`.
3. **Register students** (Register Students, or Promote All Paid). Update Student.Form/Campus for
   promotions first; the teacher sheet uses those, not the registration snapshot.
4. **Copy subjects** (Terms → Copy Subjects from Previous Term). Check the preview's per-class counts
   look like last term, then confirm. Give students listed as needing subjects by hand (campus or
   curriculum change, e.g. AHA Form 4 → AHS Lower 6 in January) their subjects via Students → Subjects.
   Skipping this step leaves every teacher sheet empty.
5. **Generate invoices** (Fees). Safe to re-run (skips existing invoices); use Charge Individual for one student.
6. **Check a teacher sheet** for one class per campus (AHA, AHJ, AHS): the counts should be non-zero
   and match class size.

## Working rules

- Read-only investigation on live by default; any live data change needs a backup first, a dry-run or
  preview, one transaction, and a row-count check before COMMIT.
- Never print passwords, tokens or connection strings.
- `backups/` (SQL dumps with real student data) and the live-DB scripts `db-backup/backup-live.mjs` /
  `sync-live-to-local.mjs` are gitignored; never force-add them. Stage files by name, not `git add -A`.
- Known repo hygiene debt (not yet fixed): `db-backup/` is tracked, including raw MySQL data files
  (`*.ibd`, real data), `node_modules/` and scripts with DB passwords; `appsettings.json` is tracked with
  a dev JWT key (live uses its own key from `appsettings.Production.json`); bin/ and obj/ are tracked.
  Don't commit build-output changes.
