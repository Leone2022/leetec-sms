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
        public List<BulkSaveMarkEntry>? Marks { get; set; }
        public int? TeacherId { get; set; }
        public string? Campus { get; set; }
        public string? Form { get; set; }
    }

    // Combined midterm + end-of-term entry used by the unified marks entry table
    public class BulkSaveMarkEntry
    {
        public int StudentId { get; set; }
        public decimal? MidtermScore { get; set; }
        public decimal? EndOfTermScore { get; set; }
        public string? Comments { get; set; }
    }

    public class PublishReportCardsRequest
    {
        public int TermId { get; set; }
        public int SchoolId { get; set; } = 1;
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
        public string Curriculum { get; set; } = string.Empty;
        public string AssessmentType { get; set; } = string.Empty;
        public decimal? Paper1Score { get; set; }
        public decimal? Paper2Score { get; set; }
        public decimal? Score { get; set; }
        public string? Comments { get; set; }
        public string? Status { get; set; }
        public string? SendBackComment { get; set; }
        public DateTime? AmendmentRequestedAt { get; set; }
    }

    public class SubmitMarksDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string SubmittedBy { get; set; } = string.Empty;
    }

    public class ApproveMarksDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = string.Empty;
    }

    public class SendBackMarksDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string? Comment { get; set; }
    }

    public class RequestAmendmentDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string MeetingDate { get; set; } = string.Empty;
        public string MinuteReference { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
    }

    public class AmendmentGroupActionDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
    }

    public class RejectAmendmentDTO
    {
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}
