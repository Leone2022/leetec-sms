using System;

namespace LeeTec.API.Models
{
    public class StudentSubject
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int SubjectId { get; set; }
        public int TermId { get; set; }
        public int SchoolId { get; set; }
        public bool IsActive { get; set; } = true;
        public string Status { get; set; } = "Confirmed"; // Confirmed, Pending, Dropped
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student? Student { get; set; }
        public Subject? Subject { get; set; }
        public Term? Term { get; set; }
    }
}
