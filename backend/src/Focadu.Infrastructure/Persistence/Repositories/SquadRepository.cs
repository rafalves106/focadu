using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class SquadRepository : ISquadRepository
{
    private readonly FocaduDbContext _context;

    public SquadRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Squad?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Squads.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public async Task<Squad?> GetByJoinCodeAsync(string joinCode, CancellationToken cancellationToken = default) =>
        await _context.Squads.FirstOrDefaultAsync(s => s.JoinCode == joinCode, cancellationToken);

    public async Task AddAsync(Squad squad, CancellationToken cancellationToken = default) =>
        await _context.Squads.AddAsync(squad, cancellationToken);

    public Task RemoveAsync(Squad squad, CancellationToken cancellationToken = default)
    {
        _context.Squads.Remove(squad);
        return Task.CompletedTask;
    }

    public async Task<SquadMembership?> GetMembershipByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.SquadMemberships.FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken);

    public async Task<IReadOnlyCollection<SquadMembership>> GetMembersAsync(Guid squadId, CancellationToken cancellationToken = default) =>
        await _context.SquadMemberships.Where(m => m.SquadId == squadId).ToListAsync(cancellationToken);

    public async Task AddMembershipAsync(SquadMembership membership, CancellationToken cancellationToken = default) =>
        await _context.SquadMemberships.AddAsync(membership, cancellationToken);

    public Task RemoveMembershipAsync(SquadMembership membership, CancellationToken cancellationToken = default)
    {
        _context.SquadMemberships.Remove(membership);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyCollection<SquadCheer>> GetCheersAsync(Guid squadId, IReadOnlyCollection<string> activityKeys, CancellationToken cancellationToken = default) =>
        activityKeys.Count == 0
            ? []
            : await _context.SquadCheers.Where(c => c.SquadId == squadId && activityKeys.Contains(c.ActivityKey)).ToListAsync(cancellationToken);

    public async Task<SquadCheer?> GetCheerAsync(Guid squadId, string activityKey, Guid fromUserId, CancellationToken cancellationToken = default) =>
        await _context.SquadCheers.FirstOrDefaultAsync(c => c.SquadId == squadId && c.ActivityKey == activityKey && c.FromUserId == fromUserId, cancellationToken);

    public async Task AddCheerAsync(SquadCheer cheer, CancellationToken cancellationToken = default) =>
        await _context.SquadCheers.AddAsync(cheer, cancellationToken);

    public Task RemoveCheerAsync(SquadCheer cheer, CancellationToken cancellationToken = default)
    {
        _context.SquadCheers.Remove(cheer);
        return Task.CompletedTask;
    }
}
