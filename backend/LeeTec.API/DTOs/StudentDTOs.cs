namespace LeeTec.API.DTOs
{
    public class EnrolStudentDTO
    {
        public int SchoolId { get; set; }
        public string Surname { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string BirthCertificateNo { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string Curriculum { get; set; } = string.Empty;
        public string DateOfEntry { get; set; } = string.Empty;
        public string Race { get; set; } = string.Empty;
        public string PreviousSchool { get; set; } = string.Empty;
        public string OtherInformation { get; set; } = string.Empty;
        public string FamilyDoctorName { get; set; } = string.Empty;
        public string FamilyDoctorPhone { get; set; } = string.Empty;
        public string MedicalAidSociety { get; set; } = string.Empty;
        public string MedicalAidNo { get; set; } = string.Empty;
        public string Allergies { get; set; } = string.Empty;
        public string Denomination { get; set; } = string.Empty;
        public string Campus { get; set; } = "AHA";
        public string? Email { get; set; }
    }

    public class UpdateStudentDTO
    {
        public string FirstName { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Race { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string Curriculum { get; set; } = string.Empty;
        public string? Email { get; set; }
    }

    public class ActivateDTO
    {
        public string Token { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}