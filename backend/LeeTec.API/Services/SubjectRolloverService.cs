using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Services
{
    public interface ISubjectRolloverService
    {
        Task<SubjectRolloverResult> CopyFromPreviousTermAsync(
            int targetTermId, int schoolId, int? sourceTermId, bool dryRun, int? expectedInserts);
    }

    public class SubjectRolloverClassRow
    {
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public int Students { get; set; }
        public int ToInsert { get; set; }
        public int SkippedExisting { get; set; }
        public int SkippedInactiveSubject { get; set; }
        public int SkippedCampusOrCurriculum { get; set; }
    }

    public class SubjectRolloverStudentRow
    {
        public int StudentId { get; set; }
        public string StudentNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class SubjectRolloverResult
    {
        public bool Ok { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool DryRun { get; set; }
        public int SourceTermId { get; set; }
        public string SourceTermName { get; set; } = string.Empty;
        public int TargetTermId { get; set; }
        public string TargetTermName { get; set; } = string.Empty;
        public int ToInsert { get; set; }
        public int Inserted { get; set; }
        public int SkippedExisting { get; set; }
        public int SkippedInactiveSubject { get; set; }
        public int SkippedCampusOrCurriculum { get; set; }
        public List<SubjectRolloverClassRow> PerClass { get; set; } = new();
        public List<SubjectRolloverStudentRow> NeedsManualSubjects { get; set; } = new();
    }

    // Copies active StudentSubjects from the previous term into a target term for Active
    // students registered in that term. Subjects are campus + curriculum wide (not per form),
    // so a class change is fine, but a campus or curriculum change makes the old subjects
    // invalid, and a since-deactivated subject shouldn't come back: those rows are skipped
    // and the student is listed for manual handling.
    public class SubjectRolloverService : ISubjectRolloverService
    {
        private readonly AppDbContext _context;

        public SubjectRolloverService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SubjectRolloverResult> CopyFromPreviousTermAsync(
            int targetTermId, int schoolId, int? sourceTermId, bool dryRun, int? expectedInserts)
        {
            var result = new SubjectRolloverResult { DryRun = dryRun, TargetTermId = targetTermId };

            var target = await _context.Terms.FirstOrDefaultAsync(t => t.Id == targetTermId && t.SchoolId == schoolId);
            if (target == null) return Fail(result, "Target term not found.");
            result.TargetTermName = target.Name;

            var source = sourceTermId.HasValue
                ? await _context.Terms.FirstOrDefaultAsync(t => t.Id == sourceTermId.Value && t.SchoolId == schoolId)
                : await _context.Terms
                    .Where(t => t.SchoolId == schoolId && t.StartDate < target.StartDate)
                    .OrderByDescending(t => t.StartDate)
                    .FirstOrDefaultAsync();
            if (source == null || source.Id == target.Id)
                return Fail(result, "No previous term found to copy subjects from.");
            result.SourceTermId = source.Id;
            result.SourceTermName = source.Name;

            if (!await _context.StudentSubjects.AnyAsync(ss => ss.TermId == source.Id && ss.SchoolId == schoolId && ss.IsActive))
                return Fail(result, $"{source.Name} has no active subjects — nothing to copy.");

            // "Active" is the only TermRegistrations.Status value in use (checked on live 2026-10-07).
            var students = await _context.TermRegistrations
                .Where(r => r.TermId == target.Id && r.SchoolId == schoolId && r.Status == "Active")
                .Join(_context.Students.Where(s => s.Status == "Active"),
                    r => r.StudentId, s => s.Id,
                    (r, s) => new { s.Id, s.StudentNumber, s.FirstName, s.Surname, s.Campus, s.Form, s.Curriculum })
                .Distinct()
                .ToListAsync();
            var studentIds = students.Select(s => s.Id).ToList();

            var sourceByStudent = (await _context.StudentSubjects
                    .Where(ss => ss.TermId == source.Id && ss.IsActive && studentIds.Contains(ss.StudentId))
                    .Join(_context.Subjects, ss => ss.SubjectId, sub => sub.Id,
                        (ss, sub) => new { ss.StudentId, ss.SubjectId, ss.SchoolId, sub.Campus, sub.CurriculumType, sub.IsActive })
                    .ToListAsync())
                .ToLookup(r => r.StudentId);

            // Any existing target row counts, including dropped (inactive) ones, so a subject
            // the student dropped this term never comes back.
            var existing = (await _context.StudentSubjects
                    .Where(ss => ss.TermId == target.Id && studentIds.Contains(ss.StudentId))
                    .Select(ss => new { ss.StudentId, ss.SubjectId })
                    .ToListAsync())
                .Select(x => (x.StudentId, x.SubjectId))
                .ToHashSet();
            var studentsWithTargetRows = existing.Select(e => e.StudentId).ToHashSet();

            var toInsert = new List<StudentSubject>();
            var perClass = new Dictionary<(string, string), SubjectRolloverClassRow>();
            var now = DateTime.UtcNow;

            foreach (var s in students)
            {
                if (!perClass.TryGetValue((s.Campus, s.Form), out var row))
                    perClass[(s.Campus, s.Form)] = row = new SubjectRolloverClassRow { Campus = s.Campus, Form = s.Form };
                row.Students++;

                var curriculumType = (s.Curriculum ?? "").StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase) ? "ZIMSEC" : "Cambridge";
                var copied = 0;
                var inactiveSubject = 0;
                var campusOrCurriculum = 0;

                foreach (var src in sourceByStudent[s.Id])
                {
                    if (existing.Contains((s.Id, src.SubjectId))) { row.SkippedExisting++; continue; }
                    if (!src.IsActive) { row.SkippedInactiveSubject++; inactiveSubject++; continue; }
                    if (src.Campus != s.Campus || src.CurriculumType != curriculumType)
                    {
                        row.SkippedCampusOrCurriculum++;
                        campusOrCurriculum++;
                        continue;
                    }

                    existing.Add((s.Id, src.SubjectId)); // also guards against duplicate source rows
                    toInsert.Add(new StudentSubject
                    {
                        StudentId = s.Id,
                        SubjectId = src.SubjectId,
                        TermId = target.Id,
                        SchoolId = src.SchoolId,
                        IsActive = true,
                        Status = "Confirmed",
                        CreatedAt = now,
                    });
                    row.ToInsert++;
                    copied++;
                }

                var reasons = new List<string>();
                if (campusOrCurriculum > 0)
                    reasons.Add($"{campusOrCurriculum} subject(s) skipped: campus or curriculum changed since {source.Name}");
                if (inactiveSubject > 0)
                    reasons.Add($"{inactiveSubject} subject(s) skipped: subject has since been deactivated");
                if (reasons.Count == 0 && copied == 0 && !studentsWithTargetRows.Contains(s.Id))
                    reasons.Add($"No active subjects in {source.Name}");

                if (reasons.Count > 0)
                    result.NeedsManualSubjects.Add(new SubjectRolloverStudentRow
                    {
                        StudentId = s.Id,
                        StudentNumber = s.StudentNumber,
                        Name = $"{s.FirstName} {s.Surname}",
                        Campus = s.Campus,
                        Form = s.Form,
                        Reason = string.Join("; ", reasons),
                    });
            }

            result.PerClass = perClass.Values.OrderBy(r => r.Campus).ThenBy(r => r.Form).ToList();
            result.ToInsert = toInsert.Count;
            result.SkippedExisting = result.PerClass.Sum(r => r.SkippedExisting);
            result.SkippedInactiveSubject = result.PerClass.Sum(r => r.SkippedInactiveSubject);
            result.SkippedCampusOrCurriculum = result.PerClass.Sum(r => r.SkippedCampusOrCurriculum);

            if (dryRun)
            {
                result.Ok = true;
                result.Message = $"Preview: {toInsert.Count} subject rows would be copied from {source.Name} to {target.Name}.";
                return result;
            }

            // The admin confirms the number shown in the preview; if anything changed since, they must look again.
            if (expectedInserts.HasValue && expectedInserts.Value != toInsert.Count)
                return Fail(result, $"Data changed since the preview (expected {expectedInserts}, now {toInsert.Count}). Run the preview again.");

            if (toInsert.Count == 0)
            {
                result.Ok = true;
                result.Message = "Nothing to copy — every student already has their subjects for this term.";
                return result;
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.StudentSubjects.AddRange(toInsert);
                var written = await _context.SaveChangesAsync();
                if (written != toInsert.Count)
                {
                    await tx.RollbackAsync();
                    _context.ChangeTracker.Clear();
                    return Fail(result, $"Expected to write {toInsert.Count} rows but wrote {written}; rolled back.");
                }
                await tx.CommitAsync();
            }
            catch (DbUpdateException ex)
            {
                await tx.RollbackAsync();
                _context.ChangeTracker.Clear();
                return Fail(result, $"Copy failed and was rolled back: {ex.InnerException?.Message ?? ex.Message}");
            }

            result.Ok = true;
            result.Inserted = toInsert.Count;
            result.Message = $"Copied {toInsert.Count} subject rows from {source.Name} to {target.Name}.";
            return result;
        }

        private static SubjectRolloverResult Fail(SubjectRolloverResult result, string message)
        {
            result.Ok = false;
            result.Message = message;
            return result;
        }
    }
}
