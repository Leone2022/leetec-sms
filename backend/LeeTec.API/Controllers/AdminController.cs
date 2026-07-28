using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
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

        // =====================
        // ADMIN ACCOUNTS
        // =====================

        // GET /api/admin/admins
        [HttpGet("admins")]
        public async Task<IActionResult> GetAdmins()
        {
            var admins = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SuperAdmin"))
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .ToListAsync();

            var result = admins.Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.Status,
                role = u.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin") ? "SuperAdmin" : "Admin",
                permissions = ParsePermissions(u.Permissions),
                u.CreatedAt,
            });

            return Ok(result);
        }

        // POST /api/admin/create-admin
        [HttpPost("create-admin")]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email already in use" });

            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
            if (adminRole == null)
            {
                adminRole = new Role { Name = "Admin", Description = "School administrator", IsSystemRole = true };
                _context.Roles.Add(adminRole);
                await _context.SaveChangesAsync();
            }

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                SchoolId = dto.SchoolId,
                Status = "Active",
                EmailVerified = true,
                Permissions = JsonSerializer.Serialize(dto.Permissions ?? new List<string>()),
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = adminRole.Id,
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Admin created successfully",
                id = user.Id,
                firstName = user.FirstName,
                lastName = user.LastName,
                email = user.Email,
                status = user.Status,
                role = "Admin",
                permissions = dto.Permissions ?? new List<string>(),
                createdAt = user.CreatedAt,
            });
        }

        // PUT /api/admin/admins/{id}/permissions
        [HttpPut("admins/{id}/permissions")]
        public async Task<IActionResult> UpdateAdminPermissions(int id, [FromBody] UpdateAdminPermissionsDTO dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Admin not found" });

            user.Permissions = JsonSerializer.Serialize(dto.Permissions ?? new List<string>());
            await _context.SaveChangesAsync();

            return Ok(new { message = "Permissions updated successfully" });
        }

        // PUT /api/admin/admins/{id}/reset-password
        [HttpPut("admins/{id}/reset-password")]
        public async Task<IActionResult> ResetAdminPassword(int id, [FromBody] AdminResetPasswordRequest dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Admin not found" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully" });
        }

        // DELETE /api/admin/admins/{id}
        [HttpDelete("admins/{id}")]
        public async Task<IActionResult> DeleteAdmin(int id)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(new { message = "Admin not found" });

            if (user.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin"))
                return BadRequest(new { message = "Cannot delete SuperAdmin accounts" });

            _context.UserRoles.RemoveRange(user.UserRoles);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Admin deleted successfully" });
        }

        private static List<string> ParsePermissions(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(raw) ?? new List<string>();
            }
            catch (JsonException)
            {
                return new List<string>();
            }
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

        // POST /api/admin/portal-accounts/{id}/reset-password
        [Authorize]
        [HttpPost("portal-accounts/{id}/reset-password")]
        public async Task<IActionResult> AdminResetPortalPassword(int id, [FromBody] AdminResetPasswordRequest dto)
        {
            var account = await _context.StudentPortalAccounts.FindAsync(id);
            if (account == null) return NotFound(new { message = "Portal account not found" });

            account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            account.PasswordResetToken = null;
            account.PasswordResetExpiry = null;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully" });
        }


        [HttpPut("teachers/{id}/reset-password")]
        public async Task<IActionResult> ResetTeacherPassword(int id, [FromBody] AdminResetPasswordRequest dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Teacher not found" });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset successfully" });
        }

        [HttpDelete("teachers/{id}")]
        public async Task<IActionResult> DeleteTeacher(int id)
        {
            var user = await _context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(new { message = "Teacher not found" });
            var assignments = _context.TeacherSubjectAssignments.Where(a => a.TeacherId == id);
            _context.TeacherSubjectAssignments.RemoveRange(assignments);
            _context.UserRoles.RemoveRange(user.UserRoles);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Teacher removed successfully" });
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

        // POST /api/admin/seed-test-data
        [HttpPost("seed-test-data")]
        public async Task<IActionResult> SeedTestData()
        {
            // ── STEP 1 — Create test students ───────────────────────────────────
            var campusConfigs = new (string Campus, string[] Forms, string Curriculum)[]
            {
                ("AHJ", new[] { "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6" }, "Cambridge Primary"),
                ("AHA", new[] { "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6" }, "ZIMSEC O-Level"),
                ("AHS", new[] { "Form 5", "Lower 6", "Upper 6" }, "ZIMSEC A-Level"),
            };

            var existingNumbers = (await _context.Students.Select(s => s.StudentNumber).ToListAsync()).ToHashSet();

            int studentsCreated = 0;
            var newStudents = new List<(Student Student, string Campus)>();

            foreach (var (campus, forms, curriculum) in campusConfigs)
            {
                int counter = 1;
                foreach (var form in forms)
                {
                    var formCode = form.Replace(" ", "");
                    foreach (var suffix in new[] { "A", "B" })
                    {
                        var studentNumber = $"{campus}/2026/T{counter:D3}";
                        counter++;

                        if (existingNumbers.Contains(studentNumber))
                            continue;

                        var newStudent = new Student
                        {
                            SchoolId = 1,
                            StudentNumber = studentNumber,
                            FirstName = "Test",
                            Surname = $"{campus}{formCode}{suffix}",
                            DateOfBirth = "2008-01-01",
                            Gender = "Male",
                            Form = form,
                            StudentType = "Day",
                            Curriculum = curriculum,
                            Status = "Active",
                            CreatedAt = DateTime.UtcNow,
                        };
                        _context.Students.Add(newStudent);
                        newStudents.Add((newStudent, campus));
                        existingNumbers.Add(studentNumber);
                        studentsCreated++;
                    }
                }
            }

            await _context.SaveChangesAsync();

            // ── STEP 1b — Register each new student for their campus/curriculum subjects ──
            var activeTerm = await _context.Terms.FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == 1);
            int studentSubjectsCreated = 0;

            if (activeTerm != null && newStudents.Count > 0)
            {
                var allSubjects = await _context.Subjects.Where(s => s.SchoolId == 1 && s.IsActive).ToListAsync();

                foreach (var (student, campus) in newStudents)
                {
                    var subjectCurriculumType = student.Curriculum.StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase)
                        ? "ZIMSEC"
                        : "Cambridge";

                    var matchingSubjects = allSubjects
                        .Where(s => s.Campus == campus && s.CurriculumType == subjectCurriculumType);

                    foreach (var subject in matchingSubjects)
                    {
                        _context.StudentSubjects.Add(new StudentSubject
                        {
                            StudentId = student.Id,
                            SubjectId = subject.Id,
                            TermId = activeTerm.Id,
                            SchoolId = 1,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                        });
                        studentSubjectsCreated++;
                    }
                }

                await _context.SaveChangesAsync();
            }

            // ── STEP 2 — Assign all subjects to teacher 11 ──────────────────────
            var formOptionsByCampus = new Dictionary<string, string[]>
            {
                ["AHJ"] = new[] { "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7" },
                ["AHA"] = new[] { "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6" },
                ["AHS"] = new[] { "Form 5", "Lower 6", "Upper 6" },
            };

            var subjects = await _context.Subjects.ToListAsync();

            var existingKeys = (await _context.TeacherSubjectAssignments
                .Where(a => a.TeacherId == 11)
                .Select(a => new { a.SubjectId, a.Campus, a.Form })
                .ToListAsync())
                .Select(a => $"{a.SubjectId}|{a.Campus}|{a.Form}")
                .ToHashSet();

            int assignmentsCreated = 0;

            foreach (var subject in subjects)
            {
                if (!formOptionsByCampus.TryGetValue(subject.Campus, out var forms))
                    continue;

                foreach (var form in forms)
                {
                    var key = $"{subject.Id}|{subject.Campus}|{form}";
                    if (existingKeys.Contains(key))
                        continue;

                    _context.TeacherSubjectAssignments.Add(new TeacherSubjectAssignment
                    {
                        SchoolId = 1,
                        TeacherId = 11,
                        SubjectId = subject.Id,
                        Campus = subject.Campus,
                        Form = form,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                    });
                    existingKeys.Add(key);
                    assignmentsCreated++;
                }
            }

            await _context.SaveChangesAsync();

            // ── STEP 3 — Summary ─────────────────────────────────────────────────
            return Ok(new
            {
                studentsCreated,
                studentSubjectsCreated,
                assignmentsCreated,
                message = "Test data seeded successfully"
            });
        }

        // GET /api/admin/subject-change-requests
        [HttpGet("subject-change-requests")]
        public async Task<IActionResult> GetSubjectChangeRequests()
        {
            var all = await _context.SubjectChangeRequests
                .Include(r => r.Student)
                .Include(r => r.Subject)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            var result = all.Select(r => new
            {
                r.Id,
                studentId = r.StudentId,
                studentName = r.Student != null ? $"{r.Student.FirstName} {r.Student.Surname}" : "",
                studentNumber = r.Student != null ? r.Student.StudentNumber : "",
                campus = r.Student != null ? r.Student.Campus : "",
                form = r.Student != null ? r.Student.Form : "",
                subjectId = r.SubjectId,
                subjectName = r.Subject != null ? r.Subject.Name : "",
                action = r.Action,
                reason = r.Reason,
                date = r.RequestedAt,
                status = r.Status,
                rejectionReason = r.RejectionReason,
                reviewedAt = r.ReviewedAt,
            }).ToList();

            return Ok(result);
        }

        // PUT /api/admin/subject-change-requests/{id}/approve
        [HttpPut("subject-change-requests/{id}/approve")]
        public async Task<IActionResult> ApproveSubjectRequest(int id)
        {
            var request = await _context.SubjectChangeRequests.FindAsync(id);
            if (request == null) return NotFound(new { message = "Request not found" });
            if (request.Status != "Pending") return BadRequest(new { message = "This request has already been reviewed" });

            var student = await _context.Students.FindAsync(request.StudentId);
            if (student == null) return NotFound(new { message = "Student not found" });

            var activeTerm = await _context.Terms
                .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == student.SchoolId);
            if (activeTerm == null) return BadRequest(new { message = "No active term" });

            var isAdd = string.Equals(request.Action, "Add", StringComparison.OrdinalIgnoreCase);
            var existing = await _context.StudentSubjects.FirstOrDefaultAsync(ss =>
                ss.StudentId == request.StudentId && ss.SubjectId == request.SubjectId && ss.TermId == activeTerm.Id);

            if (isAdd)
            {
                if (existing != null)
                {
                    existing.IsActive = true;
                    existing.Status = "Confirmed";
                }
                else
                {
                    _context.StudentSubjects.Add(new StudentSubject
                    {
                        StudentId = request.StudentId,
                        SubjectId = request.SubjectId,
                        TermId = activeTerm.Id,
                        SchoolId = student.SchoolId,
                        IsActive = true,
                        Status = "Confirmed",
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
            else if (existing != null)
            {
                existing.IsActive = false;
            }

            request.Status = "Approved";
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = "Admin";
            await _context.SaveChangesAsync();

            var actionLabel = isAdd ? "added" : "removed";
            return Ok(new { message = $"Subject {actionLabel} for {student.FirstName} {student.Surname}" });
        }

        // PUT /api/admin/subject-change-requests/{id}/reject
        [HttpPut("subject-change-requests/{id}/reject")]
        public async Task<IActionResult> RejectSubjectRequest(int id, [FromBody] RejectSubjectRequestDTO dto)
        {
            var request = await _context.SubjectChangeRequests.FindAsync(id);
            if (request == null) return NotFound(new { message = "Request not found" });
            if (request.Status != "Pending") return BadRequest(new { message = "This request has already been reviewed" });

            request.Status = "Rejected";
            request.RejectionReason = dto?.Reason;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = "Admin";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request rejected" });
        }
    }

    public class AdminResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    public class RejectSubjectRequestDTO
    {
        public string? Reason { get; set; }
    }
}
