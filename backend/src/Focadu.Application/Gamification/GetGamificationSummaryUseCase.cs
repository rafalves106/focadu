using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Gamification;

/// <summary>
/// Caso de uso: le o resumo de gamificacao do usuario logado (Fase 14) - TotalGems +
/// CurrentStreak/LongestStreak. UserGemBalance/UserStreak sao lazy (so existem depois da primeira
/// conclusao que gera Gems/streak) - usuario sem nenhuma linha ainda devolve o estado zerado,
/// nunca 404 (nao completar nada ainda nao e um erro).
/// </summary>
public class GetGamificationSummaryUseCase
{
    private readonly IUserGemBalanceRepository _gemBalanceRepository;
    private readonly IUserStreakRepository _streakRepository;
    private readonly IClock _clock;

    public GetGamificationSummaryUseCase(
        IUserGemBalanceRepository gemBalanceRepository, IUserStreakRepository streakRepository, IClock clock)
    {
        _gemBalanceRepository = gemBalanceRepository;
        _streakRepository = streakRepository;
        _clock = clock;
    }

    public async Task<GamificationSummaryDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var gemBalance = await _gemBalanceRepository.GetByUserIdAsync(userId, cancellationToken);
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);
        var today = _clock.Today();

        return new GamificationSummaryDto(
            gemBalance?.TotalGems ?? 0,
            streak?.CurrentStreakAsOf(today) ?? 0,
            streak?.LongestStreak ?? 0);
    }
}

public record GamificationSummaryDto(int TotalGems, int CurrentStreak, int LongestStreak);
