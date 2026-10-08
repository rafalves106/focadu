using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

/// <summary>
/// Reset de usuarios (ver <see cref="IUserResetService"/>). Tudo por <c>ExecuteDelete</c> numa transacao so. A ordem importa:
/// Referrals tem FK Restrict para Users (saem primeiro); Enrollments levam junto semanas, dailies, respostas, projetos e
/// publicacoes (cascata); depois os usuarios, que levam inventario, equipados, squads, pedidos e conta do Forgejo. Notas,
/// feedback e tokens de senha nao tem FK para Users, entao saem de forma explicita.
/// </summary>
public class UserResetService : IUserResetService
{
    private readonly FocaduDbContext _context;

    public UserResetService(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<UserResetPlan> PlanAsync(string keepEmail, CancellationToken cancellationToken = default)
    {
        var (keepId, steps) = await BuildAsync(keepEmail, cancellationToken);
        var counts = new List<KeyValuePair<string, int>>();
        foreach (var (name, query, _) in steps)
            counts.Add(new(name, await query.CountAsync(cancellationToken)));
        return await ToPlanAsync(keepEmail, keepId, counts, cancellationToken);
    }

    public async Task<UserResetPlan> ExecuteAsync(string keepEmail, CancellationToken cancellationToken = default)
    {
        var (keepId, steps) = await BuildAsync(keepEmail, cancellationToken);
        var forgejoBefore = await ForgejoUsernamesAsync(keepId, cancellationToken);
        var counts = new List<KeyValuePair<string, int>>();

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        foreach (var (name, _, delete) in steps)
            counts.Add(new(name, await delete(cancellationToken)));
        await transaction.CommitAsync(cancellationToken);

        return new UserResetPlan(keepEmail, keepId, counts.First(c => c.Key == "Users").Value, counts, forgejoBefore);
    }

    private async Task<(Guid KeepId, List<(string Name, IQueryable<object> Query, Func<CancellationToken, Task<int>> Delete)> Steps)> BuildAsync(
        string keepEmail, CancellationToken cancellationToken)
    {
        var keepId = await _context.Users.Where(u => u.Email == keepEmail).Select(u => (Guid?)u.Id).FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", $"Nao existe usuario com o e-mail '{keepEmail}': nada sera apagado.");

        var steps = new List<(string, IQueryable<object>, Func<CancellationToken, Task<int>>)>();
        void Add<T>(string name, IQueryable<T> query) where T : class =>
            steps.Add((name, query.Cast<object>(), ct => query.ExecuteDeleteAsync(ct)));

        Add("Referrals", _context.Referrals);
        Add("Notes", _context.Notes);
        Add("NotesReviews", _context.NotesReviews);
        Add("DayFeedbacks", _context.DayFeedbacks);
        Add("PersonalizedAnalogies", _context.PersonalizedAnalogies);
        Add("PasswordResetTokens", _context.PasswordResetTokens.Where(t => t.UserId != keepId));
        Add("EmailVerificationCodes", _context.EmailVerificationCodes.Where(c => c.UserId != keepId));
        Add("Enrollments", _context.Enrollments);
        Add("UserStreaks", _context.UserStreaks);
        Add("UserGemBalances", _context.UserGemBalances);
        Add("Users", _context.Users.Where(u => u.Id != keepId));
        return (keepId, steps);
    }

    private async Task<UserResetPlan> ToPlanAsync(string keepEmail, Guid keepId, List<KeyValuePair<string, int>> counts, CancellationToken cancellationToken) =>
        new(keepEmail, keepId, counts.First(c => c.Key == "Users").Value, counts, await ForgejoUsernamesAsync(keepId, cancellationToken));

    private async Task<List<string>> ForgejoUsernamesAsync(Guid keepId, CancellationToken cancellationToken) =>
        await _context.UserForgejoAccounts.Where(a => a.UserId != keepId).Select(a => a.ForgejoUsername).OrderBy(n => n).ToListAsync(cancellationToken);
}
