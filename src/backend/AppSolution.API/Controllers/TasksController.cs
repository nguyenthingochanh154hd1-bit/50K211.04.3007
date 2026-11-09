using AppSolution.Application.DTOs;
using AppSolution.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSolution.API.Controllers;

[Authorize]
public class TasksController : BaseController
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    /// <summary>Get all tasks</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _taskService.GetAllTasksAsync(cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Get task by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _taskService.GetTaskByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Get tasks by user</summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId, CancellationToken cancellationToken)
    {
        var result = await _taskService.GetTasksByUserAsync(userId, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Get overdue tasks</summary>
    [HttpGet("overdue")]
    public async Task<IActionResult> GetOverdue(CancellationToken cancellationToken)
    {
        var result = await _taskService.GetOverdueTasksAsync(cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Create a new task</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto, CancellationToken cancellationToken)
    {
        var result = await _taskService.CreateTaskAsync(dto, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Update a task</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken cancellationToken)
    {
        var result = await _taskService.UpdateTaskAsync(id, dto, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Delete a task</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _taskService.DeleteTaskAsync(id, cancellationToken);
        return HandleResult(result);
    }
}
