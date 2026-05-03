namespace LeeTec.API.Models
{
    public class InvoiceItem
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public int FeeCategoryId { get; set; }
        public string Description { get; set; } = string.Empty; // e.g. "Tuition Fee"
        public decimal Amount { get; set; }

        // Navigation
        public Invoice Invoice { get; set; } = null!;
        public FeeCategory FeeCategory { get; set; } = null!;
    }
}