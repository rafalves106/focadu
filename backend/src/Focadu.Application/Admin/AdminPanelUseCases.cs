using Focadu.Application.Enrollments;
using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ports;
using Focadu.Application.Seed;
using Focadu.Application.Users;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Admin;

/// <summary>Aba Alunos (Fase 94): lista, detalhe e resetar o progresso de um curso do aluno.</summary>
public class AdminStudentsUseCase
{
    private readonly IAdminQueries _queries;
    private readonly IAdminMaintenance _maintenance;
    private readonly IUserStreakRepository _streakRepository;
    private readonly StreakPauseWindows _pauseWindows;
    private readonly EnrollUserInCourseUseCase _enroll;
    private readonly IClock _clock;
    private readonly ICohortRepository _cohorts;

    public AdminStudentsUseCase(
        IAdminQueries queries, IAdminMaintenance maintenance, IUserStreakRepository streakRepository,
        StreakPauseWindows pauseWindows, EnrollUserInCourseUseCase enroll, IClock clock, ICohortRepository cohorts)
    {
        _cohorts = cohorts;
        _queries = queries;
        _maintenance = maintenance;
        _streakRepository = streakRepository;
        _pauseWindows = pauseWindows;
        _enroll = enroll;
        _clock = clock;
    }

    public async Task<IReadOnlyList<AdminStudentDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var users = await _queries.ListUsersAsync(cancellationToken);
        var enrollments = (await _queries.ListEnrollmentsAsync(null, cancellationToken)).ToLookup(e => e.UserId);
        var cohorts = (await _cohorts.ListAsync(cancellationToken)).ToDictionary(c => c.Id, c => c.Name);
        var result = new List<AdminStudentDto>();
        foreach (var user in users)
            result.Add(await ToDtoAsync(user, enrollments[user.Id].ToList(), cohorts, cancellationToken));
        return result.OrderByDescending(s => s.LastActivityAt ?? s.CreatedAt).ToList();
    }

    public async Task<AdminStudentDto> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = (await _queries.ListUsersAsync(cancellationToken)).FirstOrDefault(u => u.Id == userId)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Aluno nao encontrado.");
        var cohorts = (await _cohorts.ListAsync(cancellationToken)).ToDictionary(c => c.Id, c => c.Name);
        return await ToDtoAsync(user, await _queries.ListEnrollmentsAsync(userId, cancellationToken), cohorts, cancellationToken);
    }

    public async Task<CourseResetPreviewDto> PreviewResetAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var (user, course) = await FindEnrollmentAsync(userId, courseId, cancellationToken);
        var counts = await _maintenance.PlanCourseResetAsync(userId, courseId, cancellationToken);
        return new CourseResetPreviewDto(user.Id, user.DisplayName, user.Email, courseId, course.CourseName, ToCounts(counts));
    }

    /// <summary>
    /// Apaga a matricula do aluno no curso e matricula de novo, numa transacao so: o aluno recomeca do Dia 1. Gems,
    /// sequencia (sao da conta, nao do curso) e a medicao de IA ficam. `confirmation` tem que ser o e-mail do aluno.
    /// </summary>
    public async Task<CourseResetResultDto> ResetAsync(Guid userId, Guid courseId, string? confirmation, CancellationToken cancellationToken = default)
    {
        var (user, _) = await FindEnrollmentAsync(userId, courseId, cancellationToken);
        if (!AdminConfirmation.Matches(confirmation, user.Email))
            throw new ValidationException("confirmacao_invalida", "Digite o e-mail do aluno exatamente como aparece pra confirmar.");

        var counts = await _maintenance.ResetCourseAsync(userId, courseId, ct => _enroll.ExecuteAsync(userId, courseId, ct), cancellationToken);
        return new CourseResetResultDto(userId, courseId, ToCounts(counts));
    }

    private async Task<(AdminUserRow User, AdminEnrollmentRow Course)> FindEnrollmentAsync(Guid userId, Guid courseId, CancellationToken cancellationToken)
    {
        var user = (await _queries.ListUsersAsync(cancellationToken)).FirstOrDefault(u => u.Id == userId)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Aluno nao encontrado.");
        var course = (await _queries.ListEnrollmentsAsync(userId, cancellationToken)).FirstOrDefault(e => e.CourseId == courseId)
            ?? throw new NotFoundException("matricula_nao_encontrada", "O aluno nao esta matriculado nesse curso.");
        return (user, course);
    }

    private async Task<AdminStudentDto> ToDtoAsync(
        AdminUserRow user, IReadOnlyList<AdminEnrollmentRow> enrollments, IReadOnlyDictionary<Guid, string> cohorts, CancellationToken cancellationToken)
    {
        var courses = enrollments
            .Select(e => new AdminCourseProgressDto(
                e.CourseId, e.CourseName, e.TotalDays, e.CompletedDays,
                Math.Max(1, Math.Min(e.TotalDays, (e.LastCompletedDay ?? 0) + 1)), e.EnrolledAt, e.LastActivityAt, e.Days))
            .OrderByDescending(c => c.LastActivityAt ?? c.EnrolledAt)
            .ToList();
        var current = courses.FirstOrDefault();

        // Leitura so: CurrentStreakAsOf pode marcar a quebra na entidade, mas nada aqui chama SaveChanges.
        var streak = await _streakRepository.GetByUserIdAsync(user.Id, cancellationToken);
        var currentStreak = streak is null ? 0 : streak.CurrentStreakAsOf(_clock.Today(), await _pauseWindows.ForUserAsync(user.Id, cancellationToken));

        return new AdminStudentDto(
            user.Id, user.DisplayName, user.Email, user.CreatedAt, user.EmailVerifiedAt is not null, user.IsAdmin,
            currentStreak, courses.Max(c => c.LastActivityAt), current?.CourseName, current?.CurrentDay, courses,
            user.CohortId, user.CohortId is { } cohortId ? cohorts.GetValueOrDefault(cohortId) : null);
    }

    internal static IReadOnlyList<AdminCountDto> ToCounts(IEnumerable<KeyValuePair<string, int>> counts) =>
        counts.Select(c => new AdminCountDto(c.Key, c.Value)).ToList();
}

/// <summary>Aba Convites (Fase 94) - mesmo caso de uso do comando `convite`, com os mesmos limites.</summary>
public class AdminInvitesUseCase
{
    private readonly SignupInviteAdminUseCase _invites;
    private readonly ICohortRepository _cohorts;

    public AdminInvitesUseCase(SignupInviteAdminUseCase invites, ICohortRepository cohorts)
    {
        _invites = invites;
        _cohorts = cohorts;
    }

    public async Task<AdminInvitesDto> ListAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var cohorts = await CohortNamesAsync(cancellationToken);
        var invites = (await _invites.ListAsync(cancellationToken)).OrderByDescending(i => i.CreatedAt)
            .Select(i => ToDto(i, now, NameOf(cohorts, i.CohortId))).ToList();
        return new AdminInvitesDto(SignupInvite.MaxUsesLimit, SignupInvite.MaxValidDays, SignupInviteAdminUseCase.DefaultValidDays, invites);
    }

    /// <summary>Fase 96: `cohortId` = convite de turma (turma arquivada nao aceita convite novo).</summary>
    public async Task<AdminInviteDto> CreateAsync(string? note, int? maxUses, int? validDays, Guid? cohortId = null, CancellationToken cancellationToken = default)
    {
        string? cohortName = null;
        if (cohortId is { } id)
        {
            var cohort = await _cohorts.GetByIdAsync(id, cancellationToken);
            if (cohort is null || cohort.IsArchived)
                throw new ValidationException("turma_invalida", "Essa turma nao existe ou foi arquivada.");
            cohortName = cohort.Name;
        }
        return ToDto(await _invites.CreateAsync(note ?? string.Empty, maxUses ?? 1, validDays, cancellationToken, cohortId), DateTime.UtcNow, cohortName);
    }

    public async Task<AdminInviteDto> RevokeAsync(string code, CancellationToken cancellationToken = default)
    {
        var invite = await _invites.RevokeAsync(code, cancellationToken);
        return ToDto(invite, DateTime.UtcNow, NameOf(await CohortNamesAsync(cancellationToken), invite.CohortId));
    }

    private async Task<Dictionary<Guid, string>> CohortNamesAsync(CancellationToken cancellationToken) =>
        (await _cohorts.ListAsync(cancellationToken)).ToDictionary(c => c.Id, c => c.Name);

    private static string? NameOf(Dictionary<Guid, string> cohorts, Guid? id) => id is { } value ? cohorts.GetValueOrDefault(value) : null;

    /// <summary>Link relativo: o front completa com a propria origem (o painel roda no mesmo dominio do cadastro).</summary>
    internal static AdminInviteDto ToDto(SignupInvite i, DateTime now, string? cohortName) =>
        new(i.Code, i.Note, i.MaxUses, i.UsedCount, i.ExpiresAt, i.RevokedAt, i.CreatedAt, i.StatusAt(now), $"/login?convite={i.Code}",
            i.CohortId, cohortName);
}

/// <summary>
/// Aba Curadoria (Fase 94): grade de dias por curso (arquivo em conteudo/ x banco), importar em lote e apagar os dias
/// antigos. Importar e tudo ou nada: se algum dia marcado nao passa (linter, molde, arquivo), nenhum entra.
/// </summary>
public class AdminCurationUseCase
{
    private readonly IAdminQueries _queries;
    private readonly IAdminMaintenance _maintenance;
    private readonly ImportCuratedDaysUseCase _import;
    private readonly ICohortRepository _cohorts;

    public AdminCurationUseCase(IAdminQueries queries, IAdminMaintenance maintenance, ImportCuratedDaysUseCase import, ICohortRepository cohorts)
    {
        _cohorts = cohorts;
        _queries = queries;
        _maintenance = maintenance;
        _import = import;
    }

    public async Task<IReadOnlyList<CurationCourseDto>> GridAsync(CancellationToken cancellationToken = default)
    {
        var dbCourses = await _queries.ListCoursesAsync(cancellationToken);
        var cohorts = await _cohorts.ListAsync(cancellationToken);
        var result = new List<CurationCourseDto>();
        var seen = new HashSet<Guid>();

        foreach (var (slug, manifest) in CuratedManifests.All())
        {
            var course = dbCourses.FirstOrDefault(c => c.Name == manifest.Name);
            if (course is not null) seen.Add(course.Id);
            var dbDays = course is null ? [] : await _queries.ListCourseDaysAsync(course.Id, cancellationToken);
            result.Add(BuildCourse(slug, course, manifest.Name, CuratedManifests.Days(slug, manifest), dbDays));
        }

        // Curso no banco sem pasta em conteudo/: todos os dias dele sao antigos.
        foreach (var course in dbCourses.Where(c => !seen.Contains(c.Id)))
            result.Add(BuildCourse(null, course, course.Name, [], await _queries.ListCourseDaysAsync(course.Id, cancellationToken)));

        // Fase 96: quem ve o curso (aba Curadoria, TU 20).
        return result.Select(c => c.CourseId is not { } id ? c : c with
        {
            OnlyForCohorts = dbCourses.First(d => d.Id == id).OnlyForCohorts,
            Cohorts = AdminCohortsUseCase.ActiveCohortNames(cohorts, id),
        }).ToList();
    }

    public async Task<ImportPreviewDto> PreviewImportAsync(string slug, IReadOnlyList<int>? days, CancellationToken cancellationToken = default)
    {
        var (manifest, selected) = Select(slug, days);
        var outcomes = new List<ImportDayPreviewDto>();
        foreach (var day in selected)
        {
            var report = await _import.ExecuteAsync(slug, new ImportOptions(Day: day, DryRun: true, Confirm: true), cancellationToken);
            outcomes.AddRange(report.Days.Select(ToDto));
        }

        var course = (await _queries.ListCoursesAsync(cancellationToken)).FirstOrDefault(c => c.Name == manifest.Name);
        var students = course is null ? 0 : (await _queries.ListCourseDaysAsync(course.Id, cancellationToken))
            .Where(d => selected.Contains(d.DayNumber) && outcomes.Any(o => o.Day == d.DayNumber && o.Status == "Updated"))
            .Sum(d => d.StudentsWithProgress);

        return new ImportPreviewDto(slug, manifest.Name, CanConfirm(outcomes), outcomes, students);
    }

    public async Task<ImportResultDto> ImportAsync(string slug, IReadOnlyList<int>? days, CancellationToken cancellationToken = default)
    {
        var preview = await PreviewImportAsync(slug, days, cancellationToken);
        if (!preview.CanConfirm)
            throw new ConflictException("importacao_recusada", "Algum dia marcado nao passou na previa. Nada foi importado.");

        var (_, selected) = Select(slug, days);
        return await _maintenance.InTransactionAsync(async ct =>
        {
            var outcomes = new List<ImportDayPreviewDto>();
            int added = 0, reset = 0;
            foreach (var day in selected)
            {
                var report = await _import.ExecuteAsync(slug, new ImportOptions(Day: day, Confirm: true), ct);
                if (report.Days.Any(d => d.Status is ImportStatus.Rejected or ImportStatus.NeedsConfirmation or ImportStatus.NoFile))
                    throw new ConflictException("importacao_recusada", $"O dia {day} mudou entre a previa e a importacao. Nada foi importado.");
                outcomes.AddRange(report.Days.Select(ToDto));
                added += report.DailiesAdded;
                reset += report.DailiesReset;
            }
            return new ImportResultDto(slug, preview.CourseName, outcomes, added, reset);
        }, cancellationToken);
    }

    public async Task<StaleDaysPreviewDto> PreviewStaleDaysAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var (course, curated) = await CuratedDaysOfAsync(courseId, cancellationToken);
        var plan = await _maintenance.PlanStaleDaysAsync(courseId, curated, cancellationToken);
        return new StaleDaysPreviewDto(courseId, course.Name, plan.Days,
            plan.AffectedUsers.Select(u => new AdminStudentRefDto(u.Id, u.DisplayName, u.Email)).ToList(), AdminStudentsUseCase.ToCounts(plan.Counts));
    }

    /// <summary>`confirmation` tem que ser o nome do curso. Sem dia antigo, nao faz nada.</summary>
    public async Task<StaleDaysResultDto> DeleteStaleDaysAsync(Guid courseId, string? confirmation, CancellationToken cancellationToken = default)
    {
        var (course, curated) = await CuratedDaysOfAsync(courseId, cancellationToken);
        if (!AdminConfirmation.Matches(confirmation, course.Name))
            throw new ValidationException("confirmacao_invalida", "Digite o nome do curso exatamente como aparece pra confirmar.");

        var plan = await _maintenance.DeleteStaleDaysAsync(courseId, curated, cancellationToken);
        return new StaleDaysResultDto(courseId, course.Name, plan.Days, AdminStudentsUseCase.ToCounts(plan.Counts));
    }

    private async Task<(AdminCourseRow Course, IReadOnlySet<int> Curated)> CuratedDaysOfAsync(Guid courseId, CancellationToken cancellationToken)
    {
        var course = (await _queries.ListCoursesAsync(cancellationToken)).FirstOrDefault(c => c.Id == courseId)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");
        var entry = CuratedManifests.All().FirstOrDefault(m => m.Manifest.Name == course.Name);
        IReadOnlySet<int> curated = entry.Manifest is null
            ? new HashSet<int>()
            : CuratedManifests.Days(entry.Slug, entry.Manifest).Where(d => d.HasFile).Select(d => d.Day).ToHashSet();
        return (course, curated);
    }

    private static (CourseManifest Manifest, List<int> Days) Select(string slug, IReadOnlyList<int>? days)
    {
        var manifest = CuratedManifests.All().FirstOrDefault(m => m.Slug == slug).Manifest
            ?? throw new NotFoundException("curso_nao_encontrado", $"Nao existe conteudo/{slug}/curso.json.");
        var selected = (days ?? []).Distinct().OrderBy(d => d).ToList();
        if (selected.Count == 0)
            throw new ValidationException("dias_obrigatorios", "Marque ao menos um dia pra importar.");
        return (manifest, selected);
    }

    internal static bool CanConfirm(IReadOnlyList<ImportDayPreviewDto> outcomes) =>
        outcomes.Count > 0 && outcomes.All(o => o.Status is "Created" or "Updated" or "Unchanged")
        && outcomes.Any(o => o.Status is "Created" or "Updated");

    private static ImportDayPreviewDto ToDto(DayOutcome o) => new(o.DayNumber, o.Status.ToString(), o.Detail, o.Errors ?? []);

    internal static CurationCourseDto BuildCourse(
        string? slug, AdminCourseRow? course, string name, IReadOnlyList<(int Day, int Week, bool HasFile, string? Hash)> files,
        IReadOnlyList<AdminCourseDayRow> dbDays)
    {
        var byDay = dbDays.ToDictionary(d => d.DayNumber);
        var days = new List<CurationDayDto>();
        foreach (var file in files)
        {
            byDay.TryGetValue(file.Day, out var db);
            var state = (file.HasFile, db) switch
            {
                (false, null) => "sem_curadoria",
                (true, null) => "so_no_arquivo",
                (false, not null) => "so_no_banco",
                (true, not null) => db.ContentHash == file.Hash ? "em_dia" : "difere",
            };
            days.Add(new CurationDayDto(file.Day, file.Week, state, db?.Responses ?? 0, db?.StudentsWithProgress ?? 0));
        }

        // Dia no banco que nem esta no curso.json (ou curso sem pasta): antigo.
        var listed = files.Select(f => f.Day).ToHashSet();
        days.AddRange(dbDays.Where(d => !listed.Contains(d.DayNumber))
            .Select(d => new CurationDayDto(d.DayNumber, 0, "so_no_banco", d.Responses, d.StudentsWithProgress)));
        days = days.OrderBy(d => d.Day).ToList();

        return new CurationCourseDto(
            slug, course?.Id, name, course?.Status, files.Count(f => f.HasFile), dbDays.Count,
            days.Count(d => d.State == "so_no_banco"), days);
    }
}

/// <summary>Visao geral do Painel (Fase 94).</summary>
public class AdminOverviewUseCase
{
    private readonly IAdminQueries _queries;
    private readonly SignupInviteAdminUseCase _invites;
    private readonly AiUsageReportUseCase _aiUsage;
    private readonly AdminCurationUseCase _curation;
    private readonly IClock _clock;

    public AdminOverviewUseCase(
        IAdminQueries queries, SignupInviteAdminUseCase invites, AiUsageReportUseCase aiUsage, AdminCurationUseCase curation, IClock clock)
    {
        _queries = queries;
        _invites = invites;
        _aiUsage = aiUsage;
        _curation = curation;
        _clock = clock;
    }

    public async Task<AdminOverviewDto> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var today = _clock.Today();
        DateTime LocalMidnightUtc(DateOnly day) => day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Local).ToUniversalTime();

        var users = (await _queries.ListUsersAsync(cancellationToken)).Where(u => !u.IsAdmin).ToList();
        var enrollments = (await _queries.ListEnrollmentsAsync(null, cancellationToken)).ToLookup(e => e.UserId);
        var invites = await _invites.ListAsync(cancellationToken);
        var completions = await _queries.ListCompletionsSinceAsync(LocalMidnightUtc(today.AddDays(-29)), cancellationToken);
        var ai = await _aiUsage.OverviewAsync("mes", null, cancellationToken);
        var curation = await _curation.GridAsync(cancellationToken);

        var byDay = Enumerable.Range(0, 14).Select(i => today.AddDays(i - 13))
            .Select(day => new AdminDayCountDto(day, completions.Count(c => DateOnly.FromDateTime(c.ToLocalTime()) == day)))
            .ToList();

        return new AdminOverviewDto(
            users.Count,
            await _queries.CountActiveUsersSinceAsync(LocalMidnightUtc(today.AddDays(-6)), cancellationToken),
            await _queries.CountActiveUsersSinceAsync(LocalMidnightUtc(today.AddDays(-29)), cancellationToken),
            invites.Sum(i => i.UsedCount),
            invites.Count(i => i.StatusAt(DateTime.UtcNow) == "ativo"),
            completions.Count, byDay, ai.MonthlyCap.MonthCostUsd, ai.MonthlyCap.CapUsd,
            users.OrderByDescending(u => u.CreatedAt).Take(5)
                .Select(u => new AdminRecentSignupDto(u.Id, u.DisplayName, u.Email, u.CreatedAt, enrollments[u.Id].Select(e => e.CourseName).ToList()))
                .ToList(),
            curation.Where(c => c.Slug is not null || c.StaleDays > 0)
                .Select(c => new CurationCourseSummaryDto(c.Name, c.CuratedDays, c.ImportedDays, c.StaleDays)).ToList());
    }
}

/// <summary>Confirmacao digitada das acoes destrutivas: compara sem diferenciar maiusculas e ignorando espacos nas pontas.</summary>
internal static class AdminConfirmation
{
    internal static bool Matches(string? typed, string expected) =>
        !string.IsNullOrWhiteSpace(typed) && string.Equals(typed.Trim(), expected.Trim(), StringComparison.OrdinalIgnoreCase);
}

/// <summary>Os curso.json de conteudo/ e, por dia, se o arquivo existe e o hash dele (o mesmo que o importador grava).</summary>
internal static class CuratedManifests
{
    internal static IReadOnlyList<(string Slug, CourseManifest Manifest)> All()
    {
        var root = CuratedContentLocator.SecretRoot();
        var dir = root is null ? null : Path.Combine(root, "conteudo");
        if (dir is null || !Directory.Exists(dir)) return [];

        var result = new List<(string, CourseManifest)>();
        foreach (var courseDir in Directory.GetDirectories(dir).OrderBy(d => d))
        {
            var manifestPath = Path.Combine(courseDir, "curso.json");
            if (!File.Exists(manifestPath)) continue;
            try
            {
                result.Add((Path.GetFileName(courseDir), CuratedCourseImporter.ParseManifest(File.ReadAllText(manifestPath))));
            }
            catch (Exception ex) when (ex is global::System.Text.Json.JsonException or InvalidOperationException)
            {
                // curso.json quebrado nao derruba a grade inteira - o importador acusa quando tentarem importar.
            }
        }
        return result;
    }

    internal static IReadOnlyList<(int Day, int Week, bool HasFile, string? Hash)> Days(string slug, CourseManifest manifest) =>
        manifest.Modules.SelectMany(m => m.Weeks).SelectMany(w => w.Days.Select(day =>
        {
            var path = CuratedContentLocator.Resolve(slug, $"semana-{w.Number}", $"dia-{day}.json", required: false);
            return (day, w.Number, path is not null, path is null ? null : CuratedDayImporter.ComputeHash(File.ReadAllText(path)));
        })).OrderBy(d => d.day).ToList();
}
