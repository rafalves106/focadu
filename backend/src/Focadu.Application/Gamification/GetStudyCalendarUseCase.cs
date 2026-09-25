using Focadu.Application.Ports;
using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Gamification;

/// <summary>
/// Caso de uso: os ultimos <see cref="Days"/> dias de estudo do aluno (Fase 72, cartao "Últimos 14 dias"
/// do Perfil, Figma "Perfil + Squad — v2") + a ultima sessao concluida. Cada dia vira um status:
/// estudou (alguma Daily concluida nesse dia), folga (a folga movel da ofensiva, Fase 69), pausa
/// (Projeto Semanal aberto, StreakPauseWindows), faltou, hoje (ainda sem estudo) ou antes de entrar.
///
/// Limite conhecido: UserStreak so guarda a ULTIMA folga usada (LastRestDate) - uma folga mais antiga
/// dentro da janela aparece como "faltou". Leitura pura, sem efeito colateral (diferente de
/// GetGamificationSummaryUseCase, este nao observa quebra de ofensiva).
/// </summary>
public class GetStudyCalendarUseCase
{
    internal const int Days = 14;

    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserStreakRepository _streakRepository;
    private readonly StreakPauseWindows _streakPauseWindows;
    private readonly IClock _clock;

    public GetStudyCalendarUseCase(
        IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository, IUserRepository userRepository,
        IUserStreakRepository streakRepository, StreakPauseWindows streakPauseWindows, IClock clock)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _streakRepository = streakRepository;
        _streakPauseWindows = streakPauseWindows;
        _clock = clock;
    }

    public async Task<StudyCalendarDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var completions = new List<(int DayNumber, bool IsReinforcement, DateTime CompletedAt, double? Score)>();
        foreach (var enrollment in await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken))
        {
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
                completions.AddRange(weekly.Dailies
                    .Where(d => d.CompletedAt.HasValue)
                    .Select(d => (d.DayNumber, d.IsReinforcement, d.CompletedAt!.Value, d.CalculateScore())));
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);
        var pauses = await _streakPauseWindows.ForUserAsync(userId, cancellationToken);
        var today = _clock.Today();

        var studied = completions.Select(c => LocalDate(c.CompletedAt)).ToHashSet();
        var joined = user is null ? DateOnly.MinValue : LocalDate(user.CreatedAt);
        var days = ResolveDays(today, studied, pauses, streak?.LastRestDate, joined);

        var last = completions.OrderByDescending(c => c.CompletedAt).Select(c => (StudySessionDto?)new StudySessionDto(c.DayNumber, c.IsReinforcement, c.CompletedAt, c.Score)).FirstOrDefault();
        return new StudyCalendarDto(days, last);
    }

    /// <summary>Os <see cref="Days"/> dias terminando em hoje, do mais antigo pro mais novo.</summary>
    internal static List<StudyDayDto> ResolveDays(
        DateOnly today, IReadOnlySet<DateOnly> studied, IReadOnlyCollection<StreakPause> pauses, DateOnly? lastRest, DateOnly joined)
    {
        var days = new List<StudyDayDto>();
        for (var d = today.AddDays(-(Days - 1)); d <= today; d = d.AddDays(1))
        {
            var status = studied.Contains(d) ? StudyDayStatus.Studied
                : d == today ? StudyDayStatus.Today
                : d < joined ? StudyDayStatus.Before
                : pauses.Any(p => p.Contains(d)) ? StudyDayStatus.Paused
                : d == lastRest ? StudyDayStatus.Rest
                : StudyDayStatus.Missed;
            days.Add(new StudyDayDto(d, status));
        }
        return days;
    }

    private static DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(utc.ToLocalTime());
}

/// <summary>Status de um dia no calendario (texto no JSON).</summary>
public static class StudyDayStatus
{
    public const string Studied = "studied";
    public const string Rest = "rest";
    public const string Paused = "paused";
    public const string Missed = "missed";
    public const string Today = "today";
    public const string Before = "before";
}

public record StudyDayDto(DateOnly Date, string Status);

public record StudySessionDto(int DayNumber, bool IsReinforcement, DateTime CompletedAt, double? Score);

public record StudyCalendarDto(IReadOnlyList<StudyDayDto> Days, StudySessionDto? LastSession);
