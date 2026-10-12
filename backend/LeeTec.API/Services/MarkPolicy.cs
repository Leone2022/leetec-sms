using LeeTec.API.Models;

namespace LeeTec.API.Services
{
    public enum MarkMode
    {
        // Before Term 3 2026: mid-term and end-of-term entered; Final Mark = their average.
        Averaged,
        // Term 3 2026 onward, AHA and AHS: one final (end-of-term) mark per subject, no mid-term.
        FinalOnly,
        // Term 3 2026 onward, AHJ (Cambridge Checkpoint): mid-term and end-of-term are separate
        // assessments with separate reports. The Mid-Term Report shows the mid-term mark as the
        // final mark; the End of Term Report shows the end-of-term mark. Never added or averaged.
        Separate,
    }

    // Keep in sync with frontend/src/utils/markPolicy.ts.
    public static class MarkPolicy
    {
        public const string MidTerm = "Mid-term Test";
        public const string EndOfTerm = "End of Term Exam";

        // ReportCardRecords.Status values: "Published" is the end-of-term report (as before);
        // the AHJ mid-term report is a separate row with this status.
        public const string MidTermPublished = "MidTermPublished";

        public static bool IsFrom2026Term3(int year, int termNumber) =>
            year > 2026 || (year == 2026 && termNumber >= 3);

        public static MarkMode ModeFor(int year, int termNumber, string? campus) =>
            !IsFrom2026Term3(year, termNumber) ? MarkMode.Averaged
                : string.Equals(campus, "AHJ", StringComparison.OrdinalIgnoreCase) ? MarkMode.Separate
                : MarkMode.FinalOnly;

        public static MarkMode ModeFor(Term term, string? campus) => ModeFor(term.Year, term.TermNumber, campus);

        public static bool IsFinalMarkOnly(Term term, string? campus) => ModeFor(term, campus) == MarkMode.FinalOnly;
    }
}
