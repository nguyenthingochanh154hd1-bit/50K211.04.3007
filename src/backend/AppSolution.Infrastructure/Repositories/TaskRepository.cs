using AppSolution.Domain.Entities;
using AppSolution.Domain.Interfaces;
using AppSolution.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppSolution.Infrastructure.Repositories;

public class TaskRepository : Repository<TaskItem>, ITaskRepository
{
    public TaskRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<TaskItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbSet
            .Include(t => t.AssignedUser)
            .Where(t => t.AssignedUserId == userId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<TaskItem>> GetByStatusAsync(TaskItemStatus status, CancellationToken cancellationToken = default)
        => await _dbSet
            .Include(t => t.AssignedUser)
            .Where(t => t.Status == status)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<TaskItem>> GetOverdueTasksAsync(CancellationToken cancellationToken = default)
        => await _dbSet
            .Include(t => t.AssignedUser)
            .Where(t => t.DueDate < DateTime.UtcNow && t.Status != TaskItemStatus.Done && t.Status != TaskItemStatus.Cancelled)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
}
