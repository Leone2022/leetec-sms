using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;

namespace LeeTec.API.Services
{
    // Checks an admin JWT against the database, using the same rule as the admin sidebar:
    // an active user with the SuperAdmin role, or with the named page permission for their
    // own school. Teacher and student tokens are signed with the same key, so any token
    // carrying a role or student claim is rejected before NameIdentifier is trusted.
    public static class AdminAccess
    {
        public static async Task<bool> HasPermissionAsync(AppDbContext context, ClaimsPrincipal principal, int schoolId, string permission)
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

            try
            {
                var permissions = string.IsNullOrWhiteSpace(user.Permissions)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(user.Permissions) ?? new List<string>());
                return permissions.Contains(permission) && user.SchoolId == schoolId;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        // Teacher-portal token: role "Teacher" and the teacher's Users.Id in NameIdentifier.
        public static int? TeacherId(ClaimsPrincipal principal)
        {
            var isTeacher = principal.Claims.Any(c => (c.Type == ClaimTypes.Role || c.Type == "role") && c.Value == "Teacher");
            return isTeacher && int.TryParse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;
        }
    }
}
