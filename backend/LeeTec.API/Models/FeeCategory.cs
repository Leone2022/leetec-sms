using System.Collections.Generic;

namespace LeeTec.API.Models
{
    public class FeeCategory
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "Tuition Fee"
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation
        public School School { get; set; } = null!;
        public ICollection<FeePackageItem> FeePackageItems { get; set; } = new List<FeePackageItem>();
    }
}