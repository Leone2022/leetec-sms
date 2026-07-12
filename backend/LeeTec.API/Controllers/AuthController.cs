using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;
using LeeTec.API.Services;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthController(AppDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest("Email already exists");

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                SchoolId = dto.SchoolId,
                Status = "Active",
                EmailVerified = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok("User registered successfully");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return Unauthorized("Invalid email or password");

            var validPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!validPassword && IsTempPasswordValid(user) && BCrypt.Net.BCrypt.Verify(dto.Password, user.TempPassword))
                validPassword = true;

            if (!validPassword)
                return Unauthorized("Invalid email or password");

            var token = GenerateToken(user);
            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            List<string> permissions;
            try
            {
                permissions = string.IsNullOrWhiteSpace(user.Permissions)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(user.Permissions) ?? new List<string>());
            }
            catch (JsonException)
            {
                permissions = new List<string>();
            }

            return Ok(new AuthResponseDTO
            {
                Token = token,
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = roles,
                Permissions = permissions,
                MustChangePassword = user.MustChangePassword
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto)
        {
            const string genericMessage = "If this email exists, a temporary password has been sent.";

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (user == null)
                    return Ok(new { message = genericMessage });

                var tempPassword = GenerateTempPassword();
                Console.WriteLine($"[ForgotPassword] Temp password for {dto.Email}: {tempPassword}");

                user.TempPassword = BCrypt.Net.BCrypt.HashPassword(tempPassword);
                user.TempPasswordExpiry = DateTime.UtcNow.AddHours(24);
                user.MustChangePassword = true;
                await _context.SaveChangesAsync();

                var subject = "Your LeeTec SMS Temporary Password";
                var body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                        <div style='background-color: #1a237e; padding: 20px; text-align: center;'>
                            <h1 style='color: white; margin: 0;'>LeeTec SMS</h1>
                        </div>
                        <div style='padding: 30px; background-color: #f9f9f9;'>
                            <p>Your temporary password is:</p>
                            <p style='font-size: 22px; font-weight: 700; color: #1a237e; letter-spacing: 1px;'>{tempPassword}</p>
                            <p>This password expires in <strong>24 hours</strong>.</p>
                            <p>You will be prompted to change it on first login.</p>
                            <p style='font-size: 13px; color: #757575;'>If you did not request a password reset, please contact your administrator.</p>
                        </div>
                        <div style='background-color: #1a237e; padding: 15px; text-align: center;'>
                            <p style='color: #c5cae9; margin: 0; font-size: 13px;'>LeeTec School Management System</p>
                        </div>
                    </div>";

                // Fire-and-forget: don't make the caller wait on SMTP, and don't
                // let an email failure change the generic response below.
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _emailService.SendAsync(user.Email, subject, body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Email failed: {ex.Message}");
                    }
                });

                return Ok(new { message = genericMessage });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ForgotPassword] Error: {ex.Message}");
                Console.WriteLine($"[ForgotPassword] Stack: {ex.StackTrace}");
                return Ok(new { message = genericMessage });
            }
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDTO dto)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid token" });

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found" });

            var validCurrent = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash)
                || (IsTempPasswordValid(user) && BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.TempPassword));

            if (!validCurrent)
                return BadRequest(new { message = "Current password is incorrect" });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
                return BadRequest(new { message = "New password must be at least 8 characters" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.TempPassword = null;
            user.TempPasswordExpiry = null;
            user.MustChangePassword = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        private static bool IsTempPasswordValid(User user) =>
            !string.IsNullOrEmpty(user.TempPassword)
            && user.TempPasswordExpiry.HasValue
            && user.TempPasswordExpiry.Value > DateTime.UtcNow;

        private static string GenerateTempPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            var bytes = new byte[8];
            RandomNumberGenerator.Fill(bytes);
            var sb = new StringBuilder(8);
            foreach (var b in bytes)
                sb.Append(chars[b % chars.Length]);
            return sb.ToString();
        }

        private string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FirstName)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}