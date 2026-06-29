using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/admin/create-teacher
        [HttpPost("create-teacher")]
        public async Task<IActionResult> CreateTeacher([FromBody] CreateTeacherDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email already in use" });

            var teacherRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == "Teacher");

            if (teacherRole == null)
                return StatusCode(500, new { message = "Teacher role not found in database" });

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.Surname,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                SchoolId = dto.SchoolId,
                Status = "Active",
                EmailVerified = true,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = teacherRole.Id,
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Teacher account created successfully",
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                surname = user.LastName,
            });
        }

        // GET /api/admin/student-credentials?termId={}&schoolId={}
        [HttpGet("student-credentials")]
        public async Task<IActionResult> GetStudentCredentials(
            [FromQuery] int termId,
            [FromQuery] int schoolId = 1)
        {
            var registrations = await _context.TermRegistrations
                .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId)
                .Include(tr => tr.Student)
                .OrderBy(tr => tr.Form)
                .ThenBy(tr => tr.Student!.Surname)
                .ToListAsync();

            var studentIds = registrations.Select(r => r.StudentId).ToList();

            var portalAccounts = await _context.StudentPortalAccounts
                .Where(p => studentIds.Contains(p.StudentId))
                .ToListAsync();

            var portalByStudent = portalAccounts.ToDictionary(p => p.StudentId);

            var result = registrations.Select(reg =>
            {
                var student = reg.Student!;
                portalByStudent.TryGetValue(reg.StudentId, out var portal);

                var portalStatus = portal == null ? "None"
                    : portal.Status == "Active" ? "Approved"
                    : portal.Status;

                return new
                {
                    studentId = reg.StudentId,
                    studentNumber = student.StudentNumber,
                    firstName = student.FirstName,
                    surname = student.Surname,
                    form = reg.Form,
                    campus = reg.Campus,
                    portalEmail = portal?.Email,
                    portalStatus,
                    hasPortalAccount = portal != null,
                };
            }).ToList();

            return Ok(result);
        }

        // GET /api/admin/portal-accounts?schoolId=1  (ALL students, left-joined to portal accounts)
        [HttpGet("portal-accounts")]
        public async Task<IActionResult> GetPortalAccounts([FromQuery] int schoolId = 1)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId)
                .OrderBy(s => s.Surname).ThenBy(s => s.FirstName)
                .ToListAsync();

            var studentIds = students.Select(s => s.Id).ToList();
            var portalAccounts = await _context.StudentPortalAccounts
                .Where(a => studentIds.Contains(a.StudentId))
                .ToListAsync();

            var portalByStudent = portalAccounts.ToDictionary(a => a.StudentId);

            var result = students.Select(s =>
            {
                portalByStudent.TryGetValue(s.Id, out var account);
                var campus = s.StudentNumber.StartsWith("AHJ") ? "AHJ"
                           : s.StudentNumber.StartsWith("AHS") ? "AHS"
                           : "AHA";
                return new
                {
                    studentId = s.Id,
                    studentNumber = s.StudentNumber,
                    firstName = s.FirstName,
                    surname = s.Surname,
                    form = s.Form,
                    campus,
                    portalAccountId = account?.Id,
                    portalEmail = account?.Email,
                    portalStatus = account == null ? "None" : account.Status,
                    emailVerified = account?.EmailVerified,
                    createdAt = account?.CreatedAt,
                    lastLoginAt = account?.LastLoginAt,
                };
            }).ToList();

            return Ok(result);
        }

        // PUT /api/admin/portal-accounts/{id}/approve
        [HttpPut("portal-accounts/{id}/approve")]
        public async Task<IActionResult> ApprovePortalAccount(int id)
        {
            var account = await _context.StudentPortalAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = "Portal account not found" });

            account.Status = "Active";
            account.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Account approved" });
        }

        // DELETE /api/admin/portal-accounts/{id}
        [HttpDelete("portal-accounts/{id}")]
        public async Task<IActionResult> DeletePortalAccount(int id)
        {
            var account = await _context.StudentPortalAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = "Portal account not found" });

            _context.StudentPortalAccounts.Remove(account);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Portal account deleted" });
        }

        // GET /api/admin/teachers?schoolId=1
        [HttpGet("teachers")]
        public async Task<IActionResult> GetTeachers([FromQuery] int schoolId = 1)
        {
            var teachers = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Where(u => u.SchoolId == schoolId
                         && u.UserRoles.Any(ur => ur.Role.Name == "Teacher"))
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    id = u.Id,
                    firstName = u.FirstName,
                    surname = u.LastName,
                    email = u.Email,
                    phoneNumber = u.PhoneNumber,
                    status = u.Status,
                    createdAt = u.CreatedAt,
                })
                .ToListAsync();

            return Ok(teachers);
        }
    }
}
