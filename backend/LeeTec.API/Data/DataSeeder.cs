namespace LeeTec.API.Data
{
    public static class DataSeeder
    {
        public static void SeedData(AppDbContext context)
        {
            // Seed School
            if (!context.Schools.Any())
            {
                context.Schools.Add(new LeeTec.API.Models.School
                {
                    Name = "Waterfalls Adventist High School",
                    Address = "Waterfalls, Harare",
                    Phone = "+263 77 000 0000",
                    Email = "info@waterfallsadventist.ac.zw",
                    IsActive = true
                });
                context.SaveChanges();
            }

            // Seed Roles
            if (!context.Roles.Any())
            {
                var roles = new List<LeeTec.API.Models.Role>
                {
                    new() { Name = "SuperAdmin", Description = "LeeTec IT - Full platform access", IsSystemRole = true },
                    new() { Name = "Headmaster", Description = "School head - Full school access", IsSystemRole = true },
                    new() { Name = "DeputyPrincipal", Description = "Discipline and pastoral care", IsSystemRole = true },
                    new() { Name = "BusinessManager", Description = "Finance and assets", IsSystemRole = true },
                    new() { Name = "Chaplain", Description = "Spiritual and pastoral care", IsSystemRole = true },
                    new() { Name = "SeniorMaster", Description = "Oversees male students and teachers", IsSystemRole = true },
                    new() { Name = "SeniorMistress", Description = "Oversees female students and teachers", IsSystemRole = true },
                    new() { Name = "HOD", Description = "Head of Department", IsSystemRole = true },
                    new() { Name = "AdminSecretary", Description = "Admissions and ID cards", IsSystemRole = true },
                    new() { Name = "AccountsSecretary", Description = "Fees and payments", IsSystemRole = true },
                    new() { Name = "ClassTeacher", Description = "Form teacher for one class", IsSystemRole = true },
                    new() { Name = "SubjectTeacher", Description = "Marks entry and timetable", IsSystemRole = true },
                    new() { Name = "Student", Description = "Student self-service", IsSystemRole = true },
                };
                context.Roles.AddRange(roles);
                context.SaveChanges();
            }
        }
    }
}