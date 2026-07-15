using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;
using LeeTec.API.Services;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/marks")]
    public class MarksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReportCardService _reportCardService;

        public MarksController(AppDbContext context, IReportCardService reportCardService)
        {
            _context = context;
            _reportCardService = reportCardService;
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
                    Status = mark?.Status ?? "Draft",
                };
            }).ToList();

            return Ok(result);
        }

        private static readonly HashSet<string> LockedMarkStatuses = new(StringComparer.OrdinalIgnoreCase) { "Submitted", "Approved" };

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

                if (combinedExisting.Any(m => LockedMarkStatuses.Contains(m.Status)))
                    return StatusCode(403, new { message = "These marks have been submitted and cannot be edited. Contact admin." });

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

            if (existingMarks.Any(m => LockedMarkStatuses.Contains(m.Status)))
                return StatusCode(403, new { message = "These marks have been submitted and cannot be edited. Contact admin." });

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
                        Status = "Draft",
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

        // SUBMIT MARKS FOR REVIEW — Draft marks for this subject/term/campus/form become Submitted
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitMarks([FromBody] SubmitMarksDTO dto)
        {
            var studentIds = await _context.TermRegistrations
                .Where(tr => tr.TermId == dto.TermId && tr.Campus == dto.Campus && tr.Form == dto.Form)
                .Select(tr => tr.StudentId)
                .ToListAsync();

            var marks = await _context.Marks
                .Where(m => m.SubjectId == dto.SubjectId && m.TermId == dto.TermId
                    && studentIds.Contains(m.StudentId) && m.Status == "Draft")
                .ToListAsync();

            foreach (var mark in marks)
            {
                mark.Status = "Submitted";
                mark.SubmittedBy = dto.SubmittedBy;
                mark.SubmittedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { submitted = marks.Count, message = "Marks submitted for review" });
        }

        // APPROVE MARKS — Submitted marks for this subject/term/campus/form become Approved
        [Authorize]
        [HttpPost("approve")]
        public async Task<IActionResult> ApproveMarks([FromBody] ApproveMarksDTO dto)
        {
            var studentIds = await _context.TermRegistrations
                .Where(tr => tr.TermId == dto.TermId && tr.Campus == dto.Campus && tr.Form == dto.Form)
                .Select(tr => tr.StudentId)
                .ToListAsync();

            var marks = await _context.Marks
                .Where(m => m.SubjectId == dto.SubjectId && m.TermId == dto.TermId
                    && studentIds.Contains(m.StudentId) && m.Status == "Submitted")
                .ToListAsync();

            foreach (var mark in marks)
            {
                mark.Status = "Approved";
                mark.ApprovedBy = dto.ApprovedBy;
                mark.ApprovedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { approved = marks.Count });
        }

        // SEND BACK — Submitted marks for this subject/term/campus/form revert to Draft
        [Authorize]
        [HttpPost("send-back")]
        public async Task<IActionResult> SendBackMarks([FromBody] SendBackMarksDTO dto)
        {
            var studentIds = await _context.TermRegistrations
                .Where(tr => tr.TermId == dto.TermId && tr.Campus == dto.Campus && tr.Form == dto.Form)
                .Select(tr => tr.StudentId)
                .ToListAsync();

            var marks = await _context.Marks
                .Where(m => m.SubjectId == dto.SubjectId && m.TermId == dto.TermId
                    && studentIds.Contains(m.StudentId) && m.Status == "Submitted")
                .ToListAsync();

            foreach (var mark in marks)
            {
                mark.Status = "Draft";
                mark.SubmittedBy = null;
                mark.SubmittedAt = null;
            }

            await _context.SaveChangesAsync();
            return Ok(new { sentBack = marks.Count, comment = dto.Comment });
        }

        // PENDING APPROVAL — all Submitted marks grouped by subject/term/campus/form
        [Authorize]
        [HttpGet("pending-approval")]
        public async Task<IActionResult> GetPendingApproval([FromQuery] int schoolId = 1)
        {
            var submittedMarks = await _context.Marks
                .Where(m => m.Status == "Submitted")
                .Include(m => m.Subject)
                .ToListAsync();

            if (submittedMarks.Count == 0) return Ok(new List<object>());

            var termIds = submittedMarks.Select(m => m.TermId).Distinct().ToList();
            var studentIds = submittedMarks.Select(m => m.StudentId).Distinct().ToList();

            var registrations = await _context.TermRegistrations
                .Where(tr => tr.SchoolId == schoolId && termIds.Contains(tr.TermId) && studentIds.Contains(tr.StudentId))
                .ToListAsync();

            var regLookup = registrations
                .GroupBy(r => (r.StudentId, r.TermId))
                .ToDictionary(g => g.Key, g => g.First());

            var grouped = submittedMarks
                .Select(m => new
                {
                    Mark = m,
                    Reg = regLookup.TryGetValue((m.StudentId, m.TermId), out var r) ? r : null,
                })
                .Where(x => x.Reg != null)
                .GroupBy(x => new { x.Mark.SubjectId, SubjectName = x.Mark.Subject != null ? x.Mark.Subject.Name : "", x.Mark.TermId, Campus = x.Reg!.Campus, Form = x.Reg!.Form })
                .Select(g => new
                {
                    subjectId = g.Key.SubjectId,
                    subjectName = g.Key.SubjectName,
                    termId = g.Key.TermId,
                    campus = g.Key.Campus,
                    form = g.Key.Form,
                    teacher = g.Select(x => x.Mark.SubmittedBy).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? "—",
                    studentCount = g.Select(x => x.Mark.StudentId).Distinct().Count(),
                    submittedDate = g.Min(x => x.Mark.SubmittedAt),
                })
                .OrderBy(g => g.subjectName).ThenBy(g => g.form)
                .ToList();

            return Ok(grouped);
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
                    Status = "Draft",
                    CreatedAt = DateTime.UtcNow,
                };
                _context.Marks.Add(mark);
                existing.Add(mark);
            }

            mark.Score = score;
            mark.Comments = comments;
            mark.UpdatedAt = DateTime.UtcNow;
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

        // REPORT CARD — student portal view. Returns the same ReportCardData shape as
        // GET /api/reports/report-card/{studentId}, gated behind publish status.
        [HttpGet("report-card/{studentId}/{termId}")]
        public async Task<IActionResult> GetReportCard(int studentId, int termId)
        {
            var record = await _context.ReportCardRecords
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TermId == termId && r.Status == "Published");

            if (record == null)
                return NotFound(new { message = "Report card not yet published for this term." });

            var data = await _reportCardService.BuildReportCardDataAsync(studentId, termId);
            if (data == null) return NotFound(new { message = "Student or term not found" });

            return Ok(data);
        }
    }
}
