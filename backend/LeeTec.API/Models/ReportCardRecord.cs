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
    }
}
