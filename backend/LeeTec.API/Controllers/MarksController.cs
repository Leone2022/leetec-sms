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
            [FromQuery] int schoolId = 1)
        {
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
    }
}
