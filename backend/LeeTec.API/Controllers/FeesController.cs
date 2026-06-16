using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;
using System.Security.Claims;
using LeeTec.API.Services;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/fees")]
    public class FeesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FeesController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        // =====================
        // TERMS
        // =====================

        [HttpPost("terms")]
        public async Task<IActionResult> CreateTerm([FromBody] CreateTermRequest request)
        {
            var term = new Term
            {
                SchoolId = request.SchoolId,
                Name = request.Name,
                TermNumber = request.TermNumber,
                Year = request.Year,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsActive = false
            };

            _context.Terms.Add(term);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Term created successfully", term });
        }

        [HttpGet("terms/school/{schoolId}")]
        public async Task<IActionResult> GetTerms(int schoolId)
        {
            var terms = await _context.Terms
                .Where(t => t.SchoolId == schoolId)
                .OrderByDescending(t => t.Year)
                .ThenBy(t => t.TermNumber)
                .ToListAsync();

            return Ok(terms);
        }

        [HttpPut("terms/{id}/activate")]
        public async Task<IActionResult> ActivateTerm(int id)
        {
            var term = await _context.Terms.FindAsync(id);
            if (term == null) return NotFound(new { message = "Term not found" });

            var otherTerms = await _context.Terms
                .Where(t => t.SchoolId == term.SchoolId && t.Id != id)
                .ToListAsync();

            foreach (var t in otherTerms)
                t.IsActive = false;

            term.IsActive = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"{term.Name} is now the active term" });
        }

        // =====================
        // FEE CATEGORIES
        // =====================

        [HttpPost("categories")]
        public async Task<IActionResult> CreateFeeCategory([FromBody] CreateFeeCategoryRequest request)
        {
            var category = new FeeCategory
            {
                SchoolId = request.SchoolId,
                Name = request.Name,
                Description = request.Description,
                IsActive = true
            };

            _context.FeeCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Fee category created successfully", category });
        }

        [HttpGet("categories/school/{schoolId}")]
        public async Task<IActionResult> GetFeeCategories(int schoolId)
        {
            var categories = await _context.FeeCategories
                .Where(c => c.SchoolId == schoolId && c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return Ok(categories);
        }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateFeeCategory(int id, [FromBody] CreateFeeCategoryRequest request)
        {
            var category = await _context.FeeCategories.FindAsync(id);
            if (category == null) return NotFound(new { message = "Category not found" });

            category.Name = request.Name;
            category.Description = request.Description;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Category updated successfully", category });
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteFeeCategory(int id)
        {
            var category = await _context.FeeCategories.FindAsync(id);
            if (category == null) return NotFound(new { message = "Category not found" });

            category.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Category deactivated successfully" });
        }

        // =====================
        // FEE PACKAGES
        // =====================

        [HttpPost("packages")]
        public async Task<IActionResult> CreateFeePackage([FromBody] CreateFeePackageRequest request)
        {
            var term = await _context.Terms.FindAsync(request.TermId);
            if (term == null) return NotFound(new { message = "Term not found" });

            var invalidItem = request.Items.FirstOrDefault(i => i.ResolvedFeeCategoryId <= 0 || i.Amount <= 0);
            if (invalidItem != null)
                return BadRequest(new { message = "Each fee package item must include a valid category and amount" });

            var savedBy = User.FindFirstValue(ClaimTypes.Name)
                          ?? User.FindFirstValue(ClaimTypes.Email)
                          ?? "Admin";

            var package = new FeePackage
            {
                SchoolId = request.SchoolId,
                TermId = request.TermId,
                Name = request.Name,
                StudentType = request.StudentType,
                IsActive = true,
                LockedAt = DateTime.UtcNow,
                LockedBy = savedBy,
            };

            _context.FeePackages.Add(package);
            await _context.SaveChangesAsync();

            decimal total = 0;
            foreach (var item in request.Items)
            {
                var packageItem = new FeePackageItem
                {
                    FeePackageId = package.Id,
                    FeeCategoryId = item.ResolvedFeeCategoryId,
                    Amount = item.Amount
                };
                _context.FeePackageItems.Add(packageItem);
                total += item.Amount;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Fee package created successfully", package, total });
        }

        [HttpGet("packages/term/{termId}")]
        public async Task<IActionResult> GetFeePackagesByTerm(int termId)
        {
            var packages = await _context.FeePackages
                .Where(p => p.TermId == termId && p.IsActive)
                .Include(p => p.Items)
                    .ThenInclude(i => i.FeeCategory)
                .ToListAsync();

            return Ok(packages);
        }

        [HttpGet("packages/{id}")]
        public async Task<IActionResult> GetFeePackage(int id)
        {
            var package = await _context.FeePackages
                .Include(p => p.Items)
                    .ThenInclude(i => i.FeeCategory)
                .Include(p => p.Term)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (package == null) return NotFound(new { message = "Package not found" });

            return Ok(package);
        }
[HttpPut("packages/{id}")]
        public async Task<IActionResult> UpdateFeePackage(int id, [FromBody] CreateFeePackageRequest request)
        {
            var package = await _context.FeePackages
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (package == null) return NotFound(new { message = "Package not found" });

            var invalidItem = request.Items.FirstOrDefault(i => i.ResolvedFeeCategoryId <= 0 || i.Amount <= 0);
            if (invalidItem != null)
                return BadRequest(new { message = "Each fee package item must include a valid category and amount" });

            var updatedBy = User.FindFirstValue(ClaimTypes.Name)
                            ?? User.FindFirstValue(ClaimTypes.Email)
                            ?? "Admin";

            var existingInvoiceCount = await _context.Invoices
                .CountAsync(i => i.FeePackageId == id);

            package.Name = request.Name;
            package.StudentType = request.StudentType;
            package.LockedAt = DateTime.UtcNow;
            package.LockedBy = updatedBy;

            // Remove old items
            _context.FeePackageItems.RemoveRange(package.Items);

            // Add new items
            decimal total = 0;
            foreach (var item in request.Items)
            {
                _context.FeePackageItems.Add(new FeePackageItem
                {
                    FeePackageId = package.Id,
                    FeeCategoryId = item.ResolvedFeeCategoryId,
                    Amount = item.Amount
                });
                total += item.Amount;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Fee package updated",
                package,
                total,
                warning = existingInvoiceCount > 0
                    ? $"{existingInvoiceCount} existing invoices will NOT be updated automatically."
                    : null,
            });
        }

        // =====================
        // DIRECT CHARGES
        // =====================

        [HttpGet("student-balances/{termId}")]
        public async Task<IActionResult> GetStudentBalances(int termId, int schoolId = 1)
        {
            var invoiceRows = await _context.Invoices
                .Where(i => i.SchoolId == schoolId
                    && i.TermId == termId)
                .Include(i => i.Student)
                .ToListAsync();

            var invoices = invoiceRows
                .Select(i => new
                {
                    i.StudentId,
                    StudentName = i.Student.FirstName + " " + i.Student.Surname,
                    StudentNumber = i.Student.StudentNumber,
                    Campus = i.Student.StudentNumber.Contains('/')
                        ? i.Student.StudentNumber.Substring(0, i.Student.StudentNumber.IndexOf('/'))
                        : i.Student.StudentNumber,
                    i.Student.Form,
                    i.TotalAmount,
                    i.AmountPaid,
                    i.Balance,
                    i.Status,
                    i.InvoiceNumber,
                    i.Id
                })
                .OrderBy(i => i.StudentName)
                .ToList();

            var summary = new
            {
                TotalStudents = invoices.Count,
                TotalCharged = invoices.Sum(i => i.TotalAmount),
                TotalPaid = invoices.Sum(i => i.AmountPaid),
                TotalOutstanding = invoices.Sum(i => i.Balance)
            };

            return Ok(new { summary, students = invoices });
        }

        [HttpPost("charge-individual")]
        public async Task<IActionResult> ChargeIndividual([FromBody] IndividualChargeDTO dto)
        {
            var student = await _context.Students.FindAsync(dto.StudentId);
            if (student == null)
                return NotFound(new { message = "Student not found" });

            var term = await _context.Terms
                .FirstOrDefaultAsync(t => t.IsActive && t.SchoolId == dto.SchoolId);
            if (term == null)
                return BadRequest(new { message = "No active term" });

            var existing = await _context.Invoices
                .FirstOrDefaultAsync(i => i.StudentId == dto.StudentId
                    && i.TermId == term.Id);

            if (existing != null)
            {
                existing.TotalAmount += dto.Amount;
                existing.Balance += dto.Amount;
                if (existing.Balance > 0)
                    existing.Status = existing.AmountPaid > 0
                        ? "PartiallyPaid" : "Unpaid";

                _context.InvoiceItems.Add(new InvoiceItem
                {
                    InvoiceId = existing.Id,
                    FeeCategoryId = dto.FeeCategoryId ?? 1,
                    Description = dto.Description,
                    Amount = dto.Amount
                });
            }
            else
            {
                var count = await _context.Invoices.CountAsync() + 1;
                var campus = student.StudentNumber.Split('/')[0];
                var invoice = new Invoice
                {
                    SchoolId = dto.SchoolId,
                    StudentId = dto.StudentId,
                    TermId = term.Id,
                    FeePackageId = null,
                    InvoiceNumber = $"INV/{campus}/{term.Id}/{count:D4}",
                    TotalAmount = dto.Amount,
                    AmountPaid = 0,
                    Balance = dto.Amount,
                    Status = "Unpaid",
                    IssuedDate = DateTime.UtcNow,
                    DueDate = term.EndDate,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                _context.InvoiceItems.Add(new InvoiceItem
                {
                    InvoiceId = invoice.Id,
                    FeeCategoryId = dto.FeeCategoryId ?? 1,
                    Description = dto.Description,
                    Amount = dto.Amount
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Charge applied" });
        }
        // =====================
        // INVOICES
        // =====================

        [HttpPost("invoices/generate")]
        public async Task<IActionResult> GenerateInvoices([FromBody] GenerateInvoicesRequest request)
        {
            // Get all active students for this school
            var students = await _context.Students
                .Where(s => s.SchoolId == request.SchoolId && s.Status == "Active")
                .Include(s => s.InvoicingDetail)
                .ToListAsync();

            // Get fee packages for this term
            var packages = await _context.FeePackages
                .Where(p => p.TermId == request.TermId && p.IsActive)
                .Include(p => p.Items)
                    .ThenInclude(i => i.FeeCategory)
                .ToListAsync();

            if (!packages.Any())
                return BadRequest(new { message = "No fee packages found for this term. Please create fee packages first." });

            int invoicesCreated = 0;

            foreach (var student in students)
            {
                // Check if invoice already exists
                var existing = await _context.Invoices
                    .FirstOrDefaultAsync(i => i.StudentId == student.Id && i.TermId == request.TermId);

                if (existing != null) continue;

                // Match package by campus extracted from student number (e.g. "AHA/2026/0001" → "AHA")
                var campus = student.StudentNumber.Split('/')[0];
                var package = packages.FirstOrDefault(p => p.Name.Contains(campus))
                              ?? packages.First();

                var totalAmount = package.Items.Sum(i => i.Amount);
                var invoiceCount = await _context.Invoices.CountAsync() + 1;

                var invoice = new Invoice
                {
                    SchoolId = request.SchoolId,
                    StudentId = student.Id,
                    TermId = request.TermId,
                    FeePackageId = package.Id,
                    InvoiceNumber = $"INV/{campus}/{request.TermId}/{invoiceCount:D4}",
                    TotalAmount = totalAmount,
                    AmountPaid = 0,
                    Balance = totalAmount,
                    Status = "Unpaid",
                    IssuedDate = DateTime.UtcNow,
                    DueDate = request.DueDate,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                // Add invoice line items
                foreach (var item in package.Items)
                {
                    _context.InvoiceItems.Add(new InvoiceItem
                    {
                        InvoiceId = invoice.Id,
                        FeeCategoryId = item.FeeCategoryId,
                        Description = item.FeeCategory.Name,
                        Amount = item.Amount
                    });
                }

                await _context.SaveChangesAsync();
                invoicesCreated++;
            }

            return Ok(new { message = $"{invoicesCreated} invoices generated successfully", invoicesCreated });
        }

        [HttpGet("invoices/student/{studentId}")]
        public async Task<IActionResult> GetStudentInvoices(int studentId)
        {
            var invoices = await _context.Invoices
                .Where(i => i.StudentId == studentId)
                .Include(i => i.Items)
                .Include(i => i.Term)
                .Include(i => i.Payments)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            return Ok(invoices);
        }

        [HttpGet("invoices/{id}")]
        public async Task<IActionResult> GetInvoice(int id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                    .ThenInclude(item => item.FeeCategory)
                .Include(i => i.Term)
                .Include(i => i.Student)
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound(new { message = "Invoice not found" });

            return Ok(invoice);
        }

        [HttpGet("invoices/school/{schoolId}/term/{termId}")]
        public async Task<IActionResult> GetTermInvoices(int schoolId, int termId)
        {
            var invoices = await _context.Invoices
                .Where(i => i.SchoolId == schoolId && i.TermId == termId)
                .Include(i => i.Student)
                .Include(i => i.Term)
                .OrderBy(i => i.Student.Surname)
                .ToListAsync();

            var summary = new
            {
                TotalInvoices = invoices.Count,
                TotalBilled = invoices.Sum(i => i.TotalAmount),
                TotalCollected = invoices.Sum(i => i.AmountPaid),
                TotalOutstanding = invoices.Sum(i => i.Balance),
                Unpaid = invoices.Count(i => i.Status == "Unpaid"),
                PartiallyPaid = invoices.Count(i => i.Status == "PartiallyPaid"),
                FullyPaid = invoices.Count(i => i.Status == "Paid")
            };

            return Ok(new { summary, invoices });
        }

        // =====================
        // PAYMENTS
        // =====================

        [HttpPost("payments")]
        public async Task<IActionResult> PostPayment([FromBody] PostPaymentRequest request)
        {
            var invoice = await _context.Invoices.FindAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { message = "Invoice not found" });

            if (invoice.Status == "Paid")
                return BadRequest(new { message = "This invoice is already fully paid" });

            var postingUserId = request.PostedByUserId > 0 ? request.PostedByUserId : GetCurrentUserId();
            if (!postingUserId.HasValue)
                return BadRequest(new { message = "Unable to determine the user posting this payment" });

            var receiptNumber = !string.IsNullOrWhiteSpace(request.BankReceiptNumber)
                ? request.BankReceiptNumber
                : request.ReceiptNumber;

            // Generate receipt reference
            var paymentCount = await _context.Payments.CountAsync() + 1;
            var receiptRef = $"REC/WAH/{DateTime.UtcNow.Year}/{paymentCount:D4}";

            var payment = new Payment
            {
                SchoolId = invoice.SchoolId,
                InvoiceId = request.InvoiceId,
                StudentId = invoice.StudentId,
                PostedByUserId = postingUserId.Value,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                ReceiptNumber = receiptNumber,
                Notes = request.Notes,
                PaymentDate = request.PaymentDate,
                PostedAt = DateTime.UtcNow,
                ReceiptReference = receiptRef
            };
                    

            _context.Payments.Add(payment);

            // Update invoice balance
            invoice.AmountPaid += request.Amount;
            invoice.Balance = invoice.TotalAmount - invoice.AmountPaid;

            if (invoice.Balance <= 0)
                invoice.Status = "Paid";
            else if (invoice.AmountPaid > 0)
                invoice.Status = "PartiallyPaid";

            var registrations = await _context.TermRegistrations
                .Where(tr => tr.StudentId == invoice.StudentId
                    && tr.TermId == invoice.TermId
                    && tr.SchoolId == invoice.SchoolId)
                .ToListAsync();

            foreach (var registration in registrations)
            {
                registration.PaymentStatus = invoice.Status;
                registration.HasPaidFees = invoice.Status == "Paid";
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Payment posted successfully",
                receiptReference = receiptRef,
                amountPaid = request.Amount,
                newBalance = invoice.Balance,
                invoiceStatus = invoice.Status
            });
        }

        [HttpGet("payments/student/{studentId}")]
        public async Task<IActionResult> GetStudentPayments(int studentId)
        {
            var payments = await _context.Payments
                .Where(p => p.StudentId == studentId)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Term)
                .OrderByDescending(p => p.PostedAt)
                .ToListAsync();

            return Ok(payments);
        }

        [HttpGet("payments/invoice/{invoiceId}")]
        public async Task<IActionResult> GetInvoicePayments(int invoiceId)
        {
            var payments = await _context.Payments
                .Where(p => p.InvoiceId == invoiceId)
                .OrderByDescending(p => p.PostedAt)
                .ToListAsync();

            return Ok(payments);
        }

        [HttpPost("refunds")]
        public async Task<IActionResult> RefundPayment([FromBody] DTOs.RefundRequest request)
        {
            var invoice = await _context.Invoices.FindAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { message = "Invoice not found" });

            if (request.Amount <= 0)
                return BadRequest(new { message = "Refund amount must be greater than zero" });

            if (invoice.AmountPaid <= 0)
                return BadRequest(new { message = "No payments recorded for this invoice" });

            if (request.Amount > invoice.AmountPaid)
                return BadRequest(new { message = "Refund amount exceeds amount paid" });

            var postingUserId = request.PostedByUserId > 0 ? request.PostedByUserId : GetCurrentUserId();
            if (!postingUserId.HasValue)
                return BadRequest(new { message = "Unable to determine the user performing this refund" });

            var paymentCount = await _context.Payments.CountAsync() + 1;
            var receiptRef = $"REF/WAH/{System.DateTime.UtcNow.Year}/{paymentCount:D4}";

            var refund = new Payment
            {
                SchoolId = invoice.SchoolId,
                InvoiceId = invoice.Id,
                StudentId = invoice.StudentId,
                PostedByUserId = postingUserId.Value,
                Amount = -Math.Abs(request.Amount),
                PaymentMethod = request.PaymentMethod ?? "Refund",
                ReceiptNumber = request.ReceiptNumber ?? $"REF-{System.Guid.NewGuid().ToString().Substring(0,8)}",
                Notes = request.Reason,
                PaymentDate = request.RefundDate ?? System.DateTime.UtcNow,
                PostedAt = System.DateTime.UtcNow,
                ReceiptReference = receiptRef
            };

            _context.Payments.Add(refund);

            invoice.AmountPaid += refund.Amount; // refund.Amount is negative
            invoice.Balance = invoice.TotalAmount - invoice.AmountPaid;

            if (invoice.Balance <= 0)
                invoice.Status = "Paid";
            else if (invoice.AmountPaid > 0)
                invoice.Status = "PartiallyPaid";
            else
                invoice.Status = "Unpaid";

            var registrations = await _context.TermRegistrations
                .Where(tr => tr.StudentId == invoice.StudentId
                    && tr.TermId == invoice.TermId
                    && tr.SchoolId == invoice.SchoolId)
                .ToListAsync();

            foreach (var registration in registrations)
            {
                registration.PaymentStatus = invoice.Status;
                registration.HasPaidFees = invoice.Status == "Paid";
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Refund processed", refundId = refund.Id, newBalance = invoice.Balance, invoiceStatus = invoice.Status });
        }

        // =====================
        // DELETION / REVERSALS
        // =====================

        [HttpDelete("invoice-items/{id}")]
        public async Task<IActionResult> DeleteInvoiceItem(int id)
        {
            var item = await _context.InvoiceItems
                .Include(i => i.Invoice)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFound(new { message = "Invoice item not found" });

            var invoice = item.Invoice;

            // Do not allow removing items if invoice has payments recorded
            if (invoice.AmountPaid > 0)
                return BadRequest(new { message = "Cannot remove invoice item after payments have been posted. Please refund or adjust payments first." });

            // Adjust invoice totals
            invoice.TotalAmount -= item.Amount;
            invoice.Balance -= item.Amount;

            _context.InvoiceItems.Remove(item);

            // If invoice has no more items and no payments, delete the invoice too
            var remainingItems = await _context.InvoiceItems.CountAsync(ii => ii.InvoiceId == invoice.Id);
            if (remainingItems == 0 && invoice.AmountPaid == 0)
            {
                _context.Invoices.Remove(invoice);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Invoice item removed", invoiceId = invoice.Id });
        }

        [HttpDelete("invoices/{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) return NotFound(new { message = "Invoice not found" });

            if (invoice.AmountPaid > 0 || (invoice.Payments != null && invoice.Payments.Any()))
                return BadRequest(new { message = "Cannot delete invoice with payments. Please process refunds before deleting." });

            // Remove items first
            if (invoice.Items != null && invoice.Items.Any())
                _context.InvoiceItems.RemoveRange(invoice.Items);

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Invoice deleted" });
        }

        // ── Banking details helper ────────────────────────────────────────────────
        private static (string BankName, string Nostro, string Zwl) GetBankingDetails(string studentNumber)
        {
            var campus = studentNumber.Split('/').FirstOrDefault() ?? "";
            if (campus.Equals("AHJ", StringComparison.OrdinalIgnoreCase))
                return ("Advent Hope Junior", "413400324548405", "4134324548080");
            return ("Advent Hope Academy", "413400523382405", "413400523382200");
        }

        // =====================
        // BULK EMAIL
        // =====================

        [HttpPost("invoices/send-bulk-email")]
        public async Task<IActionResult> SendBulkInvoiceEmails([FromBody] SendBulkInvoiceRequest request)
        {
            var invoices = await _context.Invoices
                .Where(i => i.SchoolId == request.SchoolId && i.TermId == request.TermId)
                .Include(i => i.Student)
                .Include(i => i.Items)
                .Include(i => i.Term)
                .ToListAsync();

            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();

            int sent = 0;
            int failed = 0;

            foreach (var invoice in invoices)
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == invoice.Student.UserId);

                var family = await _context.Families
                    .FirstOrDefaultAsync(f => f.StudentId == invoice.StudentId);

                var email = user?.Email ?? family?.Email;
                if (string.IsNullOrEmpty(email)) { failed++; continue; }

                var itemsHtml = string.Join("", invoice.Items.Select(i =>
                    $"<tr><td style='padding:6px 8px'>{i.Description}</td>" +
                    $"<td style='text-align:right;padding:6px 8px'>${i.Amount:N2}</td></tr>"));

                var body = $@"
<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a'>
  <h2 style='color:#1a237e;margin-bottom:4px'>Advent Hope Academy</h2>
  <h3 style='margin-top:0'>Fee Invoice — {invoice.Term.Name} {invoice.Term.Year}</h3>
  <p>Dear Parent/Guardian of <strong>{invoice.Student.FirstName} {invoice.Student.Surname}</strong>,</p>
  <p>Student Number: <strong style='font-family:monospace'>{invoice.Student.StudentNumber}</strong></p>
  <p>Invoice Reference: <strong>{invoice.InvoiceNumber}</strong></p>
  <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:14px'>
    <thead>
      <tr style='background:#f1f5f9'>
        <th style='text-align:left;padding:8px'>Description</th>
        <th style='text-align:right;padding:8px'>Amount</th>
      </tr>
    </thead>
    <tbody>{itemsHtml}</tbody>
    <tfoot>
      <tr style='border-top:2px solid #1a237e'>
        <td style='padding:8px;font-weight:bold'>Total</td>
        <td style='text-align:right;padding:8px;font-weight:bold'>${invoice.TotalAmount:N2}</td>
      </tr>
      <tr>
        <td style='padding:8px'>Amount Paid</td>
        <td style='text-align:right;padding:8px'>${invoice.AmountPaid:N2}</td>
      </tr>
      <tr style='color:#dc2626'>
        <td style='padding:8px;font-weight:bold'>Balance Due</td>
        <td style='text-align:right;padding:8px;font-weight:bold'>${invoice.Balance:N2}</td>
      </tr>
    </tfoot>
  </table>
  <p><strong>Banking Details:</strong><br/>
     Bank: ZB Bank&nbsp;&nbsp;|&nbsp;&nbsp;Name: {GetBankingDetails(invoice.Student.StudentNumber).BankName}<br/>
     Branch: Msasa&nbsp;&nbsp;|&nbsp;&nbsp;NOSTRO: {GetBankingDetails(invoice.Student.StudentNumber).Nostro}<br/>
     ZWL: {GetBankingDetails(invoice.Student.StudentNumber).Zwl}</p>
  <p style='color:#64748b;font-size:12px'>This is an automated invoice from LeeTec SMS.</p>
</div>";

                try
                {
                    await emailService.SendAsync(
                        email,
                        $"Fee Invoice — {invoice.Term.Name} {invoice.Term.Year} — {invoice.Student.FirstName} {invoice.Student.Surname}",
                        body);
                    sent++;
                }
                catch
                {
                    failed++;
                }
            }

            return Ok(new
            {
                message = $"{sent} invoice{(sent != 1 ? "s" : "")} emailed, {failed} failed",
                sent,
                failed,
            });
        }

        // =====================
        // SINGLE INVOICE EMAIL
        // =====================

        [HttpPost("invoices/send-single-email")]
        public async Task<IActionResult> SendSingleInvoiceEmail([FromBody] SendSingleInvoiceRequest request)
        {
            try
            {
            var invoice = await _context.Invoices
                .Include(i => i.Student)
                .Include(i => i.Items)
                .Include(i => i.Term)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync(i => i.StudentId == request.StudentId);

            if (invoice == null)
                return NotFound(new { message = "No invoice found for this student" });

            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { message = "No email address provided for this student/guardian" });

            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();

            var itemsHtml = string.Join("", invoice.Items.Select(i =>
                $"<tr>" +
                $"<td style='padding:8px;border-bottom:1px solid #e2e8f0'>{i.Description}</td>" +
                $"<td style='padding:8px;border-bottom:1px solid #e2e8f0;text-align:right'>${i.Amount:N2}</td>" +
                $"</tr>"));

            var balanceColor = invoice.Balance > 0 ? "#dc2626" : "#16a34a";

            var body = $@"
<div style='font-family:Arial,sans-serif;max-width:650px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden'>
    <div style='background:#1a237e;padding:24px;color:white'>
        <h1 style='margin:0;font-size:24px'>Advent Hope Academy</h1>
        <p style='margin:4px 0 0;opacity:0.8'>Fee Invoice Statement</p>
    </div>
    <div style='padding:24px'>
        <table style='width:100%;margin-bottom:24px'>
            <tr>
                <td>
                    <strong>Student:</strong> {invoice.Student.FirstName} {invoice.Student.Surname}<br/>
                    <strong>Student No:</strong> {invoice.Student.StudentNumber}<br/>
                    <strong>Form:</strong> {invoice.Student.Form}
                </td>
                <td style='text-align:right'>
                    <strong>Invoice:</strong> {invoice.InvoiceNumber}<br/>
                    <strong>Term:</strong> {invoice.Term.Name} {invoice.Term.Year}<br/>
                    <strong>Status:</strong> {invoice.Status}
                </td>
            </tr>
        </table>
        <table style='width:100%;border-collapse:collapse;margin-bottom:24px'>
            <thead>
                <tr style='background:#f8fafc'>
                    <th style='padding:10px 8px;text-align:left;border-bottom:2px solid #1a237e'>Description</th>
                    <th style='padding:10px 8px;text-align:right;border-bottom:2px solid #1a237e'>Amount</th>
                </tr>
            </thead>
            <tbody>{itemsHtml}</tbody>
            <tfoot>
                <tr>
                    <td style='padding:8px;font-weight:bold'>Total Fees</td>
                    <td style='padding:8px;text-align:right;font-weight:bold'>${invoice.TotalAmount:N2}</td>
                </tr>
                <tr style='background:#f0fdf4'>
                    <td style='padding:8px'>Amount Paid</td>
                    <td style='padding:8px;text-align:right;color:#16a34a'>-${invoice.AmountPaid:N2}</td>
                </tr>
                <tr style='background:#fef2f2'>
                    <td style='padding:10px 8px;font-weight:bold;font-size:16px'>BALANCE DUE</td>
                    <td style='padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;color:{balanceColor}'>${invoice.Balance:N2}</td>
                </tr>
            </tfoot>
        </table>
        <div style='background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:16px'>
            <strong>Banking Details:</strong><br/>
            Bank: ZB Bank &nbsp;|&nbsp; Branch: Msasa<br/>
            Name: {GetBankingDetails(invoice.Student.StudentNumber).BankName}<br/>
            NOSTRO: {GetBankingDetails(invoice.Student.StudentNumber).Nostro} &nbsp;|&nbsp; ZWL: {GetBankingDetails(invoice.Student.StudentNumber).Zwl}
        </div>
        <p style='color:#64748b;font-size:12px;text-align:center'>
            This is a computer generated invoice from LeeTec SMS · Advent Hope Academy<br/>
            Please retain this email for your records.
        </p>
    </div>
</div>";

            await emailService.SendAsync(
                request.Email,
                $"Fee Invoice - {invoice.Term.Name} {invoice.Term.Year} - {invoice.Student.FirstName} {invoice.Student.Surname}",
                body);

            return Ok(new { message = "Invoice emailed successfully", email = request.Email });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendSingleInvoiceEmail] ERROR: {ex.Message}");
                Console.WriteLine($"[SendSingleInvoiceEmail] StackTrace: {ex.StackTrace}");
                Console.WriteLine($"[SendSingleInvoiceEmail] InnerException: {ex.InnerException?.Message}");

                return StatusCode(500, new
                {
                    message = "Failed to send email",
                    error = ex.Message,
                    innerError = ex.InnerException?.Message
                });
            }
        }
    }
}