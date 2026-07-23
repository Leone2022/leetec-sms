using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/homework")]
    public class HomeworkController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HomeworkController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/homework/teacher/{teacherId}
        [HttpGet("teacher/{teacherId}")]
        public async Task<IActionResult> GetForTeacher(int teacherId)
        {
            var homework = await _context.Homeworks
                .Where(h => h.TeacherId == teacherId)
                .Include(h => h.Subject)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();

            var result = homework.Select(h => new
            {
                h.Id,
                subjectId = h.SubjectId,
                subjectName = h.Subject != null ? h.Subject.Name : "",
                subjectCode = h.Subject != null ? h.Subject.Code : "",
                h.Title,
                h.Description,
                dueDate = h.DueDate,
                h.Status,
                h.TermId,
                h.CreatedAt,
            });

            return Ok(result);
        }

        // GET /api/homework/student/{studentId}
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetForStudent(int studentId)
        {
            var studentSubjects = await _context.StudentSubjects
                .Where(ss => ss.StudentId == studentId && ss.IsActive)
                .Select(ss => new { ss.SubjectId, ss.TermId })
                .ToListAsync();

            if (studentSubjects.Count == 0)
                return Ok(new List<object>());

            var subjectIds = studentSubjects.Select(ss => ss.SubjectId).Distinct().ToList();
            var subjectTermPairs = studentSubjects.Select(ss => (ss.SubjectId, ss.TermId)).ToHashSet();

            var homework = await _context.Homeworks
                .Where(h => subjectIds.Contains(h.SubjectId))
                .Include(h => h.Subject)
                .OrderByDescending(h => h.DueDate)
                .ToListAsync();

            var result = homework
                .Where(h => subjectTermPairs.Contains((h.SubjectId, h.TermId)))
                .Select(h => new
                {
                    h.Id,
                    subjectId = h.SubjectId,
                    subjectName = h.Subject != null ? h.Subject.Name : "",
                    subjectCode = h.Subject != null ? h.Subject.Code : "",
                    h.Title,
                    h.Description,
                    dueDate = h.DueDate,
                    h.Status,
                });

            return Ok(result);
        }

        // POST /api/homework
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateHomeworkDTO dto)
        {
            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            var homework = new Homework
            {
                SubjectId = dto.SubjectId,
                TeacherId = dto.TeacherId,
                SchoolId = dto.SchoolId,
                TermId = dto.TermId,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                DueDate = dto.DueDate,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
            };

            _context.Homeworks.Add(homework);
            await _context.SaveChangesAsync();

            return Ok(homework);
        }

        // DELETE /api/homework/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var homework = await _context.Homeworks.FindAsync(id);
            if (homework == null) return NotFound(new { message = "Homework not found" });

            _context.Homeworks.Remove(homework);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Homework deleted" });
        }
    }

    public class CreateHomeworkDTO
    {
        public int SubjectId { get; set; }
        public int TeacherId { get; set; }
        public int SchoolId { get; set; } = 1;
        public int TermId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DueDate { get; set; }
    }
}
