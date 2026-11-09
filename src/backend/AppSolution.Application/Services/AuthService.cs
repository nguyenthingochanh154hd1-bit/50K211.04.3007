using AppSolution.Application.Common;
using AppSolution.Application.DTOs;
using AppSolution.Application.Interfaces;
using AppSolution.Domain.Entities;
using AppSolution.Domain.Interfaces;
using AutoMapper;
using Microsoft.Extensions.Logging;

namespace AppSolution.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IMapper _mapper;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUnitOfWork unitOfWork, IJwtService jwtService, IMapper mapper, ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<Result<AuthResponseDto>> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            if (await _unitOfWork.Users.IsEmailExistsAsync(dto.Email, cancellationToken))
                return Result<AuthResponseDto>.Failure("Email already registered.", 409);

            var user = _mapper.Map<User>(dto);
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _unitOfWork.Users.AddAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var response = GenerateAuthResponse(user);
            user.RefreshToken = response.RefreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("User {Email} registered successfully", dto.Email);
            return Result<AuthResponseDto>.Success(response, 201);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for {Email}", dto.Email);
            return Result<AuthResponseDto>.Failure("Registration failed.", 500);
        }
    }

    public async Task<Result<AuthResponseDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(dto.Email, cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Result<AuthResponseDto>.Failure("Invalid email or password.", 401);

        var response = GenerateAuthResponse(user);
        user.RefreshToken = response.RefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponseDto>.Success(response);
    }

    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var users = await _unitOfWork.Users.FindAsync(u => u.RefreshToken == refreshToken, cancellationToken);
        var user = users.FirstOrDefault();

        if (user is null || user.RefreshTokenExpiry < DateTime.UtcNow)
            return Result<AuthResponseDto>.Failure("Invalid or expired refresh token.", 401);

        var response = GenerateAuthResponse(user);
        user.RefreshToken = response.RefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthResponseDto>.Success(response);
    }

    public async Task<Result> LogoutAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user is null) return Result.Failure("User not found.", 404);

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private AuthResponseDto GenerateAuthResponse(User user)
    {
        var expiresAt = DateTime.UtcNow.AddHours(1);
        return new AuthResponseDto
        {
            AccessToken = _jwtService.GenerateAccessToken(user),
            RefreshToken = _jwtService.GenerateRefreshToken(),
            ExpiresAt = expiresAt,
            User = _mapper.Map<UserDto>(user)
        };
    }
}
