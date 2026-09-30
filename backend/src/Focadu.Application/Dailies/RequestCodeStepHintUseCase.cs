using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso da Fase 86 (laboratorio de codigo, rascunho laboratorio-de-codigo-na-ponte.md, decisao 4):
/// o aluno pede uma dica da Focada num passo de codigo que roda no laboratorio. A IA olha o codigo dele, o
/// que aconteceu ao rodar (saida/erro e, no Linux, o historico de comandos) e a rubrica do passo, e
/// responde em tres blocos (o que esta certo, onde errou, o que melhorar). Nao e tentativa: nao cria
/// ActivityResponse, nao soma penalidade nem gera reforco; so conta pro limite de
/// <see cref="CodeStepProgress.MaxHints"/> dicas por passo (tabela CodeStepHints). O codigo dos passos
/// anteriores vem do servidor (<c>Daily.PriorCode</c>), nunca do cliente.
/// </summary>
public class RequestCodeStepHintUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeStepHintService _hintService;
    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;

    public RequestCodeStepHintUseCase(
        IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, ICodeStepHintService hintService,
        IWeeklyTemplateRepository weeklyTemplateRepository)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _hintService = hintService;
        _weeklyTemplateRepository = weeklyTemplateRepository;
    }

    public async Task<CodeStepHintResponse> ExecuteAsync(
        Guid userId, Guid dailyId, Guid activityId, string? code, LabRunInput? labRun, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ValidationException("codigo_obrigatorio", "Escreva algum codigo antes de pedir a dica.");
        if (code.Length > SubmitCodeStepResponseUseCase.MaxLength)
            throw new ValidationException("codigo_muito_grande", $"Codigo e saida tem limite de {SubmitCodeStepResponseUseCase.MaxLength} caracteres cada.");

        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var activity = daily.Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        if (activity.Type != ActivityType.CodeStep)
            throw new ValidationException("tipo_atividade_invalido", "Este endpoint so aceita passos de codigo (CodeStep).");

        // Barra antes de gastar a IA: a mesma checagem que Daily.AddCodeStepHint repete ao gravar.
        if (!daily.Template.StepUsesLab(activity))
            throw new DomainException("Este passo nao tem laboratorio, entao nao tem dica.", "passo_sem_laboratorio");
        var used = daily.Hints.Count(h => h.ActivityId == activityId);
        if (used >= CodeStepProgress.MaxHints)
            throw new DomainException($"As {CodeStepProgress.MaxHints} dicas deste passo ja foram usadas.", "dicas_esgotadas");
        var priorCode = daily.PriorCode(activityId)
            ?? throw new DomainException("Conclua o passo anterior antes deste.", "passo_anterior_pendente");

        var normalized = labRun?.Normalize(SubmitCodeStepResponseUseCase.MaxLength);
        var courseName = await _weeklyTemplateRepository.GetCourseNameAsync(weekly.Template.Id, cancellationToken);
        var result = await _hintService.HintAsync(
            new CodeStepHintRequest(
                daily.Template.Language?.ToString() ?? weekly.Template.PracticeLanguage ?? "Python",
                activity.Prompt ?? string.Empty,
                activity.CodeRubric ?? string.Empty,
                activity.CodeExpectedOutput ?? string.Empty,
                activity.CodeSolution ?? string.Empty,
                priorCode,
                code,
                normalized?.Text ?? string.Empty,
                normalized?.Run,
                used + 1,
                CodeStepProgress.MaxHints,
                courseName),
            cancellationToken);

        var hint = daily.AddCodeStepHint(activityId, result.Right, result.Wrong, result.Improve);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CodeStepHintResponse(
            new CodeStepHintDto(hint.Number, hint.Right, hint.Wrong, hint.Improve, hint.CreatedAt),
            hint.Number, CodeStepProgress.MaxHints - hint.Number);
    }
}

/// <summary>Fase 86: a dica nova, quantas ja foram usadas no passo e quantas restam.</summary>
public record CodeStepHintResponse(CodeStepHintDto Hint, int HintsUsed, int HintsLeft);
