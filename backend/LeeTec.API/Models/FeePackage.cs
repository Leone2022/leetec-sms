using System.Collections.Generic;

namespace LeeTec.API.Models
{
    public class FeePackage
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int TermId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "Day Scholar Term 1 2026"
        public string StudentType { get; set; } = string.Empty; // "Day" or "Boarding"
        public bool IsActive { get; set; } = true;

        // Navigation
        public School School { get; set; } = null!;
        public Term Term { get; set; } = null!;
        public ICollection<FeePackageItem> Items { get; set; } = new List<FeePackageItem>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}