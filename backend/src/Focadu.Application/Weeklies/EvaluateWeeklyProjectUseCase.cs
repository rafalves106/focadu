using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
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
/// (GetCourseRankingUseCase).
///
/// Fase 21: a nota/feedback deixaram de vir do chamador (curl manual) e passaram a ser calculados
/// automaticamente - busca o conteudo do repositorio publico (IGitHubService.
/// GetContentSnapshotAsync) e pede pro Groq (IProjectEvaluationService) comparar com
/// WeeklyTemplate.WeeklyProjectSpecText. So funciona quando SubmissionUrl e um repositorio GitHub
/// (o outro formato aceito, link do LinkedIn, nao tem conteudo pra IA analisar - ver
/// SubmitPublicationUseCase pro fluxo de "prova de publicacao", que e separado deste). Continua
/// sem UI propria, so o endpoint.
/// </summary>
public class EvaluateWeeklyProjectUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IGitHubService _gitHubService;
    private readonly IProjectEvaluationService _projectEvaluationService;
    private readonly GamificationCreditor _gamificationCreditor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public EvaluateWeeklyProjectUseCase(
        IWeeklyRepository weeklyRepository, IGitHubService gitHubService, IProjectEvaluationService projectEvaluationService,
        GamificationCreditor gamificationCreditor, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _gitHubService = gitHubService;
        _projectEvaluationService = projectEvaluationService;
        _gamificationCreditor = gamificationCreditor;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        // Falha antes de gastar uma chamada a GitHub/Groq (paga) se o projeto nem estiver no
        // estado certo - WeeklyProject.Evaluate() tambem valida isso, mas so depois da IA rodar.
        if (project.Status != WeeklyProjectStatus.Submitted)
            throw new DomainException("Só é possível avaliar um projeto que foi submetido.");

        var repoRef = project.SubmissionUrl is not null ? GitHubUrlParser.TryParse(project.SubmissionUrl) : null;
        if (repoRef is not { } repo)
        {
            throw new ValidationException(
                "projeto_nao_e_repositorio_github",
                "A avaliacao automatica exige que o projeto tenha sido submetido com uma URL de repositorio GitHub publico.");
        }

        var snapshot = await _gitHubService.GetContentSnapshotAsync(repo.Owner, repo.Repo, cancellationToken);
        var specText = weekly.Template.WeeklyProjectSpecText ?? string.Empty;
        var evaluation = await _projectEvaluationService.EvaluateAsync(
            new ContentEvaluationRequest(specText, snapshot, null), cancellationToken);

        project.Evaluate(evaluation.Score, evaluation.Feedback);

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
