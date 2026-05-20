using Microsoft.EntityFrameworkCore;
using LeeTec.API.Models;

namespace LeeTec.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Core
        public DbSet<School> Schools { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }

        // Students
        public DbSet<Student> Students { get; set; }
        public DbSet<Family> Families { get; set; }
        public DbSet<Guardian> Guardians { get; set; }
        public DbSet<EmergencyContact> EmergencyContacts { get; set; }
        public DbSet<InvoicingDetail> InvoicingDetails { get; set; }

        // Fees & Billing
        public DbSet<Term> Terms { get; set; }
        public DbSet<FeeCategory> FeeCategories { get; set; }
        public DbSet<FeePackage> FeePackages { get; set; }
        public DbSet<FeePackageItem> FeePackageItems { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
        public DbSet<Payment> Payments { get; set; }

        // Student Portal
        public DbSet<StudentPortalAccount> StudentPortalAccounts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Composite keys for many-to-many
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            // UserRole relationships
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            // RolePermission relationships
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId);

            // Student → User (optional)
            modelBuilder.Entity<Student>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Student Portal Account
            modelBuilder.Entity<StudentPortalAccount>()
                .HasOne(spa => spa.Student)
                .WithMany(s => s.StudentPortalAccounts)
                .HasForeignKey(spa => spa.StudentId);

            // Fee & Billing decimal precision
            modelBuilder.Entity<FeePackageItem>()
                .Property(f => f.Amount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Invoice>()
                .Property(i => i.TotalAmount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Invoice>()
                .Property(i => i.AmountPaid)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Invoice>()
                .Property(i => i.Balance)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<InvoiceItem>()
                .Property(i => i.Amount)
                .HasColumnType("decimal(18,2)");
        }
    }
}