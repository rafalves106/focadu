namespace Focadu.Application.Ports;

/// <summary>
/// Port do reset de usuarios (plano de curadoria, 02/10/2026): antes de refazer os cursos, todos os usuarios saem menos o
/// do dono, e o progresso dele e zerado. Operacao DESTRUTIVA - so roda pelo CLI `resetar-usuarios`, com dry-run por
/// padrao, backup afirmado e confirmacao explicita (ver <see cref="Users.ResetUsersUseCase"/>).
/// </summary>
public interface IUserResetService
{
    /// <summary>Conta o que seria apagado, sem apagar nada. Falha se o e-mail a manter nao existir.</summary>
    Task<UserResetPlan> PlanAsync(string keepEmail, CancellationToken cancellationToken = default);

    /// <summary>Apaga tudo numa transacao so e devolve o que removeu.</summary>
    Task<UserResetPlan> ExecuteAsync(string keepEmail, CancellationToken cancellationToken = default);
}

/// <param name="Counts">Linhas por tabela (o que sera ou foi removido), na ordem em que sao removidas.</param>
/// <param name="ForgejoUsernames">Contas do Forgejo interno dos usuarios removidos: o banco nao as apaga, a limpeza la e manual.</param>
public record UserResetPlan(
    string KeptEmail, Guid KeptUserId, int UsersToDelete, IReadOnlyList<KeyValuePair<string, int>> Counts, IReadOnlyList<string> ForgejoUsernames);
