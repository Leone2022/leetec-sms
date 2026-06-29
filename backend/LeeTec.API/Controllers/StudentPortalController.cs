using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.Services;
using BCrypt.Net;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/student-portal")]
    public class StudentPortalController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public StudentPortalController(AppDbContext context, IEmailService emailService, IConfiguration config)
        {
            _context = context;
            _emailService = emailService;
            _config = config;
        }

        // =====================
        // REGISTER
        // =====================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] StudentPortalRegisterRequest request)
        {
            // Check student number exists
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentNumber == request.StudentNumber && s.SchoolId == request.SchoolId);

            if (student == null)
                return NotFound(new { message = "Student number not found. Please contact your school admin." });

            // Check if account already exists
            var existing = await _context.StudentPortalAccounts
                .FirstOrDefaultAsync(a => a.StudentId == student.Id);

            if (existing != null)
                return BadRequest(new { message = "An account already exists for this student." });

            // Check email not already used
            var emailExists = await _context.StudentPortalAccounts
                .FirstOrDefaultAsync(a => a.Email == request.Email);

            if (emailExists != null)
                return BadRequest(new { message = "This email is already registered." });

            var account = new StudentPortalAccount
            {
                StudentId = student.Id,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Status = "Active",
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.StudentPortalAccounts.Add(account);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Registration successful! You can now log in.",
                studentName = $"{student.FirstName} {student.Surname}"
            });
        }

        // =====================
        // ADMIN - GET PENDING ACCOUNTS
        // =====================
        [HttpGet("pending-accounts")]
        public async Task<IActionResult> GetPendingAccounts()
        {
            var accounts = await _context.StudentPortalAccounts
                .Where(a => a.Status == "Pending" && a.EmailVerified == true)
                .Include(a => a.Student)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.Email,
                    a.Status,
                    a.EmailVerified,
                    a.CreatedAt,
                    StudentName = $"{a.Student.FirstName} {a.Student.Surname}",
                    a.Student.StudentNumber,
                    a.Student.Form
                })
                .ToListAsync();

            return Ok(accounts);
        }

        // =====================
        // ADMIN - APPROVE ACCOUNT
        // =====================
        [HttpPut("approve/{id}")]
        public async Task<IActionResult> ApproveAccount(int id)
        {
            var account = await _context.StudentPortalAccounts
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (account == null)
                return NotFound(new { message = "Account not found." });

            account.Status = "Active";
            account.ApprovedAt = DateTime.UtcNow;
            account.ApprovedByUserId = 1; // Will use JWT user later

            await _context.SaveChangesAsync();

            // Send approval email
            await _emailService.SendAccountApprovedAsync(
                account.Email,
                $"{account.Student.FirstName} {account.Student.Surname}"
            );

            return Ok(new { message = $"Account for {account.Student.FirstName} {account.Student.Surname} approved successfully!" });
        }

        // =====================
        // ADMIN - SUSPEND ACCOUNT
        // =====================
        [HttpPut("suspend/{id}")]
        public async Task<IActionResult> SuspendAccount(int id)
        {
            var account = await _context.StudentPortalAccounts
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (account == null)
                return NotFound(new { message = "Account not found." });

            account.Status = "Suspended";
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Account suspended successfully." });
        }

        // =====================
        // LOGIN
        // =====================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] StudentPortalLoginRequest request)
        {
            var account = await _context.StudentPortalAccounts
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Email == request.Email);

            if (account == null)
                return Unauthorized(new { message = "Invalid email or password." });

            if (!BCrypt.Net.BCrypt.Verify(request.Password, account.PasswordHash))
                return Unauthorized(new { message = "Invalid email or password." });

            if (!account.EmailVerified)
                return Unauthorized(new { message = "Please verify your email before logging in." });

            if (account.Status == "Pending")
                return Unauthorized(new { message = "Your account is pending admin approval." });

            if (account.Status == "Suspended")
                return Unauthorized(new { message = "Your account has been suspended. Please contact your school." });

            // Update last login
            account.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = GenerateStudentJwtToken(account);

            return Ok(new
            {
                message = "Login successful!",
                token,
                student = new
                {
                    id = account.StudentId,
                    studentId = account.StudentId,
                    account.Student.StudentNumber,
                    account.Student.FirstName,
                    account.Student.Surname,
                    account.Student.Form,
                    campus = account.Student.StudentNumber.Split('/')[0],
                    account.Student.Curriculum,
                    account.Email,
                    account.LastLoginAt
                }
            });
        }

        // =====================
        // FORGOT PASSWORD
        // =====================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var account = await _context.StudentPortalAccounts
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Email == request.Email);

            // Always return success to prevent email enumeration
            if (account == null)
                return Ok(new { message = "If this email is registered, a reset link has been sent." });

            var resetToken = Guid.NewGuid().ToString("N");
            account.PasswordResetToken = resetToken;
            account.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);

            await _context.SaveChangesAsync();

            var resetLink = $"http://localhost:5173/reset-password?token={resetToken}";
            await _emailService.SendPasswordResetAsync(
                account.Email,
                $"{account.Student.FirstName} {account.Student.Surname}",
                resetLink
            );

            return Ok(new { message = "If this email is registered, a reset link has been sent." });
        }

        // =====================
        // RESET PASSWORD
        // =====================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var account = await _context.StudentPortalAccounts
                .FirstOrDefaultAsync(a => a.PasswordResetToken == request.Token);

            if (account == null)
                return NotFound(new { message = "Invalid or expired reset link." });

            if (account.PasswordResetExpiry < DateTime.UtcNow)
                return BadRequest(new { message = "Reset link has expired. Please request a new one." });

            account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            account.PasswordResetToken = null;
            account.PasswordResetExpiry = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully! You can now log in." });
        }

        // =====================
        // GET STUDENT DASHBOARD
        // =====================
        [HttpGet("dashboard/{studentId}")]
        public async Task<IActionResult> GetDashboard(int studentId)
        {
            var student = await _context.Students
                .Include(s => s.Family)
                .Include(s => s.Guardians)
                .FirstOrDefaultAsync(s => s.Id == studentId);

            if (student == null)
                return NotFound(new { message = "Student not found." });

            // Get latest invoice
            var latestInvoice = await _context.Invoices
                .Where(i => i.StudentId == studentId)
                .Include(i => i.Term)
                .Include(i => i.Items)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                student = new
                {
                    student.Id,
                    student.StudentNumber,
                    student.FirstName,
                    student.Surname,
                    student.Form,
                    student.Gender,
                    student.Curriculum,
                    campus = student.StudentNumber.Split('/')[0],
                    student.Status
                },
                latestInvoice
            });
        }

        // =====================
        // PORTAL — GET REPORT CARD
        // =====================
        [HttpGet("report-card")]
        public async Task<IActionResult> GetPortalReportCard([FromQuery] int studentId, [FromQuery] int termId)
        {
            var record = await _context.ReportCardRecords
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.TermId == termId && r.Status == "Published");

            if (record == null)
                return NotFound(new { message = "Your report card for this term has not been published yet. Please check back later." });

            var data = System.Text.Json.JsonDocument.Parse(record.ReportData);
            return Ok(data.RootElement);
        }

        // =====================
        // JWT TOKEN GENERATOR
        // =====================
        private string GenerateStudentJwtToken(StudentPortalAccount account)
        {
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var credentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim("studentId", account.StudentId.ToString()),
                new System.Security.Claims.Claim("email", account.Email),
                new System.Security.Claims.Claim("role", "Student")
            };

            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // =====================
    // REQUEST MODELS
    // =====================
    public class StudentPortalRegisterRequest
    {
        public int SchoolId { get; set; }
        public string StudentNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class StudentPortalLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}