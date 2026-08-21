using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: avalia o projeto pratico da semana (Fase 11) - WeeklyProject.Evaluate() existe no
/// dominio desde a Fase 1, mas nunca teve endpoint (gap documentado na Fase 7). Precisou ganhar um
/// aqui porque Weekly.IsModuleComplete() (Fase 11) exige Project.Status == Evaluated - sem isso, a
/// exigencia de publicacao nunca seria alcancavel de verdade. Sem UI dedicada nesta fase (app nao
/// tem papel de "revisor" - usuario unico, ver docs/ARQUITETURA.md) - so o endpoint, acionavel via
/// script/curl, mesmo padrao que a autoria de CuratedContent teve antes de ganhar tela (Fase 4->6).
///
/// Fase 14 (Gamificacao): tambem credita o bonus de Weekly/Monthly perfeita (GamificationCreditor)
/// - avaliar o projeto e, na pratica, o evento que costuma FECHAR uma Weekly (o fluxo normal e
/// concluir todas as Dailies primeiro, avaliar o projeto por ultimo, ver docs/fase-13a) - se so
/// CompleteDailyUseCase credita-se esse bonus, ele nunca dispararia nesse fluxo (a Weekly so vira
/// IsPerfect() depois que o projeto ja foi avaliado, momento em que nenhuma Daily esta completando
/// mais nada). Ver GamificationCreditor para o porque isso e seguro contra credito duplicado.
///
/// Fase 16 (Score de Estudo): Evaluate() passou a exigir uma nota (0-100), nao so aprovar por
/// texto livre - WeeklyProject.Score alimenta 30% de Weekly.CalculateScore(), usado pelo ranking
/// (GetCourseRankingUseCase). Continua sem UI propria.
/// </summary>
public class EvaluateWeeklyProjectUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly GamificationCreditor _gamificationCreditor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public EvaluateWeeklyProjectUseCase(
        IWeeklyRepository weeklyRepository, GamificationCreditor gamificationCreditor, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _gamificationCreditor = gamificationCreditor;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(
        Guid userId, Guid weeklyId, int score, string? feedback, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        project.Evaluate(score, feedback);

        // So resolve/cria o UserGemBalance se a Weekly de fato fechou perfeita agora - avaliar um
        // projeto de uma Weekly imperfeita (o caso comum) nao deveria criar uma linha de saldo
        // vazia so por avaliar.
        if (weekly.IsPerfect())
        {
            var today = _clock.Today();
            var gemBalance = await _gamificationCreditor.GetOrCreateGemBalanceAsync(userId, today, cancellationToken);
            await _gamificationCreditor.CreditWeeklyAndMonthlyIfPerfectAsync(gemBalance, weekly, today, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WeeklyProjectDto(
            project.Id, weekly.Template.WeeklyProjectSpecText ?? string.Empty, project.Status, project.SubmissionUrl,
            project.Score, project.Feedback);
    }
}
