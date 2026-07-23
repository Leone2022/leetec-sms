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


                var prefix = dto.Campus switch
                {
                    "AHJ" => "AHJ",
                    "AHS" => "AHS",
                    _     => "AHA"
                };
                var yearPrefix = $"{prefix}/{DateTime.Now.Year}/";
                var lastStudent = _context.Students.Where(s => s.StudentNumber.StartsWith(yearPrefix)).OrderByDescending(s => s.StudentNumber).FirstOrDefault();
                int nextNumber = 1;
                if (lastStudent != null) { var parts = lastStudent.StudentNumber.Split('/'); if (parts.Length == 3 && int.TryParse(parts[2], out int last)) nextNumber = last + 1; }
                var studentNumber = $"{prefix}/{DateTime.Now.Year}/{nextNumber:D4}";

                var student = new Student
                {
                    SchoolId = dto.SchoolId,
                    UserId = null,
                    StudentNumber = studentNumber,
                    Campus = prefix,
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

        // UPDATE STUDENT (personal, medical & academic details — all columns on Student itself)
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] UpdateStudentDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
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

                if (dto.PreviousSchool != null) student.PreviousSchool = dto.PreviousSchool.Trim();
                if (dto.MedicalAidSociety != null) student.MedicalAidSociety = dto.MedicalAidSociety.Trim();
                if (dto.MedicalAidNo != null) student.MedicalAidNo = dto.MedicalAidNo.Trim();
                if (dto.FamilyDoctorName != null) student.FamilyDoctorName = dto.FamilyDoctorName.Trim();
                if (dto.FamilyDoctorPhone != null) student.FamilyDoctorPhone = dto.FamilyDoctorPhone.Trim();
                if (dto.Allergies != null) student.Allergies = dto.Allergies.Trim();
                if (dto.Denomination != null) student.Denomination = dto.Denomination.Trim();
                if (dto.OtherInformation != null) student.OtherInformation = dto.OtherInformation.Trim();

                string? oldStudentNumber = null;
                string? newStudentNumber = null;

                if (!string.IsNullOrWhiteSpace(dto.Campus))
                {
                    // 1. Normalise the requested campus the same way EnrolStudent does
                    var newCampus = dto.Campus switch
                    {
                        "AHJ" => "AHJ",
                        "AHS" => "AHS",
                        _ => "AHA"
                    };

                    var currentCampus = !string.IsNullOrWhiteSpace(student.Campus)
                        ? student.Campus
                        : (student.StudentNumber ?? "").Split('/')[0];

                    if (!string.Equals(currentCampus, newCampus, StringComparison.OrdinalIgnoreCase))
                    {
                        oldStudentNumber = student.StudentNumber;

                        // 2. Find the highest existing student number for that campus/year
                        var yearPrefix = $"{newCampus}/{DateTime.Now.Year}/";
                        var lastStudent = _context.Students
                            .Where(s => s.Id != id && s.StudentNumber.StartsWith(yearPrefix))
                            .OrderByDescending(s => s.StudentNumber)
                            .FirstOrDefault();
                        int nextNumber = 1;
                        if (lastStudent != null)
                        {
                            var parts = lastStudent.StudentNumber.Split('/');
                            if (parts.Length == 3 && int.TryParse(parts[2], out int last)) nextNumber = last + 1;
                        }

                        // 3. Generate new student number
                        newStudentNumber = $"{newCampus}/{DateTime.Now.Year}/{nextNumber:D4}";

                        // 4-5. Update Campus and StudentNumber
                        student.Campus = newCampus;
                        student.StudentNumber = newStudentNumber;

                        // 6. Re-derive StudentSubjects for the active term against the new campus
                        var activeTerm = await _context.Terms
                            .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == student.SchoolId);

                        if (activeTerm != null)
                        {
                            var oldSubjects = await _context.StudentSubjects
                                .Where(ss => ss.StudentId == id && ss.TermId == activeTerm.Id)
                                .ToListAsync();
                            _context.StudentSubjects.RemoveRange(oldSubjects);

                            var subjectCurriculumType = student.Curriculum.StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase)
                                ? "ZIMSEC"
                                : "Cambridge";

                            var matchingSubjects = await _context.Subjects
                                .Where(s => s.SchoolId == student.SchoolId && s.Campus == newCampus
                                    && s.CurriculumType == subjectCurriculumType && s.IsActive)
                                .ToListAsync();

                            foreach (var subject in matchingSubjects)
                            {
                                _context.StudentSubjects.Add(new StudentSubject
                                {
                                    StudentId = id,
                                    SubjectId = subject.Id,
                                    TermId = activeTerm.Id,
                                    SchoolId = student.SchoolId,
                                    IsActive = true,
                                    CreatedAt = DateTime.UtcNow,
                                });
                            }

                            // The active term's registration also records Campus/Form —
                            // leaving it pointed at the old campus would make the student
                            // show up under the wrong campus everywhere that reads
                            // TermRegistrations instead of Student directly.
                            var registration = await _context.TermRegistrations
                                .FirstOrDefaultAsync(tr => tr.StudentId == id && tr.TermId == activeTerm.Id);
                            if (registration != null)
                            {
                                registration.Campus = newCampus;
                                registration.Form = student.Form;
                            }
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 7. Return both old and new student number
                return Ok(new { message = "Student updated successfully", oldStudentNumber, newStudentNumber });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to update student.", error = ex.Message });
            }
        }

        // UPDATE FAMILY DETAILS (upsert)
        [Authorize]
        [HttpPut("{id}/family")]
        public async Task<IActionResult> UpdateFamily(int id, [FromBody] UpdateFamilyDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            var family = await _context.Families.FirstOrDefaultAsync(f => f.StudentId == id);
            if (family == null)
            {
                family = new Family { StudentId = id, CreatedAt = DateTime.UtcNow };
                _context.Families.Add(family);
            }

            if (dto.HomeAddress != null) family.HomeAddress = dto.HomeAddress.Trim();
            if (dto.HomeTelephone != null) family.HomeTelephone = dto.HomeTelephone.Trim();
            if (dto.Cell != null) family.Cell = dto.Cell.Trim();
            if (dto.HomeLanguage != null) family.HomeLanguage = dto.HomeLanguage.Trim();
            if (dto.Religion != null) family.Religion = dto.Religion.Trim();
            if (dto.MaritalStatus != null) family.MaritalStatus = dto.MaritalStatus.Trim();
            if (dto.Email != null) family.Email = dto.Email.Trim();

            await _context.SaveChangesAsync();
            return Ok(new { message = "Family details updated successfully" });
        }

        // UPDATE GUARDIANS (upsert Father/Guardian 1 and Mother/Guardian 2 by slot)
        [Authorize]
        [HttpPut("{id}/guardians")]
        public async Task<IActionResult> UpdateGuardians(int id, [FromBody] UpdateGuardiansDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            var guardians = await _context.Guardians
                .Where(g => g.StudentId == id)
                .OrderBy(g => g.Id)
                .ToListAsync();

            void Upsert(Guardian? existing, GuardianFieldsDTO? fields, string defaultType)
            {
                if (fields == null) return;
                var hasAnyValue = !string.IsNullOrWhiteSpace(fields.Title)
                    || !string.IsNullOrWhiteSpace(fields.Forenames)
                    || !string.IsNullOrWhiteSpace(fields.Surname)
                    || !string.IsNullOrWhiteSpace(fields.Nationality)
                    || !string.IsNullOrWhiteSpace(fields.Occupation)
                    || !string.IsNullOrWhiteSpace(fields.CompanyName)
                    || !string.IsNullOrWhiteSpace(fields.BusinessTelephone)
                    || !string.IsNullOrWhiteSpace(fields.Cell)
                    || !string.IsNullOrWhiteSpace(fields.Email)
                    || !string.IsNullOrWhiteSpace(fields.Relationship);
                if (!hasAnyValue) return;

                if (existing == null)
                {
                    existing = new Guardian
                    {
                        StudentId = id,
                        GuardianType = !string.IsNullOrWhiteSpace(fields.Relationship) ? fields.Relationship : defaultType,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _context.Guardians.Add(existing);
                }
                else if (!string.IsNullOrWhiteSpace(fields.Relationship))
                {
                    existing.GuardianType = fields.Relationship;
                }

                if (fields.Title != null) existing.Title = fields.Title.Trim();
                if (fields.Forenames != null) existing.Forenames = fields.Forenames.Trim();
                if (fields.Surname != null) existing.Surname = fields.Surname.Trim();
                if (fields.Nationality != null) existing.Nationality = fields.Nationality.Trim();
                if (fields.Occupation != null) existing.Occupation = fields.Occupation.Trim();
                if (fields.CompanyName != null) existing.CompanyName = fields.CompanyName.Trim();
                if (fields.BusinessTelephone != null) existing.BusinessTelephone = fields.BusinessTelephone.Trim();
                if (fields.Cell != null) existing.Cell = fields.Cell.Trim();
                if (fields.Email != null) existing.Email = fields.Email.Trim();
            }

            Upsert(guardians.ElementAtOrDefault(0), dto.Father, "Father");
            Upsert(guardians.ElementAtOrDefault(1), dto.Mother, "Mother");

            await _context.SaveChangesAsync();
            return Ok(new { message = "Guardians updated successfully" });
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

        // REQUEST SUBJECT CHANGE (available to all students, all campuses, all forms)
        [HttpPost("{id}/subjects/request-change")]
        public async Task<IActionResult> RequestSubjectChange(int id, [FromBody] RequestSubjectChangeDTO dto)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound(new { message = "Student not found" });

            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            var isAdd = string.Equals(dto.Action, "Add", StringComparison.OrdinalIgnoreCase);

            if (!isAdd)
            {
                var activeTerm = await _context.Terms
                    .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == student.SchoolId);
                var existing = activeTerm == null
                    ? null
                    : await _context.StudentSubjects.FirstOrDefaultAsync(ss =>
                        ss.StudentId == id && ss.SubjectId == dto.SubjectId && ss.TermId == activeTerm.Id && ss.IsActive);
                if (existing == null)
                    return NotFound(new { message = "Subject registration not found" });
            }

            _context.SubjectChangeRequests.Add(new SubjectChangeRequest
            {
                StudentId = id,
                SubjectId = dto.SubjectId,
                Action = isAdd ? "Add" : "Drop",
                Reason = dto.Reason?.Trim() ?? string.Empty,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow,
            });

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