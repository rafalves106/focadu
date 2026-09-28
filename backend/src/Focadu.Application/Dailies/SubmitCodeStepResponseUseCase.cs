using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: o aluno manda um passo de codigo da ponte (Fase 79, "code comigo" -
/// secret/rascunhos/ponte-code-comigo.md). Recebe o trecho de codigo do passo e a saida que ele
/// viu no terminal; a IA confere as duas coisas contra a rubrica do passo, com o script dos passos
/// anteriores como contexto (montado aqui, a partir do que cada passo anterior entregou - nunca
/// vindo do cliente). Passou = Score 100, "ajuste isto" = 0: o passo nao vale nota (Daily ignora
/// CodeStep no Score) nem conta como erro da sessao.
///
/// Guarda no mesmo ActivityResponse dos outros tipos: Transcript = o codigo do passo,
/// Justification = a saida colada, AiFeedback = a fala da Focada.
/// </summary>
public class SubmitCodeStepResponseUseCase
{
    /// <summary>Teto do codigo e da saida - um passo tem umas dezenas de linhas; isto so barra abuso.</summary>
    public const int MaxLength = 20_000;

    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly ICodeStepEvaluationService _evaluationService;

    public SubmitCodeStepResponseUseCase(
        IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IClock clock, ICodeStepEvaluationService evaluationService)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _evaluationService = evaluationService;
    }

    public async Task<SubmitActivityResponseResult> ExecuteAsync(
        Guid userId, Guid dailyId, Guid activityId, string? code, string? output, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ValidationException("codigo_obrigatorio", "Escreva o codigo do passo antes de enviar.");
        if (string.IsNullOrWhiteSpace(output))
            throw new ValidationException("saida_obrigatoria", "Cole a saida que apareceu no seu terminal.");
        if (code.Length > MaxLength || output.Length > MaxLength)
            throw new ValidationException("codigo_muito_grande", $"Codigo e saida tem limite de {MaxLength} caracteres cada.");

        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var activity = daily.Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        if (activity.Type != ActivityType.CodeStep)
            throw new ValidationException("tipo_atividade_invalido", "Este endpoint so aceita passos de codigo (CodeStep).");

        // Em replay (Daily ja concluida) o aluno pode refazer os passos a vontade.
        if (!daily.HasEverCompleted && daily.IsCodeStepDone(activityId))
            throw new DomainException("Este passo ja foi concluido.", "passo_concluido");

        var priorCode = daily.PriorCode(activityId)
            ?? throw new DomainException("Conclua o passo anterior antes deste.", "passo_anterior_pendente");

        var attemptNumber = daily.Responses.Count(r => r.ActivityId == activityId) + 1;
        var evaluation = await _evaluationService.EvaluateAsync(
            new CodeStepEvaluationRequest(
                daily.Template.Language?.ToString() ?? "Python",
                activity.Prompt ?? string.Empty,
                activity.CodeRubric ?? string.Empty,
                activity.CodeExpectedOutput ?? string.Empty,
                activity.CodeSolution ?? string.Empty,
                priorCode,
                code,
                output,
                attemptNumber,
                CodeStepProgress.MaxAttempts),
            cancellationToken);

        return await ActivityResponseRecorder.RecordAsync(
            weekly, daily, activityId, evaluation.Passed ? 100 : 0, transcript: code, correctedTranscript: null,
            justification: output, evaluation.Feedback, _clock, _unitOfWork, cancellationToken);
    }
}
