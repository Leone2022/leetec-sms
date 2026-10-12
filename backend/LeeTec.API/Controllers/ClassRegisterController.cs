using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Services;

namespace LeeTec.API.Controllers
{
    // Class registers: the current (Active) students of a class, using Student.Campus/Form,
    // the same membership as teacher entry sheets, for printing tick-box attendance registers.
    [ApiController]
    [Route("api/class-register")]
    public class ClassRegisterController : ControllerBase
    {
        private const string Permission = "Students";
        private readonly AppDbContext _context;

        public ClassRegisterController(AppDbContext context)
        {
            _context = context;
        }

        // OVERVIEW — every class with head counts, for the Class Registers page.
        [Authorize]
        [HttpGet("classes")]
        public async Task<IActionResult> Classes([FromQuery] int termId, [FromQuery] int schoolId = 1)
        {
            if (!await AdminAccess.HasPermissionAsync(_context, User, schoolId, Permission)) return Forbid403();

            var registered = (await _context.TermRegistrations
                .Where(r => r.TermId == termId && r.SchoolId == schoolId && r.Status == "Active")
                .Select(r => r.StudentId).ToListAsync()).ToHashSet();

            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "Active")
                .Select(s => new { s.Id, s.Campus, s.Form, s.Gender })
                .ToListAsync();

            var classes = students
                .GroupBy(s => new { s.Campus, s.Form })
                .Select(g => new
                {
                    g.Key.Campus,
                    g.Key.Form,
                    Total = g.Count(),
                    Boys = g.Count(s => IsMale(s.Gender)),
                    Girls = g.Count(s => IsFemale(s.Gender)),
                    NotRegistered = g.Count(s => !registered.Contains(s.Id)),
                })
                .OrderBy(c => CampusOrder(c.Campus)).ThenBy(c => FormOrder(c.Form)).ThenBy(c => c.Form)
                .ToList();

            return Ok(classes);
        }

        // ADMIN — one class register.
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int termId, [FromQuery] string campus, [FromQuery] string form, [FromQuery] int schoolId = 1)
        {
            if (!await AdminAccess.HasPermissionAsync(_context, User, schoolId, Permission)) return Forbid403();
            return Ok(await BuildAsync(termId, campus, form, schoolId));
        }

        // TEACHER — register for a class the teacher is assigned to (teacher id from the token).
        [Authorize]
        [HttpGet("teacher")]
        public async Task<IActionResult> GetForTeacher([FromQuery] int termId, [FromQuery] string campus, [FromQuery] string form)
        {
            var teacherId = AdminAccess.TeacherId(User);
            if (teacherId == null) return Forbid403();

            var assignment = await _context.TeacherSubjectAssignments
                .Where(a => a.TeacherId == teacherId && a.Campus == campus && a.Form == form && a.IsActive)
                .Select(a => (int?)a.SchoolId)
                .FirstOrDefaultAsync();
            if (assignment == null)
                return StatusCode(403, new { message = "You are not assigned to this class." });

            return Ok(await BuildAsync(termId, campus, form, assignment.Value));
        }

        // A register is a list of names to tick: number, name, sex and student number only.
        // Contact details and subjects are deliberately left out (they live on the student record).
        private async Task<object> BuildAsync(int termId, string campus, string form, int schoolId)
        {
            var term = await _context.Terms.Where(t => t.Id == termId).Select(t => new { t.Id, t.Name }).FirstOrDefaultAsync();

            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "Active" && s.Campus == campus && s.Form == form)
                .OrderBy(s => s.Surname).ThenBy(s => s.FirstName)
                .Select(s => new { s.Id, s.StudentNumber, s.Surname, s.FirstName, s.Gender })
                .ToListAsync();
            var ids = students.Select(s => s.Id).ToList();

            var registered = (await _context.TermRegistrations
                .Where(r => r.TermId == termId && r.Status == "Active" && ids.Contains(r.StudentId))
                .Select(r => r.StudentId).ToListAsync()).ToHashSet();

            var rows = students.Select((s, i) => new
            {
                No = i + 1,
                s.Id,
                s.StudentNumber,
                s.Surname,
                s.FirstName,
                s.Gender,
                RegisteredForTerm = registered.Contains(s.Id),
            }).ToList();

            return new
            {
                termId,
                termName = term?.Name ?? "",
                campus,
                form,
                total = rows.Count,
                boys = rows.Count(r => IsMale(r.Gender)),
                girls = rows.Count(r => IsFemale(r.Gender)),
                students = rows,
            };
        }

        private static bool IsMale(string? g) => g != null && (g.Equals("M", StringComparison.OrdinalIgnoreCase) || g.Equals("Male", StringComparison.OrdinalIgnoreCase));
        private static bool IsFemale(string? g) => g != null && (g.Equals("F", StringComparison.OrdinalIgnoreCase) || g.Equals("Female", StringComparison.OrdinalIgnoreCase));

        private static int CampusOrder(string campus) => campus switch { "AHJ" => 0, "AHA" => 1, "AHS" => 2, _ => 3 };

        private static readonly string[] FormSequence =
            { "Nursery", "ECD A", "ECD B", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7",
              "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6", "Lower 6", "Upper 6" };
        private static int FormOrder(string form) { var i = Array.IndexOf(FormSequence, form); return i < 0 ? 99 : i; }

        private ObjectResult Forbid403() => StatusCode(403, new { message = "You do not have permission to view class registers." });
    }
}
