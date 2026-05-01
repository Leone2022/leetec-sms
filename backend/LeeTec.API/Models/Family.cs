using System;

namespace LeeTec.API.Models
{
    public class Family
    {
        public int Id { get; set; }
        public int StudentId { get; set; }

        // C. FAMILY DETAILS
        public string MaritalStatus { get; set; } = string.Empty;
        public string HomeLanguage { get; set; } = string.Empty;
        public string Religion { get; set; } = string.Empty;

        // D. HOME DETAILS
        public string HomeAddress { get; set; } = string.Empty;
        public string HomeTelephone { get; set; } = string.Empty;
        public string Cell { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student Student { get; set; } = null!;
    }
}