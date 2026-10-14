namespace Focadu.Application.Ports;

/// <summary>
/// Diz a Medicao de IA (Fase 94) de quem e a chamada que vem a seguir: o caso de uso abre o contexto antes de chamar
/// um servico de IA, e a Infrastructure anota aluno, curso e dia do curso em cada chamada feita dentro dele.
/// Sem contexto aberto, a chamada e medida do mesmo jeito, so sem aluno. Nunca muda o que o aluno ve.
/// </summary>
public interface IAiUsageContext
{
    /// <summary>
    /// Fase 101: chame ANTES de <see cref="Begin"/> em todo caso de uso que chama IA. Lanca <c>orcamento_ia_esgotado</c> se o aluno
    /// ja gastou o orcamento de hoje. E um metodo a parte (e nao dentro de Begin) porque o contexto vive em AsyncLocal, que um
    /// metodo assincrono nao devolve ao chamador.
    /// </summary>
    Task EnsureBudgetAsync(Guid userId, CancellationToken cancellationToken = default);

    IDisposable Begin(Guid userId, Guid? dailyId = null, Guid? weeklyId = null);
}
