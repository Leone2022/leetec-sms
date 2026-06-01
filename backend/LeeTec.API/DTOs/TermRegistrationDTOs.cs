namespace LeeTec.API.DTOs
{
    public class RegisterStudentsDTO
    {
        public int TermId { get; set; }
        public int SchoolId { get; set; }
        public List<int> StudentIds { get; set; } = new();
        public int? FeePackageId { get; set; }
    }

    public class PromoteStudentsDTO
    {
        public int FromTermId { get; set; }
        public int ToTermId { get; set; }
        public int SchoolId { get; set; }
        public string? NextClassSection { get; set; }
    }

    public class PromoteSingleStudentDTO
    {
        public int CurrentRegistrationId { get; set; }
        public int TargetTermId { get; set; }
        public string NextClassSection { get; set; } = string.Empty;
    }
}
