using System;

namespace LeeTec.API.Models
{
    public class StudentPortalAccount
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending, Active, Suspended
        public bool EmailVerified { get; set; } = false;
        public string? EmailVerificationToken { get; set; }
        public DateTime? EmailVerificationExpiry { get; set; }
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetExpiry { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedAt { get; set; }
        public int? ApprovedByUserId { get; set; }

        // Navigation
        public Student Student { get; set; } = null!;
    }
}