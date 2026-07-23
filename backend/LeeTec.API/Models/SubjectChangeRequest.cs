using System;

namespace LeeTec.API.Models
{
    public class SubjectChangeRequest
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int SubjectId { get; set; }
        public string Action { get; set; } = "Add"; // Add | Drop
        public string Reason { get; set; } = "";
        public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected
        public string? RejectionReason { get; set; }
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public Student? Student { get; set; }
        public Subject? Subject { get; set; }
    }
}
