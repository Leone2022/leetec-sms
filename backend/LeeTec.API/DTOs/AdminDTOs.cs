using System.ComponentModel.DataAnnotations;

namespace LeeTec.API.DTOs
{
    public class CreateTeacherDTO
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string Surname { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public int SchoolId { get; set; } = 1;
    }
}
