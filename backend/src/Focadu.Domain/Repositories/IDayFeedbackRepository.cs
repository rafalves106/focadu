using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;

namespace Focadu.Domain.Repositories;

public interface IDayFeedbackRepository
{
    Task<DayFeedback?> GetByUserAndDailyAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default);

    Task AddAsync(DayFeedback feedback, CancellationToken cancellationToken = default);

    /// <summary>Todos os feedbacks de um curso, ja com a semana e o dia do template (para o relatorio de clareza).</summary>
    Task<IReadOnlyList<DayFeedbackRow>> ListByCourseAsync(Guid courseId, CancellationToken cancellationToken = default);
}

public record DayFeedbackRow(int WeekNumber, int DayNumber, int Clarity, ActivityType? StuckActivityType);
