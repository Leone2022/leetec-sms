using System;

namespace LeeTec.API.Models
{
    public class Payment
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int InvoiceId { get; set; }
        public int StudentId { get; set; }
        public int PostedByUserId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "BankDeposit";
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime PaymentDate { get; set; }
        public DateTime PostedAt { get; set; } = DateTime.UtcNow;
        public string ReceiptReference { get; set; } = string.Empty;

        // Navigation
        public School School { get; set; } = null!;
        public Invoice Invoice { get; set; } = null!;
        public Student Student { get; set; } = null!;
    }
}