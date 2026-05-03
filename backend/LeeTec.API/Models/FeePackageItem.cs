namespace LeeTec.API.Models
{
    public class FeePackageItem
    {
        public int Id { get; set; }
        public int FeePackageId { get; set; }
        public int FeeCategoryId { get; set; }
        public decimal Amount { get; set; }

        // Navigation
        public FeePackage FeePackage { get; set; } = null!;
        public FeeCategory FeeCategory { get; set; } = null!;
    }
}