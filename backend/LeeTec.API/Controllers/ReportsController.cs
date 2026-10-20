using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.Services;
using System.Text.Json;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReportCardService _reportCardService;

        public ReportsController(AppDbContext context, IReportCardService reportCardService)
        {
            _context = context;
            _reportCardService = reportCardService;
        }

        // ── GET /api/reports/report-card/{studentId} ─────────────────────────────

        [HttpGet("report-card/{studentId}")]
        public async Task<IActionResult> GetReportCard(int studentId, [FromQuery] int termId, [FromQuery] string? reportType = null)
        {
            var data = await _reportCardService.BuildReportCardDataAsync(studentId, termId, ReportTypes.Normalize(reportType));
            if (data == null) return NotFound(new { message = "Student or term not found" });
            return Ok(data);
        }

        // ── GET /api/reports/completion-status ───────────────────────────────────

        [HttpGet("completion-status")]
        public async Task<IActionResult> GetCompletionStatus([FromQuery] int termId, [FromQuery] int schoolId = 1)
        {
            try
            {
                var registrations = await _context.TermRegistrations
                    .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId)
                    .Include(tr => tr.Student)
                    .OrderBy(tr => tr.Student!.Surname)
                    .ThenBy(tr => tr.Student!.FirstName)
                    .ToListAsync();

                var studentIds = registrations.Select(r => r.StudentId).ToList();

                // Materialise flat rows first — avoids ToList() inside EF projection which
                // MariaDB provider cannot translate to SQL.
                var rawMarks = await _context.Marks
                    .Where(m => m.TermId == termId && studentIds.Contains(m.StudentId))
                    .Select(m => new { m.StudentId, m.SubjectId, m.AssessmentType,
                        HasScore = m.Score != null || m.Paper1Score != null || m.Paper2Score != null })
                    .ToListAsync();
                var term = await _context.Terms.FindAsync(termId);

                var enteredByStudent = rawMarks
                    .GroupBy(m => m.StudentId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(m => m.SubjectId).Distinct().ToHashSet()
                    );

                // The denominator must be each student's own active subject registrations,
                // not the full catalogue of subjects the school offers for their campus —
                // otherwise a student who has dropped down to 9 subjects still shows against
                // the original 15/17 the campus/curriculum offers.
                var rawStudentSubjects = await _context.StudentSubjects
                    .Where(ss => ss.TermId == termId && ss.IsActive && studentIds.Contains(ss.StudentId))
                    .Select(ss => new { ss.StudentId, ss.SubjectId })
                    .ToListAsync();

                var activeSubjectsByStudent = rawStudentSubjects
                    .GroupBy(ss => ss.StudentId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(ss => ss.SubjectId).Distinct().ToHashSet()
                    );

                // What is on each learner's portal (end-of-term "Published" / mid-term rows).
                var portalRows = await _context.ReportCardRecords
                        .Where(r => r.TermId == termId && studentIds.Contains(r.StudentId))
                        .Select(r => new { r.StudentId, r.Status, r.FirstViewedAt, r.LastViewedAt, r.ViewCount, r.DownloadedAt })
                        .ToListAsync();
                var portal = portalRows.ToLookup(r => r.StudentId, r => r.Status);
                object? Views(int studentId, string status)
                {
                    var r = portalRows.FirstOrDefault(x => x.StudentId == studentId && x.Status == status);
                    return r == null ? null : new { r.FirstViewedAt, r.LastViewedAt, r.ViewCount, r.DownloadedAt };
                }

                // Learners can only see reports if they have an active portal account.
                var accounts = (await _context.StudentPortalAccounts
                        .Where(a => studentIds.Contains(a.StudentId) && a.Status == "Active")
                        .Select(a => a.StudentId).ToListAsync()).ToHashSet();

                bool HasReportMarks(int studentId, string reportType)
                {
                    if (term == null) return false;
                    var active = activeSubjectsByStudent.TryGetValue(studentId, out var ids) ? ids : new HashSet<int>();
                    var campus = registrations.First(r => r.StudentId == studentId).Student?.Campus;
                    var mode = MarkPolicy.ModeFor(term, campus);
                    string? assessment = mode == MarkMode.Averaged ? null
                        : mode == MarkMode.Separate && reportType == ReportTypes.MidTerm ? MarkPolicy.MidTerm
                        : MarkPolicy.EndOfTerm;
                    return rawMarks.Any(m => m.StudentId == studentId && m.HasScore && active.Contains(m.SubjectId)
                        && (assessment == null || m.AssessmentType == assessment));
                }

                var result = registrations.Select(reg =>
                {
                    var student = reg.Student!;
                    var campus = reg.Campus ?? "";
                    var curriculumStr = student.Curriculum ?? "";

                    var activeSubjectIds = activeSubjectsByStudent.TryGetValue(reg.StudentId, out var subjectIds)
                        ? subjectIds
                        : new HashSet<int>();

                    var totalSubjects = activeSubjectIds.Count;

                    var entered = enteredByStudent.TryGetValue(reg.StudentId, out var markedIds)
                        ? markedIds.Count(id => activeSubjectIds.Contains(id))
                        : 0;

                    var fullyEntered = entered >= totalSubjects && totalSubjects > 0;
                    var status = fullyEntered ? "Ready" : entered > 0 ? "Partial" : "Not Started";

                    return new
                    {
                        studentId = reg.StudentId,
                        studentName = $"{student.FirstName} {student.Surname}",
                        studentNumber = student.StudentNumber,
                        form = reg.Form,
                        campus,
                        curriculum = curriculumStr,
                        totalSubjects,
                        enteredSubjects = entered,
                        fullyEntered,
                        status,
                        // On the portal = published AND has marks for that report (an empty
                        // report is not shown to the learner).
                        finalOnPortal = portal[reg.StudentId].Contains("Published") && HasReportMarks(reg.StudentId, ReportTypes.Final),
                        midTermOnPortal = portal[reg.StudentId].Contains(MarkPolicy.MidTermPublished) && HasReportMarks(reg.StudentId, ReportTypes.MidTerm),
                        // Whether the learner has opened / downloaded each report on the portal.
                        finalViews = Views(reg.StudentId, "Published"),
                        midTermViews = Views(reg.StudentId, MarkPolicy.MidTermPublished),
                        hasPortalAccount = accounts.Contains(reg.StudentId),
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        // ── POST /api/reports/publish ─────────────────────────────────────────────

        [HttpPost("publish")]
        public async Task<IActionResult> PublishReports([FromBody] PublishReportsRequest request)
        {
            var published = 0;
            var errors = new List<string>();
            var reportType = ReportTypes.Normalize(request.ReportType);
            var isMidTerm = reportType == ReportTypes.MidTerm;
            var status = isMidTerm ? MarkPolicy.MidTermPublished : "Published";

            if (isMidTerm)
            {
                var term = await _context.Terms.FindAsync(request.TermId);
                if (term == null || MarkPolicy.ModeFor(term, "AHJ") != MarkMode.Separate)
                    return BadRequest(new { message = "Mid-term reports exist only for Junior School (AHJ) terms from Term 3 2026." });
            }

            foreach (var studentId in request.StudentIds)
            {
                try
                {
                    if (isMidTerm && await _context.Students.Where(s => s.Id == studentId).Select(s => s.Campus).FirstOrDefaultAsync() != "AHJ")
                    {
                        errors.Add($"Student {studentId}: mid-term reports are for Junior School (AHJ) learners only");
                        continue;
                    }

                    // Never publish an empty report (e.g. an End of Term Report before any
                    // end-of-term marks exist): the learner would see a blank report card.
                    if (!await _reportCardService.HasMarksForReportAsync(studentId, request.TermId, reportType))
                    {
                        var who = await _context.Students.Where(s => s.Id == studentId)
                            .Select(s => new { s.FirstName, s.Surname, s.Campus }).FirstOrDefaultAsync();
                        var name = who == null ? $"Student {studentId}" : $"{who.FirstName} {who.Surname}";
                        errors.Add(isMidTerm
                            ? $"{name}: no mid-term marks yet"
                            : who?.Campus == "AHJ"
                                ? $"{name}: no end-of-term marks yet. For Junior mid-term reports choose \"Mid-Term Report (Junior only)\""
                                : $"{name}: no end-of-term marks yet");
                        continue;
                    }

                    var data = await _reportCardService.BuildReportCardDataAsync(studentId, request.TermId, reportType);
                    if (data == null)
                    {
                        errors.Add($"Student {studentId}: not found or no registration");
                        continue;
                    }

                    var json = JsonSerializer.Serialize(data);

                    // The mid-term report is its own row; never overwrite one with the other.
                    var existing = await _context.ReportCardRecords
                        .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TermId == request.TermId
                            && (isMidTerm ? r.Status == MarkPolicy.MidTermPublished : r.Status != MarkPolicy.MidTermPublished));

                    if (existing != null)
                    {
                        existing.ReportData = json;
                        existing.GeneratedAt = DateTime.UtcNow;
                        existing.Status = status;
                    }
                    else
                    {
                        _context.ReportCardRecords.Add(new ReportCardRecord
                        {
                            SchoolId = request.SchoolId,
                            StudentId = studentId,
                            TermId = request.TermId,
                            GeneratedAt = DateTime.UtcNow,
                            Status = status,
                            ReportData = json,
                        });
                    }

                    published++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Student {studentId}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { published, errors });
        }

        // ── GET /api/reports/student-view/{studentId} ────────────────────────────
        // Returns the published report card JSON stored in ReportCardRecords.

        [HttpGet("student-view/{studentId}")]
        public async Task<IActionResult> GetStudentView(int studentId, [FromQuery] int termId)
        {
            var record = await _context.ReportCardRecords
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TermId == termId && r.Status == "Published");

            if (record == null)
                return NotFound(new { message = "Report card not yet published for this term." });

            var data = System.Text.Json.JsonDocument.Parse(record.ReportData);
            return Ok(data.RootElement);
        }

        // ── Legacy AHJ-specific endpoint (kept for compatibility) ─────────────────

        [HttpGet("ahj-report-card/{studentId}")]
        public async Task<IActionResult> GetAhjReportCard(int studentId, [FromQuery] int termId)
        {
            var student = await _context.Students.FindAsync(studentId);
            if (student == null) return NotFound(new { message = "Student not found" });

            var term = await _context.Terms.FindAsync(termId);
            if (term == null) return NotFound(new { message = "Term not found" });

            var nextTerm = await _context.Terms
                .Where(t => t.SchoolId == term.SchoolId && t.StartDate > term.EndDate)
                .OrderBy(t => t.StartDate)
                .FirstOrDefaultAsync();

            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == student.SchoolId && s.Campus == "AHJ" && s.IsActive)
                .OrderBy(s => s.Name)
                .ToListAsync();

            var marks = await _context.Marks
                .Where(m => m.StudentId == studentId && m.TermId == termId)
                .ToListAsync();

            // Legacy AHJ endpoint: the end-of-term view (the mid-term report comes from
            // /api/reports/report-card?reportType=midterm).
            var finalMarkOnly = MarkPolicy.ModeFor(term, "AHJ") != MarkMode.Averaged;

            var subjectResults = subjects.Select(subject =>
            {
                var midterm = finalMarkOnly ? null : marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "Mid-term Test");
                var endTerm = marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "End of Term Exam");

                decimal? midtermTotal = null;
                if (midterm != null)
                    midtermTotal = Math.Min((midterm.Paper1Score ?? 0) + (midterm.Paper2Score ?? 0), 50);

                var noTerminalExam = ReportCardService.NoTerminalExamSubjects.Contains(subject.Name);

                decimal? endTermTotal = null;
                if ((!noTerminalExam || finalMarkOnly) && endTerm != null)
                    endTermTotal = Math.Min((endTerm.Paper1Score ?? 0) + (endTerm.Paper2Score ?? 0), 50);

                int? cm = null;
                if (finalMarkOnly)
                {
                    if (endTermTotal.HasValue) cm = (int)Math.Round(endTermTotal.Value, MidpointRounding.AwayFromZero);
                }
                else if (noTerminalExam)
                {
                    if (midtermTotal.HasValue) cm = (int)Math.Round(midtermTotal.Value, MidpointRounding.AwayFromZero);
                }
                else if (midtermTotal.HasValue && endTermTotal.HasValue)
                {
                    cm = (int)Math.Round((midtermTotal.Value + endTermTotal.Value) / 2, MidpointRounding.AwayFromZero);
                }
                else if (endTermTotal.HasValue)
                {
                    cm = (int)Math.Round(endTermTotal.Value, MidpointRounding.AwayFromZero);
                }
                else if (midtermTotal.HasValue)
                {
                    cm = (int)Math.Round(midtermTotal.Value, MidpointRounding.AwayFromZero);
                }

                return new
                {
                    subjectId = subject.Id,
                    name = subject.Name,
                    noTerminalExam,
                    midterm = new
                    {
                        paper1 = midterm?.Paper1Score,
                        paper2 = midterm?.Paper2Score,
                        total = midtermTotal,
                    },
                    endTerm = noTerminalExam && !finalMarkOnly ? null : (object?)new
                    {
                        paper1 = endTerm?.Paper1Score,
                        paper2 = endTerm?.Paper2Score,
                        total = endTermTotal,
                    },
                    cm,
                    band = cm.HasValue ? ReportCardService.GetBand(cm.Value) : "",
                    comments = endTerm?.Comments ?? midterm?.Comments ?? "",
                };
            }).ToList();

            return Ok(new
            {
                student = new
                {
                    firstName = student.FirstName,
                    surname = student.Surname,
                    studentNumber = student.StudentNumber,
                    form = student.Form,
                    curriculum = student.Curriculum,
                },
                term = new
                {
                    name = term.Name,
                    year = term.Year,
                    nextTermStartDate = nextTerm?.StartDate,
                },
                finalMarkOnly,
                subjects = subjectResults,
                attendance = (string?)null,
            });
        }
    }

    public class PublishReportsRequest
    {
        public int SchoolId { get; set; }
        public int TermId { get; set; }
        public int[] StudentIds { get; set; } = [];
        public string? ReportType { get; set; } // "final" (default) or "midterm" (AHJ only)
    }
}
