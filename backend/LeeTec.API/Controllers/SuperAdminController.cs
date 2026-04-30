using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SuperAdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SuperAdminController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("schools")]
        public async Task<IActionResult> GetAllSchools()
        {
            var schools = await _context.Schools
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Address,
                    s.Phone,
                    s.Email,
                    s.IsActive,
                    s.CreatedAt,
                    TotalUsers = _context.Users.Count(u => u.SchoolId == s.Id)
                })
                .ToListAsync();

            return Ok(schools);
        }

        [HttpPost("schools")]
        public async Task<IActionResult> CreateSchool(School school)
        {
            _context.Schools.Add(school);
            await _context.SaveChangesAsync();
            return Ok(school);
        }

        [HttpPut("schools/{id}/toggle-active")]
        public async Task<IActionResult> ToggleSchoolActive(int id)
        {
            var school = await _context.Schools.FindAsync(id);
            if (school == null) return NotFound("School not found");

            school.IsActive = !school.IsActive;
            await _context.SaveChangesAsync();

            return Ok($"School is now {(school.IsActive ? "Active" : "Inactive")}");
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Include(u => u.School)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    u.Status,
                    School = u.School.Name,
                    Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetPlatformStats()
        {
            return Ok(new
            {
                TotalSchools = await _context.Schools.CountAsync(),
                ActiveSchools = await _context.Schools.CountAsync(s => s.IsActive),
                TotalUsers = await _context.Users.CountAsync(),
                TotalStudents = await _context.UserRoles
                    .CountAsync(ur => ur.Role.Name == "Student")
            });
        }
    }
}