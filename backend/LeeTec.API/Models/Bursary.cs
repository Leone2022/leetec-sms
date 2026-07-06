using System;

namespace LeeTec.API.Models
{
    public class Bursary
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int SchoolId { get; set; }
        public int TermId { get; set; }
        public string Type { get; set; } = "Discount"; // Discount, Scholarship, Bursary
        public string Description { get; set; } = "";
        public decimal Amount { get; set; } // fixed amount
        public decimal? Percentage { get; set; } // or percentage of total fees
        public DateTime AwardedAt { get; set; } = DateTime.UtcNow;
        public string AwardedBy { get; set; } = "";
        public int? InvoiceItemId { get; set; } // credit line item created on the invoice, for reversal on delete

        // Navigation
        public Student? Student { get; set; }
    }
}
