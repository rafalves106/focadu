namespace Focadu.Application.Ports;

/// <summary>
/// Diz a Medicao de IA (Fase 94) de quem e a chamada que vem a seguir: o caso de uso abre o contexto antes de chamar
/// um servico de IA, e a Infrastructure anota aluno, curso e dia do curso em cada chamada feita dentro dele.
/// Sem contexto aberto, a chamada e medida do mesmo jeito, so sem aluno. Nunca muda o que o aluno ve.
/// </summary>
public interface IAiUsageContext
{
    IDisposable Begin(Guid userId, Guid? dailyId = null, Guid? weeklyId = null);
}
