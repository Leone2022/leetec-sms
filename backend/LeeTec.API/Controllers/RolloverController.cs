using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Services;

namespace LeeTec.API.Controllers
{
    // Year-end / new-term wizard on the Terms page.
    [ApiController]
    [Route("api/rollover")]
    public class RolloverController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly YearEndPromotionService _promotion;

        public RolloverController(AppDbContext context, YearEndPromotionService promotion)
        {
            _context = context;
            _promotion = promotion;
        }

        // PREVIEW year-end promotion: every current student with the suggested next class.
        [Authorize]
        [HttpGet("promotion-preview")]
        public async Task<IActionResult> PromotionPreview([FromQuery] int schoolId = 1)
        {
            if (!await TermsAdmin.IsAllowedAsync(_context, User, schoolId)) return TermsAdmin.Forbidden();
            return Ok(await _promotion.PreviewAsync(schoolId));
        }

        // APPLY year-end promotion (one transaction). See YearEndPromotionService.ApplyAsync.
        [Authorize]
        [HttpPost("promote")]
        public async Task<IActionResult> Promote([FromBody] PromotionApplyRequest req)
        {
            if (!await TermsAdmin.IsAllowedAsync(_context, User, req.SchoolId)) return TermsAdmin.Forbidden();
            var (ok, result) = await _promotion.ApplyAsync(req);
            return ok ? Ok(result) : BadRequest(result);
        }

        // TERM CHECKLIST: what is left to set up for a term (registrations, subjects, invoices).
        [Authorize]
        [HttpGet("term-status/{termId}")]
        public async Task<IActionResult> TermStatus(int termId)
        {
            var term = await _context.Terms.FirstOrDefaultAsync(t => t.Id == termId);
            if (term == null) return NotFound(new { message = "Term not found" });
            if (!await TermsAdmin.IsAllowedAsync(_context, User, term.SchoolId)) return TermsAdmin.Forbidden();

            var activeIds = await _context.Students
                .Where(s => s.SchoolId == term.SchoolId && s.Status == StudentLifecycle.Active)
                .Select(s => s.Id)
                .ToListAsync();

            var registeredIds = (await _context.TermRegistrations
                .Where(r => r.TermId == termId && r.Status == "Active" && activeIds.Contains(r.StudentId))
                .Select(r => r.StudentId)
                .ToListAsync()).ToHashSet();

            var withSubjects = (await _context.StudentSubjects
                .Where(ss => ss.TermId == termId && ss.IsActive && activeIds.Contains(ss.StudentId))
                .Select(ss => ss.StudentId)
                .Distinct()
                .ToListAsync()).ToHashSet();

            var invoiced = (await _context.Invoices
                .Where(i => i.TermId == termId && activeIds.Contains(i.StudentId))
                .Select(i => i.StudentId)
                .Distinct()
                .ToListAsync()).ToHashSet();

            var nextTerm = await _context.Terms
                .Where(t => t.SchoolId == term.SchoolId && t.StartDate > term.StartDate)
                .OrderBy(t => t.StartDate)
                .Select(t => new { t.Id, t.Name, t.StartDate })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                termId,
                termName = term.Name,
                term.IsActive,
                currentStudents = activeIds.Count,
                registered = registeredIds.Count,
                notRegistered = activeIds.Count - registeredIds.Count,
                registeredWithoutSubjects = registeredIds.Count(id => !withSubjects.Contains(id)),
                registeredNotInvoiced = registeredIds.Count(id => !invoiced.Contains(id)),
                nextTerm,
            });
        }
    }
}
