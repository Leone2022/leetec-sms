using System.Text.RegularExpressions;
using LeeTec.API.Models;

namespace LeeTec.API.Services
{
    // Student.Status values. Only "Active" students are current: every fee total, teacher
    // sheet, registration and invoice run already filters on Status == "Active", so a
    // transferred, graduated or withdrawn student drops out of those exactly like
    // "Inactive" did, while staying on record (with their invoices and marks) for reports.
    public static class StudentLifecycle
    {
        public const string Active = "Active";
        public const string Transferred = "Transferred"; // left for another school
        public const string Graduated = "Graduated";     // completed their final year
        public const string Withdrawn = "Withdrawn";     // left school for any other reason
        public const string Inactive = "Inactive";       // legacy "deactivated", kept for existing rows

        public static readonly string[] All = { Active, Transferred, Graduated, Withdrawn, Inactive };

        public static string? Normalize(string? status) =>
            All.FirstOrDefault(s => string.Equals(s, status?.Trim(), StringComparison.OrdinalIgnoreCase));

        // Year the student joined the school: from DateOfEntry (a free-text date), falling
        // back to the year in their student number (e.g. AHA/2026/0012).
        public static int? IntakeYear(Student s) =>
            ParseYear(s.DateOfEntry) ?? ParseYear(s.StudentNumber);

        public static int? ParseYear(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var m = Regex.Match(text, @"(?<!\d)(19|20)\d{2}(?!\d)");
            return m.Success ? int.Parse(m.Value) : null;
        }

        // Student numbers carry the intake year. A pupil enrolled in December for the
        // January intake (DateOfEntry next year) gets next year's number; back-dated entries
        // still get the current year so they never land in an older, finished sequence.
        public static int StudentNumberYear(string? dateOfEntry, DateTime now)
        {
            var entryYear = ParseYear(dateOfEntry);
            return entryYear == now.Year + 1 ? entryYear.Value : now.Year;
        }
    }
}
