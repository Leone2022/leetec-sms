namespace LeeTec.API.DTOs
{
    // =====================
    // TERMS
    // =====================
    public class CreateTermRequest
    {
        public int SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TermNumber { get; set; }
        public int Year { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    // =====================
    // FEE CATEGORIES
    // =====================
    public class CreateFeeCategoryRequest
    {
        public int SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    // =====================
    // FEE PACKAGES
    // =====================
    public class CreateFeePackageRequest
    {
        public int SchoolId { get; set; }
        public int TermId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string StudentType { get; set; } = string.Empty;
        public List<FeePackageItemRequest> Items { get; set; } = new();
    }

    public class FeePackageItemRequest
    {
        public int FeeCategoryId { get; set; }
        public decimal Amount { get; set; }
    }

    // =====================
    // INVOICES
    // =====================
    public class GenerateInvoicesRequest
    {
        public int SchoolId { get; set; }
        public int TermId { get; set; }
        public DateTime DueDate { get; set; }
    }

    // =====================
    // PAYMENTS
    // =====================
    public class PostPaymentRequest
    {
        public int SchoolId { get; set; }
        public int InvoiceId { get; set; }
        public int StudentId { get; set; }
        public int PostedByUserId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "BankDeposit";
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime PaymentDate { get; set; }
    }
}