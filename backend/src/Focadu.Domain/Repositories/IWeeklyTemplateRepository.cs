using Focadu.Domain.Content;
using Focadu.Domain.Weeklies;

namespace Focadu.Domain.Repositories;

/// <summary>
/// Port de persistencia pro lado TEMPLATE (curriculo) de uma semana (Fase 13). So leitura -
/// WeeklyTemplate e sempre criada transitivamente via Course.AddMonthly/Monthly.
/// AddWeeklyTemplate (seed), nunca standalone, entao nao precisa de AddAsync proprio. Usado pela
/// autoria de conteudo curado (/admin/conteudo, Fase 4/6), que edita CuratedContent - dado de
/// curriculo, nao de progresso do usuario.
/// </summary>
public interface IWeeklyTemplateRepository
{
    Task<WeeklyTemplate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CuratedContent?> GetCuratedContentByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Fase 79: o conteudo e usado por uma ponte (DailyTemplate.IsBridge: com Language ou com CodeStep, Fase 82) - la nao ha analogia "Pra voce".</summary>
    Task<bool> IsBridgeContentAsync(Guid contentId, CancellationToken cancellationToken = default);

    /// <summary>Fase 85: nome do curso desta semana-modelo - os prompts de IA citam o curso certo (antes todos diziam "seguranca web").</summary>
    Task<string?> GetCourseNameAsync(Guid weeklyTemplateId, CancellationToken cancellationToken = default);

    /// <summary>Fase 85: nome do curso a que este conteudo curado pertence.</summary>
    Task<string?> GetCourseNameForContentAsync(Guid contentId, CancellationToken cancellationToken = default);

    /// <summary>Status do curso desta semana-modelo: curso em rascunho (Draft) so aparece pra quem tem previa.</summary>
    Task<Enums.CourseStatus?> GetCourseStatusAsync(Guid weeklyTemplateId, CancellationToken cancellationToken = default);

    /// <summary>Status do curso a que este conteudo curado pertence (mesma regra do rascunho).</summary>
    Task<Enums.CourseStatus?> GetCourseStatusForContentAsync(Guid contentId, CancellationToken cancellationToken = default);
}
