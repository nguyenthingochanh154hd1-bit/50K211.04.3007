using AppSolution.Domain.Common;

namespace AppSolution.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
    public string FullName => $"{FirstName} {LastName}";
}
