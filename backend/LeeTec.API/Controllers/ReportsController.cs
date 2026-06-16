using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using System.Text.Json;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        private static readonly HashSet<string> NoTerminalExamSubjects = new(StringComparer.OrdinalIgnoreCase)
        {
            "Music", "Robotics"
        };

        private static string GetBand(int cm)
        {
            if (cm <= 0) return "Unclassified";
            if (cm <= 10) return "Basic";
            if (cm <= 20) return "Aspiring";
            if (cm <= 30) return "Good";
            if (cm <= 40) return "High";
            return "Outstanding";
        }

        private static string GetGrade(decimal score, string curriculumType)
        {
            switch (curriculumType)
            {
                case "Cambridge Checkpoint":
                    return GetBand((int)Math.Round(score, MidpointRounding.AwayFromZero));
                case "ZIMSEC O-Level":
                    if (score >= 75) return "A";
                    if (score >= 60) return "B";
                    if (score >= 50) return "C";
                    if (score >= 45) return "D";
                    if (score >= 35) return "E";
                    return "U";
                case "ZIMSEC A-Level":
                    if (score >= 75) return "A";
                    if (score >= 60) return "B";
                    if (score >= 50) return "C";
                    if (score >= 45) return "D";
                    if (score >= 40) return "E";
                    if (score >= 35) return "O";
                    return "F";
                case "Cambridge IGCSE":
                    if (score >= 90) return "A*";
                    if (score >= 80) return "A";
                    if (score >= 70) return "B";
                    if (score >= 60) return "C";
                    if (score >= 50) return "D";
                    if (score >= 40) return "E";
                    if (score >= 30) return "F";
                    if (score >= 20) return "G";
                    return "U";
                case "Cambridge A-Level":
                    if (score >= 90) return "A*";
                    if (score >= 80) return "A";
                    if (score >= 70) return "B";
                    if (score >= 60) return "C";
                    if (score >= 50) return "D";
                    if (score >= 40) return "E";
                    return "U";
                default:
                    return "";
            }
        }

        // ── Shared report-card data builder ──────────────────────────────────────

        private async Task<object?> BuildReportCardDataAsync(int studentId, int termId)
        {
            var student = await _context.Students.FindAsync(studentId);
            if (student == null) return null;

            var term = await _context.Terms.FindAsync(termId);
            if (term == null) return null;

            var registration = await _context.TermRegistrations
                .FirstOrDefaultAsync(tr => tr.StudentId == studentId && tr.TermId == termId);

            var campus = registration?.Campus ?? "";
            var usesPapers = campus == "AHJ";
            var gradingCurriculum = campus == "AHJ" ? "Cambridge Checkpoint" : student.Curriculum;

            var subjectCurriculumType = student.Curriculum.StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase)
                ? "ZIMSEC"
                : "Cambridge";

            var nextTerm = await _context.Terms
                .Where(t => t.SchoolId == term.SchoolId && t.StartDate > term.EndDate)
                .OrderBy(t => t.StartDate)
                .FirstOrDefaultAsync();

            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == student.SchoolId && s.Campus == campus
                            && s.CurriculumType == subjectCurriculumType && s.IsActive)
                .OrderBy(s => s.Name)
                .ToListAsync();

            var marks = await _context.Marks
                .Where(m => m.StudentId == studentId && m.TermId == termId)
                .ToListAsync();

            var subjectResults = subjects.Select(subject =>
            {
                var midterm = marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "Mid-term Test");
                var endTerm = marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "End of Term Exam");

                var noTerminalExam = NoTerminalExamSubjects.Contains(subject.Name);

                decimal? midtermTotal = null;
                if (midterm != null)
                {
                    midtermTotal = usesPapers
                        ? Math.Min((midterm.Paper1Score ?? 0) + (midterm.Paper2Score ?? 0), 50)
                        : midterm.Score;
                }

                decimal? endTermTotal = null;
                if (!noTerminalExam && endTerm != null)
                {
                    endTermTotal = usesPapers
                        ? Math.Min((endTerm.Paper1Score ?? 0) + (endTerm.Paper2Score ?? 0), 50)
                        : endTerm.Score;
                }

                decimal? cm = null;
                if (noTerminalExam)
                {
                    cm = midtermTotal;
                }
                else if (midtermTotal.HasValue && endTermTotal.HasValue)
                {
                    cm = Math.Round((midtermTotal.Value + endTermTotal.Value) / 2, 0, MidpointRounding.AwayFromZero);
                }
                else if (endTermTotal.HasValue)
                {
                    cm = Math.Round(endTermTotal.Value, 0, MidpointRounding.AwayFromZero);
                }
                else if (midtermTotal.HasValue)
                {
                    cm = Math.Round(midtermTotal.Value, 0, MidpointRounding.AwayFromZero);
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
                        comments = midterm?.Comments ?? "",
                    },
                    endTerm = noTerminalExam ? null : (object?)new
                    {
                        paper1 = endTerm?.Paper1Score,
                        paper2 = endTerm?.Paper2Score,
                        total = endTermTotal,
                        comments = endTerm?.Comments ?? "",
                    },
                    cm = cm.HasValue ? (int?)cm.Value : null,
                    grade = cm.HasValue ? GetGrade(cm.Value, gradingCurriculum) : "",
                };
            }).ToList();

            return new
            {
                student = new
                {
                    firstName = student.FirstName,
                    surname = student.Surname,
                    studentNumber = student.StudentNumber,
                    form = student.Form,
                    campus,
                    curriculum = student.Curriculum,
                },
                term = new
                {
                    name = term.Name,
                    year = term.Year,
                    nextTermStartDate = nextTerm?.StartDate,
                },
                usesPapers,
                gradingCurriculum,
                subjects = subjectResults,
                attendance = (string?)null,
            };
        }

        // ── GET /api/reports/report-card/{studentId} ─────────────────────────────

        [HttpGet("report-card/{studentId}")]
        public async Task<IActionResult> GetReportCard(int studentId, [FromQuery] int termId)
        {
            var data = await BuildReportCardDataAsync(studentId, termId);
            if (data == null) return NotFound(new { message = "Student or term not found" });
            return Ok(data);
        }

        // ── GET /api/reports/completion-status ───────────────────────────────────

        [HttpGet("completion-status")]
        public async Task<IActionResult> GetCompletionStatus([FromQuery] int termId, [FromQuery] int schoolId = 1)
        {
            var registrations = await _context.TermRegistrations
                .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId)
                .Include(tr => tr.Student)
                .OrderBy(tr => tr.Student!.Surname)
                .ThenBy(tr => tr.Student!.FirstName)
                .ToListAsync();

            var studentIds = registrations.Select(r => r.StudentId).ToList();

            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == schoolId && s.IsActive)
                .ToListAsync();

            // Distinct subject IDs per student that have at least one mark in this term
            var enteredSubjectMap = await _context.Marks
                .Where(m => m.TermId == termId && studentIds.Contains(m.StudentId))
                .GroupBy(m => m.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    EnteredSubjectIds = g.Select(m => m.SubjectId).Distinct().ToList()
                })
                .ToListAsync();

            var enteredByStudent = enteredSubjectMap.ToDictionary(e => e.StudentId, e => e.EnteredSubjectIds);

            var result = registrations.Select(reg =>
            {
                var student = reg.Student!;
                var campus = reg.Campus;
                var curriculumType = student.Curriculum.StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase)
                    ? "ZIMSEC" : "Cambridge";

                var campusSubjectIds = subjects
                    .Where(s => s.Campus == campus && s.CurriculumType == curriculumType)
                    .Select(s => s.Id)
                    .ToHashSet();

                var totalSubjects = campusSubjectIds.Count;

                var entered = enteredByStudent.TryGetValue(reg.StudentId, out var ids)
                    ? ids.Count(id => campusSubjectIds.Contains(id))
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
                    curriculum = student.Curriculum,
                    totalSubjects,
                    enteredSubjects = entered,
                    fullyEntered,
                    status,
                };
            }).ToList();

            return Ok(result);
        }

        // ── POST /api/reports/publish ─────────────────────────────────────────────

        [HttpPost("publish")]
        public async Task<IActionResult> PublishReports([FromBody] PublishReportsRequest request)
        {
            var published = 0;
            var errors = new List<string>();

            foreach (var studentId in request.StudentIds)
            {
                try
                {
                    var data = await BuildReportCardDataAsync(studentId, request.TermId);
                    if (data == null)
                    {
                        errors.Add($"Student {studentId}: not found or no registration");
                        continue;
                    }

                    var json = JsonSerializer.Serialize(data);

                    var existing = await _context.ReportCardRecords
                        .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TermId == request.TermId);

                    if (existing != null)
                    {
                        existing.ReportData = json;
                        existing.GeneratedAt = DateTime.UtcNow;
                        existing.Status = "Published";
                    }
                    else
                    {
                        _context.ReportCardRecords.Add(new ReportCardRecord
                        {
                            SchoolId = request.SchoolId,
                            StudentId = studentId,
                            TermId = request.TermId,
                            GeneratedAt = DateTime.UtcNow,
                            Status = "Published",
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

            var subjectResults = subjects.Select(subject =>
            {
                var midterm = marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "Mid-term Test");
                var endTerm = marks.FirstOrDefault(m => m.SubjectId == subject.Id && m.AssessmentType == "End of Term Exam");

                decimal? midtermTotal = null;
                if (midterm != null)
                    midtermTotal = Math.Min((midterm.Paper1Score ?? 0) + (midterm.Paper2Score ?? 0), 50);

                var noTerminalExam = NoTerminalExamSubjects.Contains(subject.Name);

                decimal? endTermTotal = null;
                if (!noTerminalExam && endTerm != null)
                    endTermTotal = Math.Min((endTerm.Paper1Score ?? 0) + (endTerm.Paper2Score ?? 0), 50);

                int? cm = null;
                if (noTerminalExam)
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
                    endTerm = noTerminalExam ? null : (object?)new
                    {
                        paper1 = endTerm?.Paper1Score,
                        paper2 = endTerm?.Paper2Score,
                        total = endTermTotal,
                    },
                    cm,
                    band = cm.HasValue ? GetBand(cm.Value) : "",
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
    }
}
