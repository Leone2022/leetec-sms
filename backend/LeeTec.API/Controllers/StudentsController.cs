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
    [Route("api/[controller]")]
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public StudentsController(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // ENROL A NEW STUDENT
        [HttpPost("enrol")]
        public async Task<IActionResult> EnrolStudent([FromBody] EnrolStudentDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var count = await _context.Students
                    .CountAsync(s => s.SchoolId == dto.SchoolId);

                var prefix = dto.Campus switch
                {
                    "AHJ" => "AHJ",
                    "AHS" => "AHS",
                    _     => "AHA"
                };
                var studentNumber = $"{prefix}/{DateTime.Now.Year}/{(count + 1):D4}";

                var student = new Student
                {
                    SchoolId = dto.SchoolId,
                    UserId = null,
                    StudentNumber = studentNumber,
                    Surname = dto.Surname,
                    FirstName = dto.FirstName,
                    DateOfBirth = dto.DateOfBirth,
                    BirthCertificateNo = dto.BirthCertificateNo,
                    Gender = dto.Gender,
                    Form = dto.Form,
                    StudentType = dto.StudentType ?? "Day",
                    Curriculum = dto.Curriculum,
                    DateOfEntry = dto.DateOfEntry,
                    Race = dto.Race,
                    PreviousSchool = dto.PreviousSchool,
                    OtherInformation = dto.OtherInformation,
                    FamilyDoctorName = dto.FamilyDoctorName,
                    FamilyDoctorPhone = dto.FamilyDoctorPhone,
                    MedicalAidSociety = dto.MedicalAidSociety,
                    MedicalAidNo = dto.MedicalAidNo,
                    Allergies = dto.Allergies,
                    Denomination = dto.Denomination,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Students.Add(student);
                await _context.SaveChangesAsync();

                // Auto-assign subjects matching this student's campus and curriculum
                var activeTerm = await _context.Terms
                    .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == dto.SchoolId);

                if (activeTerm != null)
                {
                    var subjectCurriculumType = dto.Curriculum.StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase)
                        ? "ZIMSEC"
                        : "Cambridge";

                    var matchingSubjects = await _context.Subjects
                        .Where(s => s.SchoolId == dto.SchoolId && s.Campus == prefix
                            && s.CurriculumType == subjectCurriculumType && s.IsActive)
                        .ToListAsync();

                    foreach (var subject in matchingSubjects)
                    {
                        _context.StudentSubjects.Add(new StudentSubject
                        {
                            StudentId = student.Id,
                            SubjectId = subject.Id,
                            TermId = activeTerm.Id,
                            SchoolId = dto.SchoolId,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                        });
                    }

                    await _context.SaveChangesAsync();
                }

                // Register the student for the active term
                if (activeTerm != null && !await _context.TermRegistrations
                    .AnyAsync(tr => tr.StudentId == student.Id && tr.TermId == activeTerm.Id))
                {
                    _context.TermRegistrations.Add(new TermRegistration
                    {
                        StudentId = student.Id,
                        TermId = activeTerm.Id,
                        SchoolId = dto.SchoolId,
                        Campus = prefix,
                        Form = student.Form,
                        Status = "Active",
                        RegisteredAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                // Send welcome email with student number if address provided (non-blocking)
                if (!string.IsNullOrEmpty(dto.Email))
                {
                    var capturedEmail = dto.Email;
                    var capturedName = dto.FirstName;
                    var capturedStudentNo = student.StudentNumber;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendActivationEmailAsync(capturedEmail, capturedName, capturedStudentNo, "https://www.adventhopeacademy.com/student-login");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Email send failed: {ex.Message}");
                        }
                    });
                }

                return Ok(new {
                    message = "Student enrolled successfully",
                    studentNumber = student.StudentNumber,
                    studentId = student.Id,
                    campus = prefix,
                    termName = activeTerm?.Name,
                    termYear = activeTerm?.Year,
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new {
                    message = "Enrolment failed. Please try again.",
                    error = ex.Message
                });
            }
        }

        // UPDATE STUDENT
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] UpdateStudentDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            student.FirstName = dto.FirstName.Trim();
            student.Surname = dto.Surname.Trim();
            student.DateOfBirth = dto.DateOfBirth;
            student.Gender = dto.Gender;
            student.Race = dto.Race;
            student.Form = dto.Form;
            student.StudentType = dto.StudentType;
            student.Curriculum = dto.Curriculum;

            // Medical details live directly on the Student record
            if (dto.FamilyDoctorName != null) student.FamilyDoctorName = dto.FamilyDoctorName.Trim();
            if (dto.FamilyDoctorPhone != null) student.FamilyDoctorPhone = dto.FamilyDoctorPhone.Trim();
            if (dto.MedicalAidSociety != null) student.MedicalAidSociety = dto.MedicalAidSociety.Trim();
            if (dto.MedicalAidNo != null) student.MedicalAidNo = dto.MedicalAidNo.Trim();
            if (dto.Allergies != null) student.Allergies = dto.Allergies.Trim();

            // Family info lives in a related Family record — upsert it
            var hasFamilyFields = dto.MaritalStatus != null || dto.HomeLanguage != null || dto.Religion != null
                || dto.HomeAddress != null || dto.HomeTelephone != null || dto.Cell != null || dto.FamilyEmail != null;

            if (hasFamilyFields)
            {
                var family = await _context.Families.FirstOrDefaultAsync(f => f.StudentId == id);
                if (family == null)
                {
                    family = new Family { StudentId = id, CreatedAt = DateTime.UtcNow };
                    _context.Families.Add(family);
                }

                if (dto.MaritalStatus != null) family.MaritalStatus = dto.MaritalStatus.Trim();
                if (dto.HomeLanguage != null) family.HomeLanguage = dto.HomeLanguage.Trim();
                if (dto.Religion != null) family.Religion = dto.Religion.Trim();
                if (dto.HomeAddress != null) family.HomeAddress = dto.HomeAddress.Trim();
                if (dto.HomeTelephone != null) family.HomeTelephone = dto.HomeTelephone.Trim();
                if (dto.Cell != null) family.Cell = dto.Cell.Trim();
                if (dto.FamilyEmail != null) family.Email = dto.FamilyEmail.Trim();
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Student updated successfully" });
        }

        // GET SINGLE STUDENT
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStudent(int id)
        {
            var student = await _context.Students
                .Include(s => s.School)
                .Include(s => s.Family)
                .Include(s => s.Guardians)
                .Include(s => s.EmergencyContacts)
                .Include(s => s.InvoicingDetail)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (student == null) return NotFound("Student not found");
            return Ok(student);
        }

        // GET ALL STUDENTS IN A SCHOOL
        [HttpGet("school/{schoolId}")]
        public async Task<IActionResult> GetStudentsBySchool(int schoolId)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId)
                .Select(s => new
                {
                    s.Id,
                    s.StudentNumber,
                    s.Surname,
                    s.FirstName,
                    s.Form,
                    s.Curriculum,
                    s.Gender,
                    s.Status,
                    s.CreatedAt
                })
                .ToListAsync();

            return Ok(students);
        }

        // ADD FAMILY DETAILS
        [HttpPost("{id}/family")]
        public async Task<IActionResult> AddFamily(int id, [FromBody] Family family)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound("Student not found");

            family.StudentId = id;
            family.CreatedAt = DateTime.UtcNow;
            _context.Families.Add(family);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Family details added", data = family });
        }

        // ADD GUARDIAN
        [HttpPost("{id}/guardian")]
        public async Task<IActionResult> AddGuardian(int id, [FromBody] Guardian guardian)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound("Student not found");

            guardian.StudentId = id;
            guardian.CreatedAt = DateTime.UtcNow;
            _context.Guardians.Add(guardian);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Guardian added", data = guardian });
        }

        // ADD EMERGENCY CONTACT
        [HttpPost("{id}/emergency-contact")]
        public async Task<IActionResult> AddEmergencyContact(int id, [FromBody] EmergencyContact contact)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound("Student not found");

            contact.StudentId = id;
            contact.CreatedAt = DateTime.UtcNow;
            _context.EmergencyContacts.Add(contact);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Emergency contact added", data = contact });
        }

        // ADD INVOICING DETAILS
        [HttpPost("{id}/invoicing")]
        public async Task<IActionResult> AddInvoicingDetail(int id, [FromBody] InvoicingDetail detail)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound("Student not found");

            detail.StudentId = id;
            detail.CreatedAt = DateTime.UtcNow;
            _context.InvoicingDetails.Add(detail);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Invoicing details added", data = detail });
        }

        // UPDATE STUDENT STATUS
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, string status)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound("Student not found");

            student.Status = status;
            await _context.SaveChangesAsync();
            return Ok($"Student status updated to {status}");
        }

        // DELETE STUDENT
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var student = await _context.Students.FindAsync(id);
                if (student == null) return NotFound(new { message = "Student not found" });

                // Invoices are referenced by Payments and InvoiceItems, so those
                // must go first — otherwise removing the Invoice rows alone still
                // violates the FK constraint on Payments/InvoiceItems.
                var invoiceIds = await _context.Invoices
                    .Where(i => i.StudentId == id)
                    .Select(i => i.Id)
                    .ToListAsync();

                var payments = await _context.Payments
                    .Where(p => p.StudentId == id || invoiceIds.Contains(p.InvoiceId))
                    .ToListAsync();
                _context.Payments.RemoveRange(payments);

                var invoiceItems = await _context.InvoiceItems
                    .Where(ii => invoiceIds.Contains(ii.InvoiceId))
                    .ToListAsync();
                _context.InvoiceItems.RemoveRange(invoiceItems);

                var invoices = await _context.Invoices
                    .Where(i => i.StudentId == id)
                    .ToListAsync();
                _context.Invoices.RemoveRange(invoices);

                var bursaries = await _context.Bursaries
                    .Where(b => b.StudentId == id).ToListAsync();
                _context.Bursaries.RemoveRange(bursaries);

                var activationTokens = await _context.ActivationTokens
                    .Where(a => a.StudentId == id).ToListAsync();
                _context.ActivationTokens.RemoveRange(activationTokens);

                var portalAccounts = await _context.StudentPortalAccounts
                    .Where(p => p.StudentId == id).ToListAsync();
                _context.StudentPortalAccounts.RemoveRange(portalAccounts);

                var marks = await _context.Marks
                    .Where(m => m.StudentId == id).ToListAsync();
                _context.Marks.RemoveRange(marks);

                var studentSubjects = await _context.StudentSubjects
                    .Where(ss => ss.StudentId == id).ToListAsync();
                _context.StudentSubjects.RemoveRange(studentSubjects);

                var termRegistrations = await _context.TermRegistrations
                    .Where(tr => tr.StudentId == id).ToListAsync();
                _context.TermRegistrations.RemoveRange(termRegistrations);

                var family = await _context.Families
                    .FirstOrDefaultAsync(f => f.StudentId == id);
                if (family != null) _context.Families.Remove(family);

                var guardians = await _context.Guardians
                    .Where(g => g.StudentId == id).ToListAsync();
                _context.Guardians.RemoveRange(guardians);

                var contacts = await _context.EmergencyContacts
                    .Where(e => e.StudentId == id).ToListAsync();
                _context.EmergencyContacts.RemoveRange(contacts);

                var invoicing = await _context.InvoicingDetails
                    .FirstOrDefaultAsync(i => i.StudentId == id);
                if (invoicing != null) _context.InvoicingDetails.Remove(invoicing);

                _context.Students.Remove(student);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Student deleted successfully" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new {
                    message = "Failed to delete student.",
                    error = ex.Message
                });
            }
        }

        // GET STUDENT SUBJECTS
        [HttpGet("{id}/subjects")]
        public async Task<IActionResult> GetStudentSubjects(int id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            var subjects = await _context.StudentSubjects
                .Where(ss => ss.StudentId == id)
                .Include(ss => ss.Subject)
                .ToListAsync();

            var result = subjects.Select(ss => new
            {
                ss.Id,
                ss.SubjectId,
                subjectName = ss.Subject != null ? ss.Subject.Name : "",
                subjectCode = ss.Subject != null ? ss.Subject.Code : "",
                campus = ss.Subject != null ? ss.Subject.Campus : "",
                form = student.Form,
                status = string.IsNullOrEmpty(ss.Status) ? "Confirmed" : ss.Status,
            }).ToList();

            return Ok(result);
        }

        // REQUEST SUBJECT CHANGE (Form 5/6, Lower 6, Upper 6 only)
        private static readonly HashSet<string> SubjectChangeEligibleForms = new(StringComparer.OrdinalIgnoreCase)
        {
            "Form 5", "Lower 6", "Upper 6"
        };

        [HttpPost("{id}/subjects/request-change")]
        public async Task<IActionResult> RequestSubjectChange(int id, [FromBody] RequestSubjectChangeDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            if (!SubjectChangeEligibleForms.Contains(student.Form))
                return StatusCode(403, new { message = "Subject changes not allowed for this form" });

            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            var activeTerm = await _context.Terms
                .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == student.SchoolId);
            if (activeTerm == null) return BadRequest(new { message = "No active term" });

            var isAdd = string.Equals(dto.Action, "Add", StringComparison.OrdinalIgnoreCase);

            var existing = await _context.StudentSubjects
                .FirstOrDefaultAsync(ss => ss.StudentId == id && ss.SubjectId == dto.SubjectId && ss.TermId == activeTerm.Id);

            if (isAdd)
            {
                if (existing != null)
                {
                    existing.Status = "Pending";
                    existing.IsActive = true;
                }
                else
                {
                    _context.StudentSubjects.Add(new StudentSubject
                    {
                        StudentId = id,
                        SubjectId = dto.SubjectId,
                        TermId = activeTerm.Id,
                        SchoolId = student.SchoolId,
                        IsActive = true,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
            else
            {
                if (existing == null)
                    return NotFound(new { message = "Subject registration not found" });

                existing.Status = "Pending";
                existing.IsActive = false;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Request submitted for admin approval" });
        }

        // ADD SUBJECT TO STUDENT
        [HttpPost("{id}/subjects")]
        public async Task<IActionResult> AddStudentSubject(int id, [FromBody] AddStudentSubjectDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            var existing = await _context.StudentSubjects
                .FirstOrDefaultAsync(ss => ss.StudentId == id && ss.SubjectId == dto.SubjectId && ss.TermId == dto.TermId);

            if (existing != null)
            {
                if (existing.IsActive)
                    return BadRequest(new { message = "Student is already registered for this subject" });
                existing.IsActive = true;
            }
            else
            {
                _context.StudentSubjects.Add(new StudentSubject
                {
                    StudentId = id,
                    SubjectId = dto.SubjectId,
                    TermId = dto.TermId,
                    SchoolId = student.SchoolId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Subject added" });
        }

        // REMOVE SUBJECT FROM STUDENT
        [HttpDelete("{studentId}/subjects/{subjectId}")]
        public async Task<IActionResult> RemoveStudentSubject(int studentId, int subjectId)
        {
            var records = await _context.StudentSubjects
                .Where(ss => ss.StudentId == studentId && ss.SubjectId == subjectId && ss.IsActive)
                .ToListAsync();

            if (records.Count == 0)
                return NotFound(new { message = "Subject registration not found" });

            foreach (var record in records)
                record.IsActive = false;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Subject removed" });
        }

        // SEARCH STUDENTS
        [HttpGet("search")]
        public async Task<IActionResult> SearchStudents(int schoolId, string query)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId &&
                    (s.Surname.Contains(query) ||
                     s.FirstName.Contains(query) ||
                     s.StudentNumber.Contains(query)))
                .Select(s => new
                {
                    s.Id,
                    s.StudentNumber,
                    s.Surname,
                    s.FirstName,
                    s.Form,
                    s.Gender,
                    s.Status
                })
                .ToListAsync();

            return Ok(students);
        }
    }
}