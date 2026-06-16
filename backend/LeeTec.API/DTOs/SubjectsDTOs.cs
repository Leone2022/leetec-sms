namespace LeeTec.API.DTOs
{
    public class SeedSubjectsDTO
    {
        public int SchoolId { get; set; } = 1;
        public string Campus { get; set; } = string.Empty;
        public string CurriculumType { get; set; } = "All";
    }

    public class CreateSubjectDTO
    {
        public int SchoolId { get; set; } = 1;
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string CurriculumType { get; set; } = string.Empty;
    }

    public class UpdateSubjectDTO
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string CurriculumType { get; set; } = string.Empty;
    }
}
