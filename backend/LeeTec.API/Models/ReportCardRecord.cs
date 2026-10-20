using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace LeeTec.API.Models
{
    public class ReportCardRecord
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int StudentId { get; set; }
        public int TermId { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Published"; // Published | Draft

        [Column(TypeName = "longtext")]
        public string ReportData { get; set; } = string.Empty; // JSON

        // Set by the student portal: when the learner (or parent) first/last opened this
        // report, how many times, and when they first downloaded the PDF.
        public DateTime? FirstViewedAt { get; set; }
        public DateTime? LastViewedAt { get; set; }
        public int ViewCount { get; set; }
        public DateTime? DownloadedAt { get; set; }
    }
}
