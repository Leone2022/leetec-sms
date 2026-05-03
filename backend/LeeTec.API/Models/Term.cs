using System;
using System.Collections.Generic;

namespace LeeTec.API.Models
{
    public class Term
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "Term 1 2026"
        public int TermNumber { get; set; } // 1, 2, or 3
        public int Year { get; set; } // 2026
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public School School { get; set; } = null!;
        public ICollection<FeePackage> FeePackages { get; set; } = new List<FeePackage>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}