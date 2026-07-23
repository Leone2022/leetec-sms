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
        public string StudentType { get; set; } = "Day";
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
        public string StudentType { get; set; } = "Day";
        public string Curriculum { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Campus { get; set; }

        // Medical & Academic (stored directly on Student)
        public string? PreviousSchool { get; set; }
        public string? MedicalAidSociety { get; set; }
        public string? MedicalAidNo { get; set; }
        public string? FamilyDoctorName { get; set; }
        public string? FamilyDoctorPhone { get; set; }
        public string? Allergies { get; set; }
        public string? Denomination { get; set; }
        public string? OtherInformation { get; set; }
    }

    public class UpdateFamilyDTO
    {
        public string? HomeAddress { get; set; }
        public string? HomeTelephone { get; set; }
        public string? Cell { get; set; }
        public string? HomeLanguage { get; set; }
        public string? Religion { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Email { get; set; }
    }

    public class GuardianFieldsDTO
    {
        public string? Title { get; set; }
        public string? Forenames { get; set; }
        public string? Surname { get; set; }
        public string? Nationality { get; set; }
        public string? Occupation { get; set; }
        public string? CompanyName { get; set; }
        public string? BusinessTelephone { get; set; }
        public string? Cell { get; set; }
        public string? Email { get; set; }
        public string? Relationship { get; set; } // maps to Guardian.GuardianType
    }

    public class UpdateGuardiansDTO
    {
        public GuardianFieldsDTO? Father { get; set; }
        public GuardianFieldsDTO? Mother { get; set; }
    }

    public class ActivateDTO
    {
        public string Token { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class AddStudentSubjectDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
    }

    public class RequestSubjectChangeDTO
    {
        public int SubjectId { get; set; }
        public string Action { get; set; } = string.Empty; // "Add" | "Drop"
        public string Reason { get; set; } = string.Empty;
    }
}