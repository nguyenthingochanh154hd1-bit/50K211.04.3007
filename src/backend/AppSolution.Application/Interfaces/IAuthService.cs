using AppSolution.Application.Common;
using AppSolution.Application.DTOs;

namespace AppSolution.Application.Interfaces;

public interface IAuthService
{
    Task<Result<AuthResponseDto>> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<Result<AuthResponseDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<Result> LogoutAsync(Guid userId, CancellationToken cancellationToken = default);
}
