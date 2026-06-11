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
        public int CategoryId { get; set; }
        public decimal Amount { get; set; }

        public int ResolvedFeeCategoryId => FeeCategoryId > 0 ? FeeCategoryId : CategoryId;
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
    // BULK EMAIL
    // =====================
    public class SendBulkInvoiceRequest
    {
        public int SchoolId { get; set; }
        public int TermId { get; set; }
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
        public string BankReceiptNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    // =====================
    // DIRECT CHARGES
    // =====================
    public class IndividualChargeDTO
    {
        public int StudentId { get; set; }
        public int SchoolId { get; set; } = 1;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int? FeeCategoryId { get; set; }
    }

    // =====================
    // SINGLE INVOICE EMAIL
    // =====================
    public class SendSingleInvoiceRequest
    {
        public int StudentId { get; set; }
        public int? InvoiceId { get; set; }
        public string Email { get; set; } = string.Empty;
        public int SchoolId { get; set; } = 1;
    }

    // =====================
    // REFUNDS
    // =====================
    public class RefundRequest
    {
        public int InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public int PostedByUserId { get; set; }
        public string? Reason { get; set; }
        public DateTime? RefundDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ReceiptNumber { get; set; }
        public string? ReceiptReference { get; set; }
    }
}