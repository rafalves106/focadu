using Focadu.Domain.Content;
using Focadu.Domain.Weeklies;

namespace Focadu.Domain.Repositories;

/// <summary>
/// Port de persistencia para o aggregate Weekly. Weekly e o aggregate root "operacional" do dia
/// a dia: carrega junto Dailies, DailyActivities, ActivityResponses, QuizOptions, RoleplayNodes,
/// RoleplayOptions, CuratedContents, WeeklyProject e WeeklyReinforcements, porque as regras de
/// acesso e reforco (EvaluateDailyAccess, CreateDailyReinforcement, TriggerWeeklyReinforcement)
/// precisam enxergar todas as Dailies da semana ao mesmo tempo.
/// </summary>
public interface IWeeklyRepository
{
    Task<Weekly?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Localiza a Weekly (com grafo completo) que contem a Daily informada.</summary>
    Task<Weekly?> GetByDailyIdAsync(Guid dailyId, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Weekly>> GetByMonthlyIdAsync(Guid monthlyId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Localiza a Weekly (com grafo completo) que, dentro do curso informado, contem uma Daily
    /// datada em "date". Usado pelo atalho "/hoje": resolve direto por data, sem precisar
    /// percorrer Course -> Monthlies -> Weeklies inteiro em memoria.
    /// </summary>
    Task<Weekly?> GetByDateAsync(Guid courseId, DateOnly date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Busca um CuratedContent direto pelo Id, sem carregar o grafo completo da Weekly - usado
    /// pela autoria de conteudo curado (Fase 4), que so precisa ler/atualizar esse unico registro.
    /// </summary>
    Task<CuratedContent?> GetCuratedContentByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(Weekly weekly, CancellationToken cancellationToken = default);
}
