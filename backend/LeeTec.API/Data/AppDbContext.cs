using Microsoft.EntityFrameworkCore;
using LeeTec.API.Models;

namespace LeeTec.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<School> Schools { get; set; }
    }
}