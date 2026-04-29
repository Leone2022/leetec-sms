using System;

namespace LeeTec.API.Models
{
    public class Role
    {
        public int Id { get; set; }
        public int? SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsSystemRole { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public School? School { get; set; }
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}