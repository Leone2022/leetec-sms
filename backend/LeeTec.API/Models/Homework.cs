using System;

namespace LeeTec.API.Models
{
    public class Homework
    {
        public int Id { get; set; }
        public int SubjectId { get; set; }
        public int TeacherId { get; set; }
        public int SchoolId { get; set; } = 1;
        public int TermId { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Subject? Subject { get; set; }
        public User? Teacher { get; set; }
    }
}
