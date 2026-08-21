using Focadu.Domain.Repositories;

namespace Focadu.Application.Achievements;

/// <summary>
/// Caso de uso: os 5 badges do usuario logado (Fase 17) - todos calculados SOB DEMANDA, nunca
/// persistidos (mesmo principio ja usado no projeto desde a Fase 13a pra DailyStatus/
/// Weekly.Number - nada aqui e uma "conquista" armazenada, tudo deriva de dado que ja existe:
/// UserStreak, Weekly.IsPerfect() do historico, Referral confirmado, posicao de registro do
/// User). Sem entidade de dominio propria - "Achievements" e so a camada de aplicacao lendo os
/// outros aggregates.
/// </summary>
public class GetUserBadgesUseCase
{
    private const int FounderRank = 20;

    private readonly IUserStreakRepository _streakRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IReferralRepository _referralRepository;
    private readonly IUserRepository _userRepository;

    public GetUserBadgesUseCase(
        IUserStreakRepository streakRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IReferralRepository referralRepository,
        IUserRepository userRepository)
    {
        _streakRepository = streakRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _referralRepository = referralRepository;
        _userRepository = userRepository;
    }

    public async Task<UserBadgesDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);
        var longestStreak = streak?.LongestStreak ?? 0;

        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);
        var perfectWeeklyCount = 0;
        foreach (var enrollment in enrollments)
        {
            var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
            perfectWeeklyCount += weeklies.Count(w => w.IsPerfect());
        }

        var referrals = await _referralRepository.GetByReferrerUserIdAsync(userId, cancellationToken);
        var confirmedReferralCount = referrals.Count(r => r.ConfirmedAt is not null);

        var isFounder = await _userRepository.IsAmongFirstRegisteredAsync(userId, FounderRank, cancellationToken);

        return ComputeBadges(longestStreak, perfectWeeklyCount, confirmedReferralCount, isFounder);
    }

    /// <summary>
    /// Nucleo puro - internal static, testavel sem repositorio nenhum (mesmo padrao de
    /// SubmitActivityResponseUseCase.ResolveScore/GetCourseRankingUseCase.ComputeScore). "Progress"
    /// e o numero cru por tras de cada badge (streak mais longa, semanas perfeitas, indicacoes
    /// confirmadas, 1/0 pro Founder) - o frontend decide como exibir ("3x", etc).
    /// </summary>
    internal static UserBadgesDto ComputeBadges(int longestStreak, int perfectWeeklyCount, int confirmedReferralCount, bool isFounder) =>
        new([
            new BadgeDto("streak_7", longestStreak >= 7, longestStreak),
            new BadgeDto("streak_30", longestStreak >= 30, longestStreak),
            new BadgeDto("easy_weekly", perfectWeeklyCount >= 1, perfectWeeklyCount),
            new BadgeDto("embaixador", confirmedReferralCount >= 1, confirmedReferralCount),
            new BadgeDto("founder", isFounder, isFounder ? 1 : 0),
        ]);
}

public record BadgeDto(string Code, bool Achieved, int Progress);

public record UserBadgesDto(IReadOnlyCollection<BadgeDto> Badges);
