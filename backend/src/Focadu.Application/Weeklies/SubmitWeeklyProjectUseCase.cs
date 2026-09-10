using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: aluno submete a URL do projeto pratico da semana (repositorio GitHub, post no
/// LinkedIn, etc. - ver SeedWebSecurityCourseUseCase) - WeeklyProject.Submit ja existia no
/// dominio desde a Fase 1, so faltava um caso de uso/endpoint pra chama-lo (Fase 7). Usa
/// IWeeklyRepository.GetByIdAsync (Weekly ja e o aggregate root que carrega o Project junto) - sem
/// repositorio proprio pra WeeklyProject.
///
/// Fase 27b: dispara a avaliacao automaticamente logo apos submeter, reaproveitando
/// EvaluateWeeklyProjectUseCase (composicao, nao duplica a logica de GitHub/Groq/gamificacao) -
/// antes desta fase, nada no frontend chamava POST .../project/evaluate, entao o projeto ficava
/// "AGUARDANDO AVALIAÇÃO" pra sempre e Weekly.IsModuleComplete() nunca virava true, o que por sua
/// vez significava que RequiresPublicationToUnlock() nunca disparava - a trava de publicacao
/// publica (Secao 2.3 do MESTRE.md, "bloqueio de fato") nunca engatava de verdade. Mesmo principio
/// "sob demanda" ja usado no resto do dominio (nao vira job/estado intermediario). Falha na
/// avaliacao automatica NUNCA falha a submissao em si - mesma resiliencia de "bonus, nao core" que
/// GetCuratedContentUseCase ja usa pra analogia: URL que nao e repositorio GitHub publico
/// (`ValidationException`, ex: post do LinkedIn - o campo aceita qualquer URL, ver
/// WeeklyProjectPage.tsx) ou falha externa (GitHub/Groq fora do ar, `ExternalServiceException`)
/// so deixam o projeto em Submitted, exatamente como funcionava (sempre) antes desta fase - nunca
/// pior, so as URLs de repositorio GitHub publico ganham o caminho novo (avaliado na hora).
/// </summary>
public class SubmitWeeklyProjectUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly EvaluateWeeklyProjectUseCase _evaluateWeeklyProjectUseCase;

    public SubmitWeeklyProjectUseCase(
        IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, EvaluateWeeklyProjectUseCase evaluateWeeklyProjectUseCase)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _evaluateWeeklyProjectUseCase = evaluateWeeklyProjectUseCase;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(
        Guid userId, Guid weeklyId, string submissionUrl, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        project.Submit(submissionUrl);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            return await _evaluateWeeklyProjectUseCase.ExecuteAsync(userId, weeklyId, cancellationToken);
        }
        catch (Exception ex) when (ex is ValidationException or ExternalServiceException)
        {
            // Ver doc da classe - submissao ja foi salva (Submitted) acima, so a avaliacao
            // automatica que nao rolou desta vez. Devolve o estado atual (sem Score/Feedback) em
            // vez de propagar - o frontend ja trata "AGUARDANDO AVALIAÇÃO" normalmente.
            return new WeeklyProjectDto(
                project.Id, weekly.Template.WeeklyProjectSpecText ?? string.Empty, project.Status, project.SubmissionUrl,
                project.Score, project.Feedback);
        }
    }
}
