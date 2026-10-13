namespace Focadu.Application.Admin;

// Fase 94, Painel de gestao (abas Visao geral, Alunos, Convites e Curadoria). So o admin recebe isto.

public record AdminCourseProgressDto(
    Guid CourseId, string CourseName, int TotalDays, int CompletedDays, int CurrentDay, DateTime EnrolledAt, DateTime? LastActivityAt,
    IReadOnlyList<Ports.AdminDayCell> Days);

public record AdminStudentDto(
    Guid Id, string DisplayName, string Email, DateTime CreatedAt, bool EmailVerified, bool IsAdmin,
    int CurrentStreak, DateTime? LastActivityAt, string? CurrentCourse, int? CurrentDay,
    IReadOnlyList<AdminCourseProgressDto> Courses, Guid? CohortId = null, string? CohortName = null);

public record AdminCountDto(string Table, int Count);

public record CourseResetPreviewDto(Guid UserId, string DisplayName, string Email, Guid CourseId, string CourseName, IReadOnlyList<AdminCountDto> WillDelete);

public record CourseResetResultDto(Guid UserId, Guid CourseId, IReadOnlyList<AdminCountDto> Deleted);

public record AdminInviteDto(
    string Code, string Note, int MaxUses, int UsedCount, DateTime? ExpiresAt, DateTime? RevokedAt, DateTime CreatedAt, string Status, string Link,
    Guid? CohortId = null, string? CohortName = null);

public record AdminInvitesDto(int MaxUsesLimit, int MaxValidDays, int DefaultValidDays, IReadOnlyList<AdminInviteDto> Invites);

/// <param name="State">"em_dia" (arquivo = banco), "difere" (hash diferente), "so_no_arquivo" (curado, nao importado),
/// "so_no_banco" (dia antigo), "sem_curadoria" (previsto no curso.json, sem arquivo nem banco).</param>
public record CurationDayDto(int Day, int Week, string State, int Responses, int StudentsWithProgress);

/// <param name="OnlyForCohorts">Fase 96: "so pra turmas" (nulo = curso ainda nao esta no banco).</param>
/// <param name="Cohorts">Fase 96: turmas ativas que tem o curso.</param>
public record CurationCourseDto(
    string? Slug, Guid? CourseId, string Name, string? Status, int CuratedDays, int ImportedDays, int StaleDays,
    IReadOnlyList<CurationDayDto> Days, bool? OnlyForCohorts = null, IReadOnlyList<string>? Cohorts = null);

public record ImportDayPreviewDto(int Day, string Status, string Detail, IReadOnlyList<string> Errors);

public record ImportPreviewDto(
    string Slug, string CourseName, bool CanConfirm, IReadOnlyList<ImportDayPreviewDto> Days, int StudentsLosingAnswers);

public record ImportResultDto(string Slug, string CourseName, IReadOnlyList<ImportDayPreviewDto> Days, int DailiesAdded, int DailiesReset);

public record StaleDaysPreviewDto(
    Guid CourseId, string CourseName, IReadOnlyList<int> Days, IReadOnlyList<AdminStudentRefDto> AffectedStudents, IReadOnlyList<AdminCountDto> WillDelete);

public record StaleDaysResultDto(Guid CourseId, string CourseName, IReadOnlyList<int> Days, IReadOnlyList<AdminCountDto> Deleted);

public record AdminStudentRefDto(Guid Id, string DisplayName, string Email);

public record AdminDayCountDto(DateOnly Date, int Count);

public record AdminRecentSignupDto(Guid Id, string DisplayName, string Email, DateTime CreatedAt, IReadOnlyList<string> Courses);

public record AdminOverviewDto(
    int Students, int ActiveStudents7d, int ActiveStudents30d, int SignupsByInvite, int ActiveInvites,
    int CompletedDays30d, IReadOnlyList<AdminDayCountDto> CompletionsByDay, decimal AiCostMonthUsd, decimal? AiMonthlyCapUsd,
    IReadOnlyList<AdminRecentSignupDto> RecentSignups, IReadOnlyList<CurationCourseSummaryDto> Curation);

public record CurationCourseSummaryDto(string Name, int CuratedDays, int ImportedDays, int StaleDays);

// Fase 96, Turmas.

public record AdminCohortCourseDto(Guid Id, string Name);

/// <param name="Status">"ativa" ou "arquivada".</param>
public record AdminCohortDto(
    Guid Id, string Name, IReadOnlyList<AdminCohortCourseDto> Courses, int Students, int ActiveInvites, DateTime CreatedAt,
    DateTime? ArchivedAt, string Status);

public record AdminCohortDetailDto(AdminCohortDto Cohort, IReadOnlyList<AdminInviteDto> Invites, IReadOnlyList<AdminStudentDto> Students);

/// <summary>Curso pra marcar na gaveta de turma: quem ve hoje e em quais turmas ativas ja esta.</summary>
public record AdminCohortCourseOptionDto(Guid Id, string Name, bool OnlyForCohorts, IReadOnlyList<string> Cohorts);

public record AdminCohortsDto(IReadOnlyList<AdminCohortDto> Cohorts, IReadOnlyList<AdminCohortCourseOptionDto> Courses, int StudentsInCohorts);

public record AdminCourseVisibilityDto(Guid CourseId, string Name, bool OnlyForCohorts, IReadOnlyList<string> Cohorts, int CohortStudents);
