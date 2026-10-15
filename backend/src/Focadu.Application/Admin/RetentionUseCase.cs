using Focadu.Application.Ports;
using Focadu.Domain.ProductMetrics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Admin;

/// <summary>
/// Aba Retencao (Fase 103, medicao de produto). Le tudo e calcula em memoria com o RetentionCalculator: a leva e pequena
/// (~5 testadores) e o plano pede "sob demanda, sem cron". Admins e contas desativadas ficam fora de todas as contas.
/// </summary>
public class AdminRetentionUseCase
{
    public const int DeviceWindowDays = 30;

    private readonly IAdminQueries _queries;
    private readonly IScreenVisitRepository _visits;
    private readonly IClock _clock;

    public AdminRetentionUseCase(IAdminQueries queries, IScreenVisitRepository visits, IClock clock)
    {
        _queries = queries;
        _visits = visits;
        _clock = clock;
    }

    public async Task<RetentionReportDto> ExecuteAsync(Guid? courseId, CancellationToken cancellationToken = default)
    {
        var today = _clock.Today();
        var students = (await _queries.ListUsersAsync(cancellationToken))
            .Where(u => !u.IsAdmin && u.DisabledAt is null)
            .Select(u => new RetentionStudent(u.Id, LocalDay(u.CreatedAt)))
            .ToList();
        var ids = students.Select(s => s.UserId).ToHashSet();

        var visits = (await _visits.ListAsync(null, cancellationToken)).Where(v => ids.Contains(v.UserId)).ToList();
        var completions = (await _queries.ListCompletionFactsAsync(cancellationToken)).Where(c => ids.Contains(c.UserId)).ToList();
        var enrollments = (await _queries.ListEnrollmentsAsync(null, cancellationToken)).Where(e => ids.Contains(e.UserId)).ToList();
        var projectWeeks = await _queries.ListProjectWeeksAsync(cancellationToken);
        var delivered = (await _queries.ListDeliveredProjectsAsync(cancellationToken)).Where(p => ids.Contains(p.UserId)).ToList();
        var courses = await _queries.ListCoursesAsync(cancellationToken);

        var completionDays = completions.Select(c => (c.UserId, Day: LocalDay(c.CompletedAt))).ToList();
        var openDays = visits.Select(v => (v.UserId, v.Day)).Concat(completionDays).ToList();

        var withProjects = projectWeeks.Select(w => w.CourseId).ToHashSet();
        var options = courses
            .Select(c => new RetentionCourseOptionDto(c.Id, c.Name, withProjects.Contains(c.Id)))
            .ToList();
        // Sem curso escolhido: o curso com mais alunos matriculados (o que a leva esta fazendo).
        var selected = courseId
            ?? enrollments.GroupBy(e => e.CourseId).OrderByDescending(g => g.Count()).Select(g => (Guid?)g.Key).FirstOrDefault()
            ?? options.Select(o => (Guid?)o.Id).FirstOrDefault();

        var enrolledInCourse = enrollments.Where(e => e.CourseId == selected).Select(e => e.UserId).ToHashSet();
        var courseCompletions = completions.Where(c => c.CourseId == selected).Select(c => (c.UserId, c.Week)).ToList();

        var cohorts = RetentionCalculator.Cohorts(students, openDays, completionDays, today);
        return new RetentionReportDto(
            HasData: students.Count > 0,
            Cohorts: cohorts,
            CohortTotal: RetentionCalculator.Total(cohorts),
            Courses: options,
            CourseId: selected,
            CourseHasProjects: selected is not null && withProjects.Contains(selected.Value),
            DailyToProject: RetentionCalculator.DailyToProject(
                courseCompletions,
                projectWeeks.Where(w => w.CourseId == selected).Select(w => w.Week),
                delivered.Where(p => p.CourseId == selected).Select(p => (p.UserId, p.Week))),
            Dropout: RetentionCalculator.Dropout(
                students.Where(s => enrolledInCourse.Contains(s.UserId)).ToList(), openDays, courseCompletions, today),
            DeviceWindowDays: DeviceWindowDays,
            ScreensByDevice: RetentionCalculator.ScreensByDevice(visits, today.AddDays(-(DeviceWindowDays - 1))));
    }

    // CreatedAt/CompletedAt sao UTC; o dia que conta e o local (mesma conversao da ofensiva e do painel).
    private static DateOnly LocalDay(DateTime utc) => DateOnly.FromDateTime(DateTime.SpecifyKind(utc, DateTimeKind.Utc).ToLocalTime());
}

internal record RetentionStudent(Guid UserId, DateOnly SignupDay);

/// <summary>Contas da aba Retencao, puras (testadas em Focadu.Tests).</summary>
internal static class RetentionCalculator
{
    internal static readonly int[] Horizons = [1, 7, 30];

    /// <summary>Segunda-feira da semana do dia.</summary>
    internal static DateOnly WeekStart(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));

    /// <summary>
    /// Retorno continuo: o aluno conta em DN se ja tem N dias de cadastro; voltou se tem algum dia (aberto ou de Daily)
    /// a partir de cadastro + N. Celula nula quando ninguem da coorte chegou a N dias.
    /// </summary>
    internal static IReadOnlyList<RetentionCohortDto> Cohorts(
        IReadOnlyList<RetentionStudent> students,
        IEnumerable<(Guid UserId, DateOnly Day)> openDays,
        IEnumerable<(Guid UserId, DateOnly Day)> dailyDays,
        DateOnly today)
    {
        var lastOpen = LastDayByUser(openDays);
        var lastDaily = LastDayByUser(dailyDays);

        RetentionCellDto? Cell(IReadOnlyList<RetentionStudent> cohort, int n, Dictionary<Guid, DateOnly> last)
        {
            var eligible = cohort.Where(s => s.SignupDay.AddDays(n) <= today).ToList();
            if (eligible.Count == 0)
                return null;
            var returned = eligible.Count(s => last.TryGetValue(s.UserId, out var day) && day >= s.SignupDay.AddDays(n));
            return new RetentionCellDto(returned, eligible.Count);
        }

        return students
            .GroupBy(s => WeekStart(s.SignupDay))
            .OrderByDescending(g => g.Key)
            .Select(g =>
            {
                var cohort = g.ToList();
                return new RetentionCohortDto(
                    g.Key, cohort.Count,
                    Cell(cohort, 1, lastOpen), Cell(cohort, 7, lastOpen), Cell(cohort, 30, lastOpen),
                    Cell(cohort, 1, lastDaily), Cell(cohort, 7, lastDaily), Cell(cohort, 30, lastDaily));
            })
            .ToList();
    }

    /// <summary>
    /// Linha "Total": soma, celula a celula, as coortes que ja tem alguem com o prazo cumprido (n e N somados). Nulo sem
    /// coorte. `WeekStart` da linha e o da coorte mais antiga.
    /// </summary>
    internal static RetentionCohortDto? Total(IReadOnlyList<RetentionCohortDto> cohorts)
    {
        if (cohorts.Count == 0)
            return null;

        RetentionCellDto? Sum(Func<RetentionCohortDto, RetentionCellDto?> pick)
        {
            var cells = cohorts.Select(pick).OfType<RetentionCellDto>().ToList();
            return cells.Count == 0 ? null : new RetentionCellDto(cells.Sum(c => c.Returned), cells.Sum(c => c.Eligible));
        }

        return new RetentionCohortDto(
            cohorts.Min(c => c.WeekStart), cohorts.Sum(c => c.Students),
            Sum(c => c.OpenedD1), Sum(c => c.OpenedD7), Sum(c => c.OpenedD30),
            Sum(c => c.DailyD1), Sum(c => c.DailyD7), Sum(c => c.DailyD30));
    }

    /// <summary>Por semana com Projeto Semanal: quem concluiu ao menos 1 Daily dela e, desses, quem entregou o projeto.</summary>
    internal static IReadOnlyList<DailyToProjectWeekDto> DailyToProject(
        IEnumerable<(Guid UserId, int Week)> completions,
        IEnumerable<int> projectWeeks,
        IEnumerable<(Guid UserId, int Week)> deliveredProjects)
    {
        var distinct = completions.Distinct().ToList();
        var didDaily = distinct.ToLookup(c => c.Week, c => c.UserId);
        var reached = distinct.Count == 0 ? 0 : distinct.Max(c => c.Week);
        var delivered = deliveredProjects.ToHashSet();
        return projectWeeks.Distinct().Where(week => week <= reached).Order()
            .Select(week =>
            {
                var students = didDaily[week].ToList();
                return new DailyToProjectWeekDto(week, students.Count, students.Count(u => delivered.Contains((u, week))));
            })
            .ToList();
    }

    /// <summary>
    /// Parou = nao abre o app ha 7 dias ou mais (sem nenhum dia aberto, conta o dia do cadastro). Agrupado pela ultima
    /// semana do curso com Daily concluida; sem nenhuma, "antes da 1a Daily".
    /// </summary>
    internal static DropoutDto Dropout(
        IReadOnlyList<RetentionStudent> enrolled,
        IEnumerable<(Guid UserId, DateOnly Day)> openDays,
        IEnumerable<(Guid UserId, int Week)> courseCompletions,
        DateOnly today)
    {
        var lastOpen = LastDayByUser(openDays);
        var lastWeek = courseCompletions.GroupBy(c => c.UserId).ToDictionary(g => g.Key, g => g.Max(c => c.Week));

        var stopped = enrolled
            .Where(s => (lastOpen.TryGetValue(s.UserId, out var day) ? day : s.SignupDay) <= today.AddDays(-7))
            .ToList();
        var stoppedWeeks = stopped.Where(s => lastWeek.ContainsKey(s.UserId)).Select(s => lastWeek[s.UserId]).ToList();
        // Da Semana 1 ate a ultima que alguem do curso alcancou, com as zeradas (decisao do dono).
        var reached = lastWeek.Count == 0 ? 0 : lastWeek.Values.Max();
        var byWeek = stopped.Count == 0
            ? new List<DropoutWeekDto>()
            : Enumerable.Range(1, reached).Select(week => new DropoutWeekDto(week, stoppedWeeks.Count(w => w == week))).ToList();

        return new DropoutDto(enrolled.Count - stopped.Count, stopped.Count(s => !lastWeek.ContainsKey(s.UserId)), byWeek);
    }

    /// <summary>Alunos-dia por tela e aparelho a partir de `fromDay`; telas com mais uso primeiro.</summary>
    internal static IReadOnlyList<ScreenDeviceRowDto> ScreensByDevice(IEnumerable<ScreenVisit> visits, DateOnly fromDay) =>
        visits
            .Where(v => v.Day >= fromDay)
            .GroupBy(v => v.Screen)
            .Select(g => new ScreenDeviceRowDto(
                g.Key,
                g.Count(v => v.Device == DeviceClass.Desktop),
                g.Count(v => v.Device == DeviceClass.Mobile),
                g.Count(v => v.Device == DeviceClass.Tablet)))
            .OrderByDescending(r => r.Desktop + r.Mobile + r.Tablet)
            .ThenBy(r => r.Screen)
            .ToList();

    private static Dictionary<Guid, DateOnly> LastDayByUser(IEnumerable<(Guid UserId, DateOnly Day)> days) =>
        days.GroupBy(d => d.UserId).ToDictionary(g => g.Key, g => g.Max(d => d.Day));
}
