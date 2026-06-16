namespace LeeTec.API.Models
{
    public class TeacherSubjectAssignment
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public int TeacherId { get; set; }
        public int SubjectId { get; set; }
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User? Teacher { get; set; }
        public Subject? Subject { get; set; }
    }
}
