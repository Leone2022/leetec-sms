using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentsController(AppDbContext context)
        {
            _context = context;
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

                // Generate prefix based on campus
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
                await transaction.CommitAsync();

                return Ok(new {
                    message = "Student enrolled successfully",
                    studentNumber = student.StudentNumber,
                    studentId = student.Id,
                    campus = prefix
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

        // GET SINGLE STUDENT WITH ALL DETAILS
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

        // ADD GUARDIAN (Father, Mother, or Legal Guardian)
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