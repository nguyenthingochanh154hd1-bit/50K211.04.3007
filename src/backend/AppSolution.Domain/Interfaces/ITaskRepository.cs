using AppSolution.Domain.Entities;

namespace AppSolution.Domain.Interfaces;

public interface ITaskRepository : IRepository<TaskItem>
{
    Task<IEnumerable<TaskItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskItem>> GetByStatusAsync(TaskItemStatus status, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskItem>> GetOverdueTasksAsync(CancellationToken cancellationToken = default);
}
