using System;

namespace LeeTec.API.Models
{
    public class Announcement
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string TargetCampus { get; set; } = "All"; // "All" | "AHJ" | "AHA" | "AHS"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }
}
