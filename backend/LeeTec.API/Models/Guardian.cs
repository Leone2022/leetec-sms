using System;

namespace LeeTec.API.Models
{
    public class Guardian
    {
        public int Id { get; set; }
        public int StudentId { get; set; }

        // Type: Father, Mother, LegalGuardian
        public string GuardianType { get; set; } = string.Empty;

        public string Surname { get; set; } = string.Empty;
        public string Forenames { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Nationality { get; set; } = string.Empty;
        public string Occupation { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string BusinessAddress { get; set; } = string.Empty;
        public string BusinessTelephone { get; set; } = string.Empty;
        public string Cell { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student Student { get; set; } = null!;
    }
}