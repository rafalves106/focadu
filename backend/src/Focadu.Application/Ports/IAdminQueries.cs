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
}

public record AdminUserRow(Guid Id, string DisplayName, string Email, DateTime CreatedAt, DateTime? EmailVerifiedAt, bool IsAdmin);

public record AdminEnrollmentRow(
    Guid EnrollmentId, Guid UserId, Guid CourseId, string CourseName, DateTime EnrolledAt,
    int TotalDays, int CompletedDays, int? LastCompletedDay, DateTime? LastActivityAt, IReadOnlyList<AdminDayCell> Days);

/// <summary>Um dia da matricula (grade do painel lateral do aluno): semana, numero do dia no curso e se ja concluiu.</summary>
public record AdminDayCell(int Week, int Day, bool Completed);

public record AdminCourseRow(Guid Id, string Name, string Status);

public record AdminCourseDayRow(int DayNumber, string? ContentHash, int Responses, int StudentsWithProgress);
