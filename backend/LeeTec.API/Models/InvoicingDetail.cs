using System;

namespace LeeTec.API.Models
{
    public class InvoicingDetail
    {
        public int Id { get; set; }
        public int StudentId { get; set; }

        // G. INVOICING DETAILS
        public string Surname { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string PostalAddress { get; set; } = string.Empty;
        public string PersonalEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student Student { get; set; } = null!;
    }
}