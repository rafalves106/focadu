using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso do `resetar-usuarios --manter &lt;email&gt;` (plano de curadoria, 02/10/2026). Apaga todos os usuarios menos o
/// do dono e zera o progresso dele: matriculas (e tudo que pende delas: semanas, dailies, respostas, projetos), anotacoes e
/// revisoes do caderninho, feedback do dia, analogias, ofensiva, gemas e indicacoes. Mantem a conta, o perfil, os cosmeticos
/// e o squad do dono. Operacao destrutiva: dry-run por padrao; executar exige <c>Confirm</c> e <c>BackupDone</c>.
/// </summary>
public class ResetUsersUseCase
{
    private readonly IUserResetService _service;

    public ResetUsersUseCase(IUserResetService service)
    {
        _service = service;
    }

    public async Task<ResetUsersResult> ExecuteAsync(string? keepEmail, bool confirm, bool backupDone, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keepEmail))
            throw new ValidationException("manter_obrigatorio", "Informe o e-mail do usuario que fica (--manter).");

        var mode = Decide(confirm, backupDone);
        if (mode == ResetMode.Refuse)
            throw new ValidationException("backup_obrigatorio", "Para apagar de verdade, afirme que o backup do banco foi feito (--backup-feito) junto de --confirmar.");

        var email = keepEmail.Trim().ToLowerInvariant();
        return mode == ResetMode.Execute
            ? new ResetUsersResult(true, await _service.ExecuteAsync(email, cancellationToken))
            : new ResetUsersResult(false, await _service.PlanAsync(email, cancellationToken));
    }

    /// <summary>Sem --confirmar e dry-run; com --confirmar exige --backup-feito. Pura, para teste.</summary>
    public static ResetMode Decide(bool confirm, bool backupDone) =>
        !confirm ? ResetMode.DryRun : backupDone ? ResetMode.Execute : ResetMode.Refuse;
}

public enum ResetMode { DryRun, Execute, Refuse }

public record ResetUsersResult(bool Executed, UserResetPlan Plan);
