using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;

namespace LeeTec.API.Services
{
    public interface IReportCardService
    {
        Task<object?> BuildReportCardDataAsync(int studentId, int termId);
    }

    // Single source of truth for the ReportCardData shape consumed by
    // frontend/src/utils/reportCard.ts's generateReportCard(), used by both
    // the admin report-card endpoint and the student portal report-card endpoint.
    public class ReportCardService : IReportCardService
    {
        private readonly AppDbContext _context;

        public ReportCardService(AppDbContext context)
        {
            _context = context;
        }

        public static readonly HashSet<string> NoTerminalExamSubjects = new(StringComparer.OrdinalIgnoreCase)
        {
            "Music", "Robotics"
        };

        public static string GetBand(int cm)
        {
            if (cm <= 0) return "Unclassified";
            if (cm <= 10) return "Basic";
            if (cm <= 20) return "Aspiring";
            if (cm <= 30) return "Good";
            if (cm <= 40) return "High";
            return "Outstanding";
        }

        // Unified curriculum-aware grading: any curriculum string containing
        // "CAMBRIDGE" uses the single Cambridge scale (A*-U) regardless of level;
        // "A-LEVEL" (checked after Cambridge) uses the ZIMSEC A-Level scale (A-F);
        // everything else falls back to the ZIMSEC O-Level scale (A-U).
        public static string GetGrade(decimal score, string curriculumType)
        {
            var c = (curriculumType ?? "").ToUpperInvariant();

            if (c.Contains("CAMBRIDGE"))
            {
                if (score >= 90) return "A*";
                if (score >= 80) return "A";
                if (score >= 70) return "B";
                if (score >= 60) return "C";
                if (score >= 50) return "D";
                if (score >= 40) return "E";
                if (score >= 30) return "F";
                if (score >= 20) return "G";
                return "U";
            }

            if (c.Contains("A-LEVEL") || c.Contains("A LEVEL"))
            {
                if (score >= 70) return "A";
                if (score >= 60) return "B";
                if (score >= 50) return "C";
                if (score >= 45) return "D";
                if (score >= 40) return "E";
                if (score >= 35) return "O";
                return "F";
            }

            // ZIMSEC O-Level default
            if (score >= 70) return "A";
            if (score >= 60) return "B";
            if (score >= 50) return "C";
            if (score >= 45) return "D";
            if (score >= 40) return "E";
            return "U";
        }

        public async Task<object?> BuildReportCardDataAsync(int studentId, int termId)
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

            var nextTerm = await _context.Terms
                .Where(t => t.SchoolId == term.SchoolId && t.StartDate > term.EndDate)
                .OrderBy(t => t.StartDate)
                .FirstOrDefaultAsync();

            // Only subjects with at least one mark recorded for this student/term —
            // group the student's marks by subject, then join to Subjects for names.
            var marks = await _context.Marks
                .Where(m => m.StudentId == studentId && m.TermId == termId)
                .Include(m => m.Subject)
                .ToListAsync();

            var subjectGroups = marks
                .Where(m => m.Subject != null)
                .GroupBy(m => m.Subject!)
                .OrderBy(g => g.Key.Name);

            var subjectResults = subjectGroups.Select(g =>
            {
                var subject = g.Key;
                var midterm = g.FirstOrDefault(m => m.AssessmentType == "Mid-term Test");
                var endTerm = g.FirstOrDefault(m => m.AssessmentType == "End of Term Exam");

                var noTerminalExam = NoTerminalExamSubjects.Contains(subject.Name);

                // AHJ's Paper1/Paper2 fields are only ever populated by the admin-only
                // paper-based entry screen (MarksEntryPage.tsx); the teacher portal's
                // actual marks-entry flow (TeacherDashboardPage.tsx) always saves a
                // single combined score to Score, for every campus including AHJ. If
                // neither paper is set, fall back to Score so real submitted AHJ marks
                // don't compute to 0/blank just because they weren't entered as papers.
                decimal? midtermTotal = null;
                if (midterm != null)
                {
                    midtermTotal = usesPapers && (midterm.Paper1Score.HasValue || midterm.Paper2Score.HasValue)
                        ? Math.Min((midterm.Paper1Score ?? 0) + (midterm.Paper2Score ?? 0), 50)
                        : midterm.Score;
                }

                // No Terminal Examination subjects (Music, Robotics) used to skip this
                // entirely and read only midtermTotal below, on the assumption their one
                // real assessment is always entered as "Mid-term Test". In practice the
                // teacher portal's unified entry UI lets either box be used for any
                // subject, so a No-Terminal-Exam mark saved under "End of Term Exam"
                // (as most are, per fc0c4dc) was silently dropped, leaving Final
                // Mark/Band blank despite a real, even Approved, Score. Compute it here
                // like any other subject instead.
                decimal? endTermTotal = null;
                if (endTerm != null)
                {
                    endTermTotal = usesPapers && (endTerm.Paper1Score.HasValue || endTerm.Paper2Score.HasValue)
                        ? Math.Min((endTerm.Paper1Score ?? 0) + (endTerm.Paper2Score ?? 0), 50)
                        : endTerm.Score;
                }

                // No Terminal Examination subjects have a single assessment point in
                // principle, but since it can land in either box, resolve cm the same
                // way as regular subjects: average if both are somehow filled, otherwise
                // whichever one actually has a value.
                decimal? cm = null;
                if (midtermTotal.HasValue && endTermTotal.HasValue)
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

                // Grade thresholds are percentage-based (0-100), and teachers already
                // enter AHJ scores doubled from the true /50 mark (e.g. 76 for a true
                // 38/50) specifically so it reads as a percentage — that doubled value
                // IS the mathematically correct percentage, so Grade must be computed
                // from the raw cm before any halving below.
                var grade = cm.HasValue ? GetGrade(cm.Value, gradingCurriculum) : "";

                // AHJ/Cambridge Checkpoint's real scale is 0-50; teachers enter doubled
                // marks so Grade above works correctly. Final Mark and Band must show
                // the true /50 value, so halve cm for display only, after Grade has
                // already used the raw (doubled) value.
                var displayCm = usesPapers && cm.HasValue
                    ? Math.Round(cm.Value / 2m, MidpointRounding.AwayFromZero)
                    : cm;

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
                    cm = displayCm.HasValue ? (int?)displayCm.Value : null,
                    grade = grade,
                    band = usesPapers && displayCm.HasValue
                        ? GetBand((int)displayCm.Value)
                        : null,
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
    }
}
