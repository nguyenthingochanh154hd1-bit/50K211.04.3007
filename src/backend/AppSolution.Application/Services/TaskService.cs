using AppSolution.Application.Common;
using AppSolution.Application.DTOs;
using AppSolution.Application.Interfaces;
using AppSolution.Domain.Entities;
using AppSolution.Domain.Interfaces;
using AutoMapper;
using Microsoft.Extensions.Logging;

namespace AppSolution.Application.Services;

public class TaskService : ITaskService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<TaskService> _logger;

    public TaskService(IUnitOfWork unitOfWork, IMapper mapper, ILogger<TaskService> logger)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<Result<IEnumerable<TaskDto>>> GetAllTasksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var tasks = await _unitOfWork.Tasks.GetAllAsync(cancellationToken);
            var taskDtos = _mapper.Map<IEnumerable<TaskDto>>(tasks);
            return Result<IEnumerable<TaskDto>>.Success(taskDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all tasks");
            return Result<IEnumerable<TaskDto>>.Failure("An error occurred while retrieving tasks.", 500);
        }
    }

    public async Task<Result<TaskDto>> GetTaskByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var task = await _unitOfWork.Tasks.GetByIdAsync(id, cancellationToken);
            if (task is null)
                return Result<TaskDto>.Failure($"Task with ID {id} not found.", 404);

            return Result<TaskDto>.Success(_mapper.Map<TaskDto>(task));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving task {TaskId}", id);
            return Result<TaskDto>.Failure("An error occurred while retrieving the task.", 500);
        }
    }

    public async Task<Result<IEnumerable<TaskDto>>> GetTasksByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tasks = await _unitOfWork.Tasks.GetByUserIdAsync(userId, cancellationToken);
        return Result<IEnumerable<TaskDto>>.Success(_mapper.Map<IEnumerable<TaskDto>>(tasks));
    }

    public async Task<Result<TaskDto>> CreateTaskAsync(CreateTaskDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var task = _mapper.Map<TaskItem>(dto);
            await _unitOfWork.Tasks.AddAsync(task, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Task {TaskId} created successfully", task.Id);
            return Result<TaskDto>.Success(_mapper.Map<TaskDto>(task), 201);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return Result<TaskDto>.Failure("An error occurred while creating the task.", 500);
        }
    }

    public async Task<Result<TaskDto>> UpdateTaskAsync(Guid id, UpdateTaskDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var task = await _unitOfWork.Tasks.GetByIdAsync(id, cancellationToken);
            if (task is null)
                return Result<TaskDto>.Failure($"Task with ID {id} not found.", 404);

            _mapper.Map(dto, task);
            task.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Tasks.UpdateAsync(task, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<TaskDto>.Success(_mapper.Map<TaskDto>(task));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task {TaskId}", id);
            return Result<TaskDto>.Failure("An error occurred while updating the task.", 500);
        }
    }

    public async Task<Result> DeleteTaskAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var task = await _unitOfWork.Tasks.GetByIdAsync(id, cancellationToken);
            if (task is null)
                return Result.Failure($"Task with ID {id} not found.", 404);

            await _unitOfWork.Tasks.DeleteAsync(task, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Task {TaskId} deleted", id);
            return Result.Success(204);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting task {TaskId}", id);
            return Result.Failure("An error occurred while deleting the task.", 500);
        }
    }

    public async Task<Result<IEnumerable<TaskDto>>> GetOverdueTasksAsync(CancellationToken cancellationToken = default)
    {
        var tasks = await _unitOfWork.Tasks.GetOverdueTasksAsync(cancellationToken);
        return Result<IEnumerable<TaskDto>>.Success(_mapper.Map<IEnumerable<TaskDto>>(tasks));
    }
}
