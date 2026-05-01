using System;

namespace LeeTec.API.Models
{
    public class EmergencyContact
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string HomeTelephone { get; set; } = string.Empty;
        public string BusinessTelephone { get; set; } = string.Empty;
        public string Cell { get; set; } = string.Empty;
        public string Relationship { get; set; } = string.Empty;
        public int ContactOrder { get; set; } = 1;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student Student { get; set; } = null!;
    }
}