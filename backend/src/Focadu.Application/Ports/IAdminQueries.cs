namespace Focadu.Application.Ports;

/// <summary>
/// Leituras agregadas do Painel de gestao (Fase 94) - consultas so de leitura, sem montar agregado, implementadas
/// direto em SQL/EF na Infrastructure. Nada aqui muda estado.
/// </summary>
public interface IAdminQueries
{
    Task<IReadOnlyList<AdminUserRow>> ListUsersAsync(CancellationToken cancellationToken = default);

    /// <summary>Matriculas com progresso (dias do curso, concluidos, ultima atividade); `userId` nulo = todas.</summary>
    Task<IReadOnlyList<AdminEnrollmentRow>> ListEnrollmentsAsync(Guid? userId, CancellationToken cancellationToken = default);

    /// <summary>Quando cada Daily (nao reforco) foi concluida pela 1a vez, a partir de `fromUtc`.</summary>
    Task<IReadOnlyList<DateTime>> ListCompletionsSinceAsync(DateTime fromUtc, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminCourseRow>> ListCoursesAsync(CancellationToken cancellationToken = default);

    /// <summary>Dias do curso no banco (um por DayNumber, variante padrao), com respostas e alunos com progresso.</summary>
    Task<IReadOnlyList<AdminCourseDayRow>> ListCourseDaysAsync(Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>Alunos com alguma resposta ou conclusao desde `fromUtc` ("ativo" do painel - o app nao guarda login).</summary>
    Task<int> CountActiveUsersSinceAsync(DateTime fromUtc, CancellationToken cancellationToken = default);

    /// <summary>Fase 103: cada Daily (nao reforco) concluida, com aluno, curso e semana do curso.</summary>
    Task<IReadOnlyList<AdminCompletionFact>> ListCompletionFactsAsync(CancellationToken cancellationToken = default);

    /// <summary>Fase 103: semanas que tem Projeto Semanal (enunciado definido), por curso.</summary>
    Task<IReadOnlyList<AdminCourseWeek>> ListProjectWeeksAsync(CancellationToken cancellationToken = default);

    /// <summary>Fase 103: Projetos Semanais entregues (enviados ou ja avaliados), com aluno, curso e semana.</summary>
    Task<IReadOnlyList<AdminProjectFact>> ListDeliveredProjectsAsync(CancellationToken cancellationToken = default);
}

public record AdminCompletionFact(Guid UserId, Guid CourseId, int Week, DateTime CompletedAt);

public record AdminCourseWeek(Guid CourseId, int Week);

public record AdminProjectFact(Guid UserId, Guid CourseId, int Week);

public record AdminUserRow(Guid Id, string DisplayName, string Email, DateTime CreatedAt, DateTime? EmailVerifiedAt, bool IsAdmin, Guid? CohortId = null, DateTime? DisabledAt = null);

public record AdminEnrollmentRow(
    Guid EnrollmentId, Guid UserId, Guid CourseId, string CourseName, DateTime EnrolledAt,
    int TotalDays, int CompletedDays, int? LastCompletedDay, DateTime? LastActivityAt, IReadOnlyList<AdminDayCell> Days);

/// <summary>Um dia da matricula (grade do painel lateral do aluno): semana, numero do dia no curso e se ja concluiu.</summary>
public record AdminDayCell(int Week, int Day, bool Completed);

public record AdminCourseRow(Guid Id, string Name, string Status, bool OnlyForCohorts = false);

public record AdminCourseDayRow(int DayNumber, string? ContentHash, int Responses, int StudentsWithProgress);
