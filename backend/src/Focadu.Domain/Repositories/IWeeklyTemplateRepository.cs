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
}
