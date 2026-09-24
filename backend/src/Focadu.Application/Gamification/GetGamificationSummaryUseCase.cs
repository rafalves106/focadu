using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Gamification;

/// <summary>
/// Caso de uso: le o resumo de gamificacao do usuario logado (Fase 14) - TotalGems +
/// CurrentStreak/LongestStreak. UserGemBalance/UserStreak sao lazy (so existem depois da primeira
/// conclusao que gera Gems/streak) - usuario sem nenhuma linha ainda devolve o estado zerado,
/// nunca 404 (nao completar nada ainda nao e um erro).
///
/// Fase 10 (retomada): CurrentStreakAsOf tem efeito colateral na 1a leitura que observa uma quebra
/// (marca UserStreak.BrokenAt) - por isso este caso de uso, mesmo sendo um GET, precisa de
/// IUnitOfWork pra persistir essa marca (SaveChangesAsync e um no-op quando nada mudou).
/// StreakJustBroken no DTO e o que dispara a tela "Streak Perdido" no frontend.
/// </summary>
public class GetGamificationSummaryUseCase
{
    private readonly IUserGemBalanceRepository _gemBalanceRepository;
    private readonly IUserStreakRepository _streakRepository;
    private readonly StreakPauseWindows _streakPauseWindows;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public GetGamificationSummaryUseCase(
        IUserGemBalanceRepository gemBalanceRepository, IUserStreakRepository streakRepository,
        StreakPauseWindows streakPauseWindows, IUnitOfWork unitOfWork, IClock clock)
    {
        _streakPauseWindows = streakPauseWindows;
        _gemBalanceRepository = gemBalanceRepository;
        _streakRepository = streakRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<GamificationSummaryDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var gemBalance = await _gemBalanceRepository.GetByUserIdAsync(userId, cancellationToken);
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);
        var today = _clock.Today();

        var pauses = await _streakPauseWindows.ForUserAsync(userId, cancellationToken);
        var currentStreak = streak?.CurrentStreakAsOf(today, pauses) ?? 0;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new GamificationSummaryDto(
            gemBalance?.TotalGems ?? 0,
            currentStreak,
            streak?.LongestStreak ?? 0,
            streak?.BrokenAt is not null,
            StreakPauseWindows.Covering(pauses, today)?.To,
            streak?.IsRestAvailableOn(today) ?? true);
    }
}

/// <param name="StreakPausedUntil">Fase 69: ultimo dia da pausa da ofensiva que cobre hoje (projeto semanal aberto), ou nulo sem pausa.</param>
/// <param name="StreakRestAvailable">Fase 69: a folga movel (1 dia sem estudo a cada 7) esta livre hoje.</param>
public record GamificationSummaryDto(
    int TotalGems, int CurrentStreak, int LongestStreak, bool StreakJustBroken,
    DateOnly? StreakPausedUntil, bool StreakRestAvailable);
