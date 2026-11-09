using AppSolution.Application.Common;
using AppSolution.Application.DTOs;

namespace AppSolution.Application.Interfaces;

public interface ITaskService
{
    Task<Result<IEnumerable<TaskDto>>> GetAllTasksAsync(CancellationToken cancellationToken = default);
    Task<Result<TaskDto>> GetTaskByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<TaskDto>>> GetTasksByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<TaskDto>> CreateTaskAsync(CreateTaskDto dto, CancellationToken cancellationToken = default);
    Task<Result<TaskDto>> UpdateTaskAsync(Guid id, UpdateTaskDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteTaskAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<TaskDto>>> GetOverdueTasksAsync(CancellationToken cancellationToken = default);
}
