using System;

namespace LeeTec.API.Models
{
    public class Mark
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int StudentId { get; set; }
        public int SubjectId { get; set; }
        public int TermId { get; set; }

        // "Mid-term Test" | "End of Term Exam"
        public string AssessmentType { get; set; } = string.Empty;

        // AHJ Cambridge Checkpoint subjects (out of 50 each)
        public decimal? Paper1Score { get; set; }
        public decimal? Paper2Score { get; set; }

        // Single percentage score for ZIMSEC/IGCSE/A-Level subjects
        public decimal? Score { get; set; }

        public string? Comments { get; set; }

        // Draft | Submitted | Approved
        public string Status { get; set; } = "Draft";
        public string? SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? SendBackComment { get; set; }

        public bool AmendmentRequested { get; set; } = false;
        public string? AmendmentReason { get; set; }
        public string? MeetingDate { get; set; }
        public string? MinuteReference { get; set; }
        public string? AmendmentRequestedBy { get; set; }
        public DateTime? AmendmentRequestedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student? Student { get; set; }
        public Subject? Subject { get; set; }
        public Term? Term { get; set; }
    }
}
