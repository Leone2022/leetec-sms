namespace LeeTec.API.Models
{
    public class ActivationToken
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Student Student { get; set; } = null!;
    }
}
