using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/announcements")]
    public class AnnouncementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnnouncementsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/announcements?schoolId={}&campus={}&includeInactive={}
        [HttpGet]
        public async Task<IActionResult> GetAnnouncements(
            [FromQuery] int schoolId = 1,
            [FromQuery] string? campus = null,
            [FromQuery] bool includeInactive = false)
        {
            var query = _context.Announcements
                .Where(a => a.SchoolId == schoolId);

            if (!includeInactive)
                query = query.Where(a => a.IsActive);

            if (!string.IsNullOrEmpty(campus))
                query = query.Where(a => a.TargetCampus == "All" || a.TargetCampus == campus);

            var announcements = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(announcements);
        }

        // POST /api/announcements
        [HttpPost]
        public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
        {
            var announcement = new Announcement
            {
                SchoolId = request.SchoolId,
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                TargetCampus = request.TargetCampus,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
            };

            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            return Ok(announcement);
        }

        // DELETE /api/announcements/{id}  (soft-deactivate)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAnnouncement(int id)
        {
            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound(new { message = "Announcement not found." });

            announcement.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Announcement deactivated." });
        }
    }

    public class CreateAnnouncementRequest
    {
        public int SchoolId { get; set; } = 1;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string TargetCampus { get; set; } = "All";
    }
}
