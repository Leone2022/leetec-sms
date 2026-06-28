using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LeeTec.API.Data;
using LeeTec.API.DTOs;
using LeeTec.API.Models;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class ActivationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public ActivationController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("activate")]
        public async Task<IActionResult> Activate([FromBody] ActivateDTO dto)
        {
            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match" });

            if (dto.Password.Length < 8)
                return BadRequest(new { message = "Password must be at least 8 characters" });

            var activationToken = await _context.ActivationTokens
                .Include(t => t.Student)
                .FirstOrDefaultAsync(t => t.Token == dto.Token);

            if (activationToken == null)
                return BadRequest(new { message = "Invalid activation link" });

            if (activationToken.IsUsed)
                return BadRequest(new { message = "This activation link has already been used" });

            if (activationToken.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "This activation link has expired" });

            var student = activationToken.Student;

            // Find or create the StudentPortalAccount
            var account = await _context.StudentPortalAccounts
                .FirstOrDefaultAsync(a => a.StudentId == student.Id);

            if (account == null)
            {
                account = new StudentPortalAccount
                {
                    StudentId = student.Id,
                    Email = string.Empty,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.StudentPortalAccounts.Add(account);
            }

            account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            account.Status = "Active";
            account.EmailVerified = true;
            account.ApprovedAt = DateTime.UtcNow;

            activationToken.IsUsed = true;

            await _context.SaveChangesAsync();

            var campus = student.StudentNumber.Split('/')[0];

            var jwtToken = GenerateStudentToken(student, campus);

            return Ok(new
            {
                token = jwtToken,
                student = new
                {
                    id = student.Id,
                    studentNumber = student.StudentNumber,
                    firstName = student.FirstName,
                    surname = student.Surname,
                    form = student.Form,
                    campus,
                }
            });
        }

        private string GenerateStudentToken(Student student, string campus)
        {
            var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? _configuration["Jwt:Key"]!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, student.Id.ToString()),
                new Claim(ClaimTypes.GivenName, student.FirstName),
                new Claim("studentNumber", student.StudentNumber),
                new Claim("campus", campus),
                new Claim("role", "Student"),
            };

            var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? _configuration["Jwt:Issuer"]!;
            var jwtAud = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? _configuration["Jwt:Audience"]!;

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAud,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(30),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
