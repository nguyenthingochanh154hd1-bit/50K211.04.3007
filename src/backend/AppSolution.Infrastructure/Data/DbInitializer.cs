using AppSolution.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AppSolution.Infrastructure.Data;

public class DbInitializer
{
    private readonly AppDbContext _context;
    private readonly ILogger<DbInitializer> _logger;

    public DbInitializer(AppDbContext context, ILogger<DbInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Auto create database schema if not exists
            await _context.Database.EnsureCreatedAsync(cancellationToken);

            // Seed initial data
            await SeedDataAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initializing the database.");
            throw;
        }
    }

    private async Task SeedDataAsync(CancellationToken cancellationToken)
    {
        if (await _context.Users.AnyAsync(cancellationToken))
        {
            return; // DB already seeded
        }

        _logger.LogInformation("Seeding initial database data...");

        // 1. Create Default Admin User
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            FirstName = "Admin",
            LastName = "System",
            Email = "admin@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            CreatedAt = DateTime.UtcNow
        };

        // 2. Create Normal Demo User
        var demoUser = new User
        {
            Id = Guid.NewGuid(),
            FirstName = "John",
            LastName = "Doe",
            Email = "john.doe@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
            CreatedAt = DateTime.UtcNow
        };

        await _context.Users.AddRangeAsync(new[] { adminUser, demoUser }, cancellationToken);

        // 3. Create Sample Tasks
        var tasks = new List<TaskItem>
        {
            new()
            {
                Title = "Thiết kế kiến trúc N-Layer cho Backend ASP.NET Core",
                Description = "Tách biệt rõ ràng 4 tầng: Domain, Application, Infrastructure và Presentation (API).",
                Status = TaskItemStatus.Done,
                Priority = TaskPriority.Critical,
                AssignedUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                DueDate = DateTime.UtcNow.AddDays(5)
            },
            new()
            {
                Title = "Xây dựng Frontend ReactJS với Vite, TypeScript & Tailwind CSS",
                Description = "Triển khai State management với Zustand, API caching với TanStack Query và Axios interceptors.",
                Status = TaskItemStatus.InProgress,
                Priority = TaskPriority.High,
                AssignedUserId = adminUser.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                DueDate = DateTime.UtcNow.AddDays(3)
            },
            new()
            {
                Title = "Cấu hình Docker Compose và CI/CD Pipeline",
                Description = "Đóng gói ứng dụng N-Tier chạy trên Docker gồm SQL Server, ASP.NET API và React Web Client.",
                Status = TaskItemStatus.Todo,
                Priority = TaskPriority.Medium,
                AssignedUserId = demoUser.Id,
                CreatedAt = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(7)
            }
        };

        await _context.Tasks.AddRangeAsync(tasks, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Database seeded successfully with default admin and demo tasks.");
    }
}

