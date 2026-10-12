namespace Focadu.Application.Ports;

/// <summary>
/// Operacoes destrutivas do Painel de gestao (Fase 94), cada uma numa transacao so: ou tudo, ou nada. Sempre em dois
/// passos na Application: Plan (conta, nao apaga) e Execute (apaga e devolve o que apagou).
/// </summary>
public interface IAdminMaintenance
{
    Task<IReadOnlyList<KeyValuePair<string, int>>> PlanCourseResetAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>Apaga a matricula do aluno no curso (semanas, dias, respostas, projetos, notas do Caderninho e revisoes) e roda `reEnroll` na mesma transacao.</summary>
    Task<IReadOnlyList<KeyValuePair<string, int>>> ResetCourseAsync(
        Guid userId, Guid courseId, Func<CancellationToken, Task> reEnroll, CancellationToken cancellationToken = default);

    /// <summary>Dias do curso que estao no banco mas fora de `curatedDays` (o que existe em conteudo/&lt;curso&gt;/).</summary>
    Task<StaleDaysPlan> PlanStaleDaysAsync(Guid courseId, IReadOnlySet<int> curatedDays, CancellationToken cancellationToken = default);

    /// <summary>Apaga os dias antigos: Dailies dos alunos nesses dias (com respostas, notas e feedback), os DailyTemplates, e semanas/meses que ficarem vazios.</summary>
    Task<StaleDaysPlan> DeleteStaleDaysAsync(Guid courseId, IReadOnlySet<int> curatedDays, CancellationToken cancellationToken = default);

    /// <summary>Roda `work` numa transacao (ex.: importar dia, que grava em dois SaveChanges).</summary>
    Task<T> InTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken cancellationToken = default);
}

/// <param name="Days">Numeros dos dias antigos.</param>
/// <param name="AffectedUsers">Alunos com resposta ou conclusao em algum desses dias (Id, nome, e-mail).</param>
/// <param name="Counts">Linhas por tabela (o que sera ou foi apagado).</param>
public record StaleDaysPlan(
    IReadOnlyList<int> Days, IReadOnlyList<AdminUserRow> AffectedUsers, IReadOnlyList<KeyValuePair<string, int>> Counts);
