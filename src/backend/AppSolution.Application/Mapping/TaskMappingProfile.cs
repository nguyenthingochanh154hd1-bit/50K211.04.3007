using AppSolution.Application.DTOs;
using AppSolution.Domain.Entities;
using AutoMapper;

namespace AppSolution.Application.Mapping;

public class TaskMappingProfile : Profile
{
    public TaskMappingProfile()
    {
        CreateMap<TaskItem, TaskDto>()
            .ForMember(dest => dest.AssignedUserName,
                opt => opt.MapFrom(src => src.AssignedUser != null ? src.AssignedUser.FullName : null));

        CreateMap<CreateTaskDto, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => TaskItemStatus.Todo));

        CreateMap<UpdateTaskDto, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
    }
}
