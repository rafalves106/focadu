using Focadu.Domain.Weeklies;

namespace Focadu.Domain.Repositories;

/// <summary>
/// Port de persistencia para o aggregate Weekly (Fase 13: instância por usuário - ver
/// "Template vs Instancia" em docs/ARQUITETURA.md). Weekly continua o aggregate root
/// "operacional" do dia a dia: carrega junto Dailies (cada uma com seu DailyTemplate -
/// Activities/QuizOptions/RoleplayNodes/RoleplayOptions/Responses), WeeklyTemplate (Number/
/// Title/Theme/CuratedContents/WeeklyProjectSpecText), WeeklyProject e WeeklyReinforcements,
/// porque as regras de acesso e reforco (EvaluateDailyAccess, CreateDailyReinforcement,
/// TriggerWeeklyReinforcement) precisam enxergar tudo isso ao mesmo tempo.
/// </summary>
public interface IWeeklyRepository
{
    /// <summary>Fase 13: userId filtra pela Enrollment dona da Weekly - id de outro usuario retorna null (404 pro chamador), nunca vaza progresso alheio.</summary>
    Task<Weekly?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Localiza a Weekly (com grafo completo) que contem a Daily informada - mesmo filtro por userId de GetByIdAsync.</summary>
    Task<Weekly?> GetByDailyIdAsync(Guid dailyId, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Fase 63: localiza a Weekly (com grafo completo) dona do Projeto Semanal informado - mesmo filtro por userId.</summary>
    Task<Weekly?> GetByWeeklyProjectIdAsync(Guid weeklyProjectId, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Todas as Weeklies (instancia) da matricula, pra checagens cross-Weekly (ex: bloqueio por publicacao pendente - ver StartOrResumeDailyUseCase; ou qual Daily e a proxima da sequencia - ver DailySequencing).</summary>
    Task<IReadOnlyCollection<Weekly>> GetByEnrollmentIdAsync(Guid enrollmentId, CancellationToken cancellationToken = default);

    Task AddAsync(Weekly weekly, CancellationToken cancellationToken = default);
}
