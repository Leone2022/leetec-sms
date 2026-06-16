namespace LeeTec.API.Models
{
    public class Subject
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string CurriculumType { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
