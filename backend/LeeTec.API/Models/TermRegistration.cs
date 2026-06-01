using System;
namespace LeeTec.API.Models
{
    public enum PromotionStatus
    {
        Pending,
        Promoted,
        DroppedOut
    }

    public class TermRegistration
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int TermId { get; set; }
        public int SchoolId { get; set; }
        public string Form { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public int? FeePackageId { get; set; }
        public bool HasPaidFees { get; set; } = false;
        public string PaymentStatus { get; set; } = "Pending";
        public PromotionStatus PromotionStatus { get; set; } = PromotionStatus.Pending;
        public string Status { get; set; } = "Active";
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student? Student { get; set; }
        public Term? Term { get; set; }
        public School? School { get; set; }
        public FeePackage? FeePackage { get; set; }
    }
}
