using LeeTec.API.Models;

namespace LeeTec.API.Services
{
    // From Term 3 2026 the school records only a final (end-of-term) mark per subject:
    // no mid-term test. Final Mark = the "End of Term Exam" mark; mid-term marks are
    // neither entered nor counted. Earlier terms keep the old rule (average of both)
    // so re-generating a Term 1/2 report card can't change its numbers.
    // Keep in sync with frontend/src/utils/markPolicy.ts.
    public static class MarkPolicy
    {
        public const string MidTerm = "Mid-term Test";
        public const string EndOfTerm = "End of Term Exam";

        public static bool IsFinalMarkOnly(int year, int termNumber) =>
            year > 2026 || (year == 2026 && termNumber >= 3);

        public static bool IsFinalMarkOnly(Term term) => IsFinalMarkOnly(term.Year, term.TermNumber);
    }
}
