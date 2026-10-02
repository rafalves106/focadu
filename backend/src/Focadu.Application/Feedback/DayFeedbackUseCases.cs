using Focadu.Application.Exceptions;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Feedback;

public record DayFeedbackDto(
    Guid DailyId, int Clarity, Guid? StuckActivityId, ActivityType? StuckActivityType, string? Comment, DateTime UpdatedAt)
{
    public static DayFeedbackDto From(DayFeedback f) =>
        new(f.DailyId, f.Clarity, f.StuckActivityId, f.StuckActivityType, f.Comment, f.UpdatedAt);
}

/// <summary>
/// Caso de uso: o aluno avalia o dia ao fim dele (clareza 1 a 5, onde travou, comentario). Um por Daily e usuario;
/// reenviar regrava. So depois de concluir o dia - e a avaliacao do dia inteiro, nao de um pedaco.
/// </summary>
public class SubmitDayFeedbackUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IDayFeedbackRepository _feedbackRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitDayFeedbackUseCase(IWeeklyRepository weeklyRepository, IDayFeedbackRepository feedbackRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _feedbackRepository = feedbackRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<DayFeedbackDto> ExecuteAsync(
        Guid userId, Guid dailyId, int clarity, Guid? stuckActivityId, string? comment, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");
        var daily = weekly.Dailies.First(d => d.Id == dailyId);

        if (!daily.HasEverCompleted)
            throw new DomainException("Conclua o dia antes de avaliar a clareza dele.", "daily_nao_concluida");

        Domain.Activities.DailyActivity? stuck = null;
        if (stuckActivityId is { } activityId)
        {
            stuck = daily.Activities.FirstOrDefault(a => a.Id == activityId)
                ?? throw new DomainException("Atividade nao encontrada nesta Daily.", "atividade_nao_encontrada");
        }

        var feedback = await _feedbackRepository.GetByUserAndDailyAsync(userId, dailyId, cancellationToken);
        var isNew = feedback is null;
        feedback ??= new DayFeedback(userId, dailyId, daily.DailyTemplateId);
        feedback.Rate(clarity, stuck, comment);

        if (isNew)
            await _feedbackRepository.AddAsync(feedback, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return DayFeedbackDto.From(feedback);
    }
}

/// <summary>Caso de uso: le o feedback que o aluno ja deu ao dia (para a tela mostrar o que ele marcou). 404 se ainda nao deu.</summary>
public class GetDayFeedbackUseCase
{
    private readonly IDayFeedbackRepository _feedbackRepository;

    public GetDayFeedbackUseCase(IDayFeedbackRepository feedbackRepository)
    {
        _feedbackRepository = feedbackRepository;
    }

    public async Task<DayFeedbackDto> ExecuteAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default) =>
        DayFeedbackDto.From(await _feedbackRepository.GetByUserAndDailyAsync(userId, dailyId, cancellationToken)
            ?? throw new NotFoundException("feedback_nao_encontrado", "Voce ainda nao avaliou este dia."));
}
