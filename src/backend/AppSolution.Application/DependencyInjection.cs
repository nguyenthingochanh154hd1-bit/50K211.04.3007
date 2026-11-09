using AppSolution.Application.Interfaces;
using AppSolution.Application.Mapping;
using AppSolution.Application.Services;
using AppSolution.Application.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AppSolution.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(typeof(TaskMappingProfile).Assembly);
        services.AddValidatorsFromAssemblyContaining<CreateTaskValidator>();

        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
