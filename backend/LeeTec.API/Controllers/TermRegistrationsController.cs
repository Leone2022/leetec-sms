using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TermRegistrationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TermRegistrationsController(AppDbContext context)
        {
            _context = context;
        }

        // TERM DASHBOARD — all registrations for a term
        [HttpGet("dashboard/{termId}")]
        public async Task<IActionResult> GetTermDashboard(int termId, int schoolId = 1)
        {
            var term = await _context.Terms.FindAsync(termId);
            if (term == null)
                return NotFound(new { message = "Term not found" });

            var invoicePayments = await _context.Invoices
                .Where(i => i.TermId == termId && i.SchoolId == schoolId)
                .GroupBy(i => i.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    HasPaidFees = g.All(i => i.Status == "Paid"),
                    PaymentStatus = g.All(i => i.Status == "Paid")
                        ? "Paid"
                        : g.Any(i => i.AmountPaid > 0)
                            ? "PartiallyPaid"
                            : "Pending"
                })
                .ToListAsync();

            var invoiceLookup = invoicePayments.ToDictionary(x => x.StudentId, x => x);

            var registrations = await _context.TermRegistrations
                .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId)
                .Include(tr => tr.Student)
                .OrderBy(tr => tr.Student!.FirstName)
                .ThenBy(tr => tr.Student!.Surname)
                .ToListAsync();

            var registrationRows = registrations
                .Select(tr =>
                {
                    var payment = invoiceLookup.TryGetValue(tr.StudentId, out var invoicePayment)
                        ? invoicePayment
                        : null;

                    return new
                    {
                        tr.Id,
                        tr.StudentId,
                        StudentName = tr.Student!.FirstName + " " + tr.Student.Surname,
                        StudentNumber = tr.Student.StudentNumber,
                        tr.Form,
                        tr.ClassSection,
                        tr.Campus,
                        HasPaidFees = payment?.HasPaidFees ?? tr.HasPaidFees,
                        PaymentStatus = payment?.PaymentStatus ?? tr.PaymentStatus,
                        PromotionStatus = tr.PromotionStatus.ToString(),
                        tr.Status,
                        tr.FeePackageId,
                        tr.RegisteredAt
                    };
                })
                .ToList();

            var stats = new
            {
                TotalRegistered = registrationRows.Count,
                FullyPaid = registrationRows.Count(r => r.HasPaidFees),
                PendingPayment = registrationRows.Count(r => !r.HasPaidFees),
                Active = registrationRows.Count(r => r.Status == "Active")
            };

            return Ok(new
            {
                term = new
                {
                    term.Id,
                    term.Name,
                    term.Year,
                    term.TermNumber,
                    term.StartDate,
                    term.EndDate,
                    term.IsActive
                },
                stats,
                registrations = registrationRows
            });
        }

        // UNREGISTERED — students not yet in this term
        [HttpGet("unregistered/{termId}")]
        public async Task<IActionResult> GetUnregistered(int termId, int schoolId = 1)
        {
            var registeredIds = await _context.TermRegistrations
                .Where(tr => tr.TermId == termId && tr.SchoolId == schoolId)
                .Select(tr => tr.StudentId)
                .ToListAsync();

            var unregistered = await _context.Students
                .Where(s => s.SchoolId == schoolId
                    && s.Status == "Active"
                    && !registeredIds.Contains(s.Id))
                .Select(s => new
                {
                    s.Id,
                    s.StudentNumber,
                    s.FirstName,
                    s.Surname,
                    s.Form,
                    s.Gender
                })
                .OrderBy(s => s.Surname)
                .ToListAsync();

            return Ok(unregistered);
        }

        // BULK REGISTER students into a term
        [HttpPost("register")]
        public async Task<IActionResult> RegisterStudents([FromBody] RegisterStudentsDTO dto)
        {
            var term = await _context.Terms.FindAsync(dto.TermId);
            if (term == null)
                return NotFound(new { message = "Term not found" });

            var registered = 0;
            var skipped = 0;

            foreach (var studentId in dto.StudentIds)
            {
                var exists = await _context.TermRegistrations
                    .AnyAsync(tr => tr.StudentId == studentId && tr.TermId == dto.TermId);
                if (exists) { skipped++; continue; }

                var student = await _context.Students.FindAsync(studentId);
                if (student == null) continue;

                var campus = student.StudentNumber.Split('/')[0];

                _context.TermRegistrations.Add(new TermRegistration
                {
                    StudentId = studentId,
                    TermId = dto.TermId,
                    SchoolId = dto.SchoolId,
                    Form = student.Form,
                    ClassSection = student.Form,
                    Campus = campus,
                    FeePackageId = dto.FeePackageId,
                    HasPaidFees = false,
                    PaymentStatus = "Pending",
                    PromotionStatus = PromotionStatus.Pending,
                    Status = "Active",
                    RegisteredAt = DateTime.UtcNow
                });
                registered++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"{registered} registered, {skipped} already registered",
                registered,
                skipped
            });
        }

        // PROMOTE single student (with payment check)
        [HttpPost("promote-single")]
        public async Task<IActionResult> PromoteSingle([FromBody] PromoteSingleStudentDTO dto)
        {
            var currentReg = await _context.TermRegistrations
                .FindAsync(dto.CurrentRegistrationId);
            if (currentReg == null)
                return NotFound(new { message = "Registration not found" });

            if (!currentReg.HasPaidFees)
                return BadRequest(new { message = "Student must pay fees before promotion" });

            currentReg.PromotionStatus = PromotionStatus.Promoted;

            var exists = await _context.TermRegistrations
                .AnyAsync(tr => tr.StudentId == currentReg.StudentId
                    && tr.TermId == dto.TargetTermId);
            if (exists)
                return BadRequest(new { message = "Already registered in target term" });

            _context.TermRegistrations.Add(new TermRegistration
            {
                StudentId = currentReg.StudentId,
                TermId = dto.TargetTermId,
                SchoolId = currentReg.SchoolId,
                Form = string.IsNullOrEmpty(dto.NextClassSection)
                    ? currentReg.Form
                    : dto.NextClassSection,
                ClassSection = string.IsNullOrEmpty(dto.NextClassSection)
                    ? currentReg.ClassSection
                    : dto.NextClassSection,
                Campus = currentReg.Campus,
                FeePackageId = currentReg.FeePackageId,
                HasPaidFees = false,
                PaymentStatus = "Pending",
                PromotionStatus = PromotionStatus.Pending,
                Status = "Active",
                RegisteredAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Student promoted successfully" });
        }

        // BULK PROMOTE all paid students
        [HttpPost("promote-bulk")]
        public async Task<IActionResult> PromoteBulk([FromBody] PromoteStudentsDTO dto)
        {
            var fromRegs = await _context.TermRegistrations
                .Where(tr => tr.TermId == dto.FromTermId
                    && tr.SchoolId == dto.SchoolId
                    && tr.Status == "Active"
                    && tr.HasPaidFees)
                .ToListAsync();

            var promoted = 0;
            foreach (var reg in fromRegs)
            {
                var exists = await _context.TermRegistrations
                    .AnyAsync(tr => tr.StudentId == reg.StudentId
                        && tr.TermId == dto.ToTermId);
                if (exists) continue;

                reg.PromotionStatus = PromotionStatus.Promoted;

                _context.TermRegistrations.Add(new TermRegistration
                {
                    StudentId = reg.StudentId,
                    TermId = dto.ToTermId,
                    SchoolId = dto.SchoolId,
                    Form = reg.Form,
                    ClassSection = reg.ClassSection,
                    Campus = reg.Campus,
                    FeePackageId = reg.FeePackageId,
                    HasPaidFees = false,
                    PaymentStatus = "Pending",
                    PromotionStatus = PromotionStatus.Pending,
                    Status = "Active",
                    RegisteredAt = DateTime.UtcNow
                });
                promoted++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"{promoted} students promoted",
                promoted
            });
        }

        // UPDATE payment status
        [HttpPut("{id}/payment-status")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, string status)
        {
            var reg = await _context.TermRegistrations.FindAsync(id);
            if (reg == null)
                return NotFound(new { message = "Not found" });

            reg.PaymentStatus = status;
            reg.HasPaidFees = status == "Paid" || status == "FullyPaid";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Payment status updated" });
        }

        // REMOVE registration
        [HttpDelete("{id}")]
        public async Task<IActionResult> Remove(int id)
        {
            var reg = await _context.TermRegistrations.FindAsync(id);
            if (reg == null)
                return NotFound(new { message = "Not found" });

            _context.TermRegistrations.Remove(reg);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration removed" });
        }
    }
}
