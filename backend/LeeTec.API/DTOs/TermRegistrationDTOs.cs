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

    // No SchoolId: the school comes from the target term, never from the request body.
    public class CopySubjectsDTO
    {
        public int TargetTermId { get; set; }
        public int? SourceTermId { get; set; }   // null = the term that started just before the target
        public bool DryRun { get; set; } = true; // safe by default: must explicitly send false to write
        public int? ExpectedInserts { get; set; } // the preview's ToInsert; the write refuses if it changed
    }
}
