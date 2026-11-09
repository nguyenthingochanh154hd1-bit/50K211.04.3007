using AppSolution.Domain.Entities;
using AppSolution.Domain.Interfaces;
using AppSolution.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppSolution.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
        => await _dbSet.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task<bool> IsEmailExistsAsync(string email, CancellationToken cancellationToken = default)
        => await _dbSet.AnyAsync(u => u.Email == email, cancellationToken);
}
