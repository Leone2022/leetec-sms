using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/teacher-assignments")]
    public class TeacherAssignmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeacherAssignmentsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/teacher-assignments?schoolId=1
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int schoolId = 1)
        {
            var assignments = await _context.TeacherSubjectAssignments
                .Where(a => a.SchoolId == schoolId && a.IsActive)
                .Include(a => a.Teacher)
                .Include(a => a.Subject)
                .OrderBy(a => a.Teacher!.LastName)
                    .ThenBy(a => a.Teacher!.FirstName)
                    .ThenBy(a => a.Campus)
                    .ThenBy(a => a.Form)
                .Select(a => new
                {
                    a.Id,
                    a.TeacherId,
                    teacherName = $"{a.Teacher!.FirstName} {a.Teacher.LastName}",
                    teacherEmail = a.Teacher.Email,
                    a.SubjectId,
                    subjectName = a.Subject!.Name,
                    subjectCode = a.Subject.Code,
                    a.Campus,
                    a.Form,
                    a.CreatedAt,
                })
                .ToListAsync();

            return Ok(assignments);
        }

        // GET /api/teacher-assignments/my-subjects?teacherId={}
        [HttpGet("my-subjects")]
        public async Task<IActionResult> GetMySubjects([FromQuery] int teacherId)
        {
            var assignments = await _context.TeacherSubjectAssignments
                .Where(a => a.TeacherId == teacherId && a.IsActive)
                .Include(a => a.Subject)
                .OrderBy(a => a.Campus).ThenBy(a => a.Form).ThenBy(a => a.Subject!.Name)
                .Select(a => new
                {
                    assignmentId = a.Id,
                    a.SubjectId,
                    subjectName = a.Subject!.Name,
                    subjectCode = a.Subject.Code,
                    a.Campus,
                    a.Form,
                })
                .ToListAsync();

            return Ok(assignments);
        }

        // POST /api/teacher-assignments
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTeacherAssignmentRequest request)
        {
            // Validate teacher exists
            var teacher = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == request.TeacherId);

            if (teacher == null)
                return NotFound(new { message = "Teacher not found" });

            var isTeacher = teacher.UserRoles.Any(ur =>
                string.Equals(ur.Role.Name, "Teacher", StringComparison.OrdinalIgnoreCase));
            if (!isTeacher)
                return BadRequest(new { message = "User does not have the Teacher role" });

            // Check for duplicate active assignment
            var duplicate = await _context.TeacherSubjectAssignments.AnyAsync(a =>
                a.TeacherId == request.TeacherId &&
                a.SubjectId == request.SubjectId &&
                a.Campus == request.Campus &&
                a.Form == request.Form &&
                a.IsActive);

            if (duplicate)
                return BadRequest(new { message = "This teacher already has this subject assigned for that campus and form." });

            var assignment = new TeacherSubjectAssignment
            {
                SchoolId = request.SchoolId,
                TeacherId = request.TeacherId,
                SubjectId = request.SubjectId,
                Campus = request.Campus,
                Form = request.Form,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            _context.TeacherSubjectAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Assignment created", id = assignment.Id });
        }

        // DELETE /api/teacher-assignments/{id}  (soft-delete)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var assignment = await _context.TeacherSubjectAssignments.FindAsync(id);
            if (assignment == null)
                return NotFound(new { message = "Assignment not found" });

            assignment.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Assignment removed" });
        }
    }

    public class CreateTeacherAssignmentRequest
    {
        public int SchoolId { get; set; } = 1;
        public int TeacherId { get; set; }
        public int SubjectId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
    }
}
