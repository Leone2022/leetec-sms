namespace LeeTec.API.DTOs
{
    public class CreateOrUpdateMarkDTO
    {
        public int StudentId { get; set; }
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string AssessmentType { get; set; } = string.Empty;
        public decimal? Paper1Score { get; set; }
        public decimal? Paper2Score { get; set; }
        public decimal? Score { get; set; }
        public string? Comments { get; set; }
    }

    public class StudentMarkEntry
    {
        public int StudentId { get; set; }
        public decimal? Paper1Score { get; set; }
        public decimal? Paper2Score { get; set; }
        public decimal? Score { get; set; }
        public string? Comments { get; set; }
    }

    public class BulkSaveMarksDTO
    {
        public int SchoolId { get; set; } = 1;
        public int TermId { get; set; }
        public int SubjectId { get; set; }
        public string AssessmentType { get; set; } = string.Empty;
        public List<StudentMarkEntry> Entries { get; set; } = new();
        public int? TeacherId { get; set; }
        public string? Campus { get; set; }
        public string? Form { get; set; }
    }

    public class MarkResponseDTO
    {
        public int? MarkId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string AssessmentType { get; set; } = string.Empty;
        public decimal? Paper1Score { get; set; }
        public decimal? Paper2Score { get; set; }
        public decimal? Score { get; set; }
        public string? Comments { get; set; }
    }
}
