using Focadu.Domain.Repositories;

namespace Focadu.Application.Gamification;

/// <summary>
/// Caso de uso: marca a quebra de streak atual como vista (Fase 10, tela "Streak Perdido") - a
/// tela nao aparece de novo ate a proxima quebra real (ver UserStreak.AcknowledgeBreak). Sem
/// streak nenhum ainda (usuario nunca completou nada) e um no-op silencioso, nao um erro.
/// </summary>
public class AcknowledgeStreakBreakUseCase
{
    private readonly IUserStreakRepository _streakRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AcknowledgeStreakBreakUseCase(IUserStreakRepository streakRepository, IUnitOfWork unitOfWork)
    {
        _streakRepository = streakRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);
        streak?.AcknowledgeBreak();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
