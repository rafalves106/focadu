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
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public GetGamificationSummaryUseCase(
        IUserGemBalanceRepository gemBalanceRepository, IUserStreakRepository streakRepository, IUnitOfWork unitOfWork, IClock clock)
    {
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

        var currentStreak = streak?.CurrentStreakAsOf(today) ?? 0;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new GamificationSummaryDto(
            gemBalance?.TotalGems ?? 0,
            currentStreak,
            streak?.LongestStreak ?? 0,
            streak?.BrokenAt is not null);
    }
}

public record GamificationSummaryDto(int TotalGems, int CurrentStreak, int LongestStreak, bool StreakJustBroken);
