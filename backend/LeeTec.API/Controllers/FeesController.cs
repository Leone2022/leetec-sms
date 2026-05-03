using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

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

            var package = new FeePackage
            {
                SchoolId = request.SchoolId,
                TermId = request.TermId,
                Name = request.Name,
                StudentType = request.StudentType,
                IsActive = true
            };

            _context.FeePackages.Add(package);
            await _context.SaveChangesAsync();

            decimal total = 0;
            foreach (var item in request.Items)
            {
                var packageItem = new FeePackageItem
                {
                    FeePackageId = package.Id,
                    FeeCategoryId = item.FeeCategoryId,
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

                // Match student to package by type (Day/Boarding)
                var studentType = student.Form?.StartsWith("F") == true ? "Day" : "Day";
                var package = packages.FirstOrDefault(p => p.StudentType == studentType)
                              ?? packages.First();

                var totalAmount = package.Items.Sum(i => i.Amount);
                var invoiceCount = await _context.Invoices.CountAsync() + 1;

                var invoice = new Invoice
                {
                    SchoolId = request.SchoolId,
                    StudentId = student.Id,
                    TermId = request.TermId,
                    FeePackageId = package.Id,
                    InvoiceNumber = $"INV/WAH/{request.TermId}/{invoiceCount:D4}",
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

            return Ok(new { message = $"{invoicesCreated} invoices generated successfully" });
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

            // Generate receipt reference
            var paymentCount = await _context.Payments.CountAsync() + 1;
            var receiptRef = $"REC/WAH/{DateTime.UtcNow.Year}/{paymentCount:D4}";

            var payment = new Payment
            {
                SchoolId = request.SchoolId,
                InvoiceId = request.InvoiceId,
                StudentId = request.StudentId,
                PostedByUserId = request.PostedByUserId,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                ReceiptNumber = request.ReceiptNumber,
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
    }
}