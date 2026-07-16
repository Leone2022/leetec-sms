using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/verses")]
    public class VersesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VersesController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/verses/current?schoolId={}
        [AllowAnonymous]
        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent([FromQuery] int schoolId = 1)
        {
            var verse = await _context.DailyVerses
                .Where(v => v.SchoolId == schoolId && v.IsActive)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();

            return Ok(verse);
        }

        // POST /api/verses
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVerseRequest request)
        {
            var verse = new DailyVerse
            {
                SchoolId = request.SchoolId,
                Type = request.Type,
                Text = request.Text.Trim(),
                Reference = request.Reference.Trim(),
                PostedBy = request.PostedBy,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                Definition = request.Definition?.Trim(),
                UsageExample = request.UsageExample?.Trim(),
                PartOfSpeech = request.PartOfSpeech,
            };

            _context.DailyVerses.Add(verse);
            await _context.SaveChangesAsync();

            return Ok(verse);
        }
    }

    public class CreateVerseRequest
    {
        public int SchoolId { get; set; } = 1;
        public string Type { get; set; } = "Bible Verse";
        public string Text { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string PostedBy { get; set; } = string.Empty;
        public string? Definition { get; set; }
        public string? UsageExample { get; set; }
        public string? PartOfSpeech { get; set; }
    }
}
