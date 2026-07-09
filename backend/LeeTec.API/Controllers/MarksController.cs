using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/marks")]
    public class MarksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MarksController(AppDbContext context)
        {
            _context = context;
        }

        // ENTRY SHEET — students for campus/form/term, with existing marks for the subject+assessment
        [HttpGet("entry-sheet")]
        public async Task<IActionResult> GetEntrySheet(
            [FromQuery] int termId,
            [FromQuery] string campus,
            [FromQuery] string form,
            [FromQuery] int subjectId,
            [FromQuery] string assessmentType,
            [FromQuery] int schoolId = 1,
            [FromQuery] int? teacherId = null)
        {
            if (teacherId.HasValue)
            {
                var hasAssignment = await _context.TeacherSubjectAssignments.AnyAsync(a =>
                    a.TeacherId == teacherId.Value &&
                    a.SubjectId == subjectId &&
                    a.Campus == campus &&
                    a.Form == form &&
                    a.IsActive);
                if (!hasAssignment)
                    return StatusCode(403, new { message = "You are not assigned to teach this subject for this class." });
            }

            var subject = await _context.Subjects.FindAsync(subjectId);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            var registrations = await _context.TermRegistrations
                .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId && tr.Campus == campus && tr.Form == form)
                .Include(tr => tr.Student)
                .OrderBy(tr => tr.Student!.Surname).ThenBy(tr => tr.Student!.FirstName)
                .ToListAsync();

            var studentIds = registrations.Select(r => r.StudentId).ToList();

            var existingMarks = await _context.Marks
                .Where(m => m.TermId == termId && m.SubjectId == subjectId && m.AssessmentType == assessmentType && studentIds.Contains(m.StudentId))
                .ToListAsync();

            var result = registrations.Select(tr =>
            {
                var mark = existingMarks.FirstOrDefault(m => m.StudentId == tr.StudentId);
                return new MarkResponseDTO
                {
                    MarkId = mark?.Id,
                    StudentId = tr.StudentId,
                    StudentName = $"{tr.Student!.FirstName} {tr.Student.Surname}",
                    StudentNumber = tr.Student.StudentNumber,
                    SubjectId = subject.Id,
                    SubjectName = subject.Name,
                    AssessmentType = assessmentType,
                    Paper1Score = mark?.Paper1Score,
                    Paper2Score = mark?.Paper2Score,
                    Score = mark?.Score,
                    Comments = mark?.Comments,
                };
            }).ToList();

            return Ok(result);
        }

        // BULK SAVE — upsert marks for a subject + term + assessment type
        [HttpPost("bulk-save")]
        public async Task<IActionResult> BulkSaveMarks([FromBody] BulkSaveMarksDTO dto)
        {
            if (dto.TeacherId.HasValue && dto.Campus != null && dto.Form != null)
            {
                var hasAssignment = await _context.TeacherSubjectAssignments.AnyAsync(a =>
                    a.TeacherId == dto.TeacherId.Value &&
                    a.SubjectId == dto.SubjectId &&
                    a.Campus == dto.Campus &&
                    a.Form == dto.Form &&
                    a.IsActive);
                if (!hasAssignment)
                    return StatusCode(403, new { message = "You are not assigned to teach this subject for this class." });
            }

            // Combined midterm + end-of-term entries (unified marks entry table)
            if (dto.Marks != null && dto.Marks.Count > 0)
            {
                var combinedStudentIds = dto.Marks.Select(m => m.StudentId).ToList();
                var combinedExisting = await _context.Marks
                    .Where(m => m.TermId == dto.TermId && m.SubjectId == dto.SubjectId
                        && combinedStudentIds.Contains(m.StudentId)
                        && (m.AssessmentType == "Mid-term Test" || m.AssessmentType == "End of Term Exam"))
                    .ToListAsync();

                int combinedSaved = 0;
                foreach (var entry in dto.Marks)
                {
                    UpsertAssessmentMark(combinedExisting, dto, entry.StudentId, "Mid-term Test", entry.MidtermScore, entry.Comments);
                    UpsertAssessmentMark(combinedExisting, dto, entry.StudentId, "End of Term Exam", entry.EndOfTermScore, entry.Comments);
                    combinedSaved++;
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = $"Marks saved for {combinedSaved} students", saved = combinedSaved });
            }

            var studentIds = dto.Entries.Select(e => e.StudentId).ToList();

            var existingMarks = await _context.Marks
                .Where(m => m.TermId == dto.TermId && m.SubjectId == dto.SubjectId && m.AssessmentType == dto.AssessmentType && studentIds.Contains(m.StudentId))
                .ToListAsync();

            int saved = 0;
            foreach (var entry in dto.Entries)
            {
                var mark = existingMarks.FirstOrDefault(m => m.StudentId == entry.StudentId);
                if (mark == null)
                {
                    mark = new Mark
                    {
                        SchoolId = dto.SchoolId,
                        StudentId = entry.StudentId,
                        SubjectId = dto.SubjectId,
                        TermId = dto.TermId,
                        AssessmentType = dto.AssessmentType,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _context.Marks.Add(mark);
                }

                mark.Paper1Score = entry.Paper1Score;
                mark.Paper2Score = entry.Paper2Score;
                mark.Score = entry.Score;
                mark.Comments = entry.Comments;
                mark.UpdatedAt = DateTime.UtcNow;
                saved++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Marks saved for {saved} students", saved });
        }

        // STUDENT MARKS — all marks for a student in a term, grouped by subject
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentMarks(int studentId, [FromQuery] int termId)
        {
            var marks = await _context.Marks
                .Where(m => m.StudentId == studentId && m.TermId == termId)
                .Include(m => m.Subject)
                .ToListAsync();

            var grouped = marks
                .GroupBy(m => new { m.SubjectId, SubjectName = m.Subject?.Name ?? "" })
                .Select(g => new
                {
                    SubjectId = g.Key.SubjectId,
                    SubjectName = g.Key.SubjectName,
                    Marks = g.Select(m => new
                    {
                        m.Id,
                        m.AssessmentType,
                        m.Paper1Score,
                        m.Paper2Score,
                        m.Score,
                        m.Comments,
                    })
                });

            return Ok(grouped);
        }

        private void UpsertAssessmentMark(List<Mark> existing, BulkSaveMarksDTO dto, int studentId, string assessmentType, decimal? score, string? comments)
        {
            var mark = existing.FirstOrDefault(m => m.StudentId == studentId && m.AssessmentType == assessmentType);
            if (mark == null)
            {
                mark = new Mark
                {
                    SchoolId = dto.SchoolId,
                    StudentId = studentId,
                    SubjectId = dto.SubjectId,
                    TermId = dto.TermId,
                    AssessmentType = assessmentType,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.Marks.Add(mark);
                existing.Add(mark);
            }

            mark.Score = score;
            mark.Comments = comments;
            mark.UpdatedAt = DateTime.UtcNow;
        }

        private static string CalculateGrade(decimal total)
        {
            if (total >= 90) return "A*";
            if (total >= 80) return "A";
            if (total >= 70) return "B";
            if (total >= 60) return "C";
            if (total >= 50) return "D";
            if (total >= 40) return "E";
            return "U";
        }

        // PUBLISH REPORT CARDS — mark all students matching campus/form as published for a term
        [HttpPost("publish-report-cards")]
        public async Task<IActionResult> PublishReportCards([FromBody] PublishReportCardsRequest request)
        {
            var query = _context.TermRegistrations
                .Where(tr => tr.TermId == request.TermId && tr.SchoolId == request.SchoolId);

            if (!string.IsNullOrEmpty(request.Campus) && request.Campus != "All")
                query = query.Where(tr => tr.Campus == request.Campus);
            if (!string.IsNullOrEmpty(request.Form) && request.Form != "All")
                query = query.Where(tr => tr.Form == request.Form);

            var studentIds = await query.Select(tr => tr.StudentId).Distinct().ToListAsync();

            var existingRecords = await _context.ReportCardRecords
                .Where(r => r.TermId == request.TermId && studentIds.Contains(r.StudentId))
                .ToListAsync();

            int published = 0;
            foreach (var studentId in studentIds)
            {
                var record = existingRecords.FirstOrDefault(r => r.StudentId == studentId);
                if (record == null)
                {
                    _context.ReportCardRecords.Add(new ReportCardRecord
                    {
                        SchoolId = request.SchoolId,
                        StudentId = studentId,
                        TermId = request.TermId,
                        Status = "Published",
                        GeneratedAt = DateTime.UtcNow,
                        ReportData = "",
                    });
                }
                else
                {
                    record.Status = "Published";
                    record.GeneratedAt = DateTime.UtcNow;
                }
                published++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { published });
        }

        // REPORT CARD — combined midterm/end-of-term view for the student portal
        [HttpGet("report-card/{studentId}/{termId}")]
        public async Task<IActionResult> GetMarksReportCard(int studentId, int termId)
        {
            var student = await _context.Students.FindAsync(studentId);
            if (student == null) return NotFound(new { message = "Student not found" });

            var term = await _context.Terms.FindAsync(termId);
            if (term == null) return NotFound(new { message = "Term not found" });

            var registration = await _context.TermRegistrations
                .FirstOrDefaultAsync(tr => tr.StudentId == studentId && tr.TermId == termId);
            var campus = registration?.Campus ?? student.StudentNumber.Split('/').FirstOrDefault() ?? "";

            var isPublished = await _context.ReportCardRecords
                .AnyAsync(r => r.StudentId == studentId && r.TermId == termId && r.Status == "Published");

            var marks = await _context.Marks
                .Where(m => m.StudentId == studentId && m.TermId == termId)
                .Include(m => m.Subject)
                .ToListAsync();

            var subjects = marks
                .GroupBy(m => new { m.SubjectId, SubjectName = m.Subject != null ? m.Subject.Name : "" })
                .Select(g =>
                {
                    var midtermScore = g.FirstOrDefault(m => m.AssessmentType == "Mid-term Test")?.Score;
                    var endOfTermScore = g.FirstOrDefault(m => m.AssessmentType == "End of Term Exam")?.Score;

                    decimal? total = midtermScore.HasValue && endOfTermScore.HasValue
                        ? (midtermScore.Value + endOfTermScore.Value) / 2
                        : midtermScore ?? endOfTermScore;

                    return new
                    {
                        subjectName = g.Key.SubjectName,
                        midtermScore,
                        endOfTermScore,
                        total,
                        grade = total.HasValue ? CalculateGrade(total.Value) : "",
                    };
                })
                .OrderBy(s => s.subjectName)
                .ToList();

            return Ok(new
            {
                isPublished,
                student = new
                {
                    name = $"{student.FirstName} {student.Surname}",
                    studentNumber = student.StudentNumber,
                    form = student.Form,
                    campus,
                },
                term = new { name = $"{term.Name} {term.Year}" },
                subjects,
            });
        }
    }
}
