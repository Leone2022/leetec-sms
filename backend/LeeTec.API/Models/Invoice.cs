using System;
using System.Collections.Generic;

namespace LeeTec.API.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int StudentId { get; set; }
        public int TermId { get; set; }
        public int? FeePackageId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV/WAH/2026/T1/0001"
        public decimal TotalAmount { get; set; }
        public decimal AmountPaid { get; set; } = 0;
        public decimal Balance { get; set; } = 0;
        public string Status { get; set; } = "Unpaid"; // Unpaid, PartiallyPaid, Paid
        public DateTime IssuedDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public School School { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public Term Term { get; set; } = null!;
        public FeePackage? FeePackage { get; set; }
        public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}