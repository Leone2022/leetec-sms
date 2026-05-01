using System;

namespace LeeTec.API.Models
{
    public class Student
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int UserId { get; set; }
        public string StudentNumber { get; set; } = string.Empty;

        // A. PUPIL DETAILS
        public string Surname { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string BirthCertificateNo { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string DateOfEntry { get; set; } = string.Empty;
        public string Race { get; set; } = string.Empty;
        public string PreviousSchool { get; set; } = string.Empty;
        public string OtherInformation { get; set; } = string.Empty;

        // B. MEDICAL INFORMATION
        public string FamilyDoctorName { get; set; } = string.Empty;
        public string FamilyDoctorPhone { get; set; } = string.Empty;
        public string MedicalAidSociety { get; set; } = string.Empty;
        public string MedicalAidNo { get; set; } = string.Empty;
        public string Allergies { get; set; } = string.Empty;

        // J. DENOMINATION
        public string Denomination { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public School School { get; set; } = null!;
        public User User { get; set; } = null!;
        public Family? Family { get; set; }
        public ICollection<Guardian> Guardians { get; set; } = new List<Guardian>();
        public ICollection<EmergencyContact> EmergencyContacts { get; set; } = new List<EmergencyContact>();
        public InvoicingDetail? InvoicingDetail { get; set; }
    }
}