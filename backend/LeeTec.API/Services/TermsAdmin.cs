using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;

namespace LeeTec.API.Services
{
    // Who may run term-level bulk operations (Copy Subjects, year-end promotion): an active
    // admin with the SuperAdmin role or the "Terms & Periods" permission, the same rule the
    // admin sidebar uses to show the Terms page, for their own school (SuperAdmin: any).
    // Teacher and student tokens are signed with the same key, so any token carrying a
    // role or student claim is rejected before NameIdentifier is trusted as a Users.Id.
    public static class TermsAdmin
    {
        public static ObjectResult Forbidden() =>
            new(new { ok = false, message = "You do not have permission to manage terms." }) { StatusCode = 403 };

        public static async Task<bool> IsAllowedAsync(AppDbContext context, ClaimsPrincipal principal, int schoolId)
        {
            if (principal.Claims.Any(c => c.Type == ClaimTypes.Role || c.Type == "role"
                    || c.Type == "studentId" || c.Type == "studentNumber"))
                return false;
            if (!int.TryParse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return false;

            var user = await context.Users
                .AsNoTracking()
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || user.Status != "Active") return false;

            if (user.UserRoles.Any(ur => ur.Role != null && ur.Role.Name == "SuperAdmin")) return true;

            List<string> permissions;
            try
            {
                permissions = string.IsNullOrWhiteSpace(user.Permissions)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(user.Permissions) ?? new List<string>());
            }
            catch (JsonException)
            {
                permissions = new List<string>();
            }

            return permissions.Contains("Terms & Periods") && user.SchoolId == schoolId;
        }
    }
}
