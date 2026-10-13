using Focadu.Domain.Courses;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Monta o CourseViewer do usuario logado (Fase 96; substitui o DraftCourseAccess da Fase 81): matriculas, turma e lista de
/// previa. A regra em si mora no dominio (CourseViewer.CanSee). Usado no catalogo, na matricula e nas rotas de leitura do
/// curriculo, da semana-modelo e do conteudo curado - curso que o usuario nao enxerga responde como se nao existisse.
/// </summary>
public class CourseAccess
{
    private readonly IUserRepository _users;
    private readonly ICohortRepository _cohorts;
    private readonly IEnrollmentRepository _enrollments;
    private readonly CoursePreviewOptions _preview;

    public CourseAccess(IUserRepository users, ICohortRepository cohorts, IEnrollmentRepository enrollments, CoursePreviewOptions preview)
    {
        _users = users;
        _cohorts = cohorts;
        _enrollments = enrollments;
        _preview = preview;
    }

    public async Task<CourseViewer> ForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null) return CourseViewer.Anonymous;
        var enrolled = (await _enrollments.GetByUserIdAsync(userId, cancellationToken)).Select(e => e.CourseId).ToHashSet();
        var cohort = user.CohortId is { } cohortId ? await _cohorts.GetByIdAsync(cohortId, cancellationToken) : null;
        return new CourseViewer(user.CohortId is not null, cohort?.CourseIds.ToHashSet() ?? [], enrolled, _preview.CanPreview(user.Email));
    }

    /// <summary>Curso nulo (nao achado) passa: quem chama ja responde 404 por conta propria.</summary>
    public async Task<bool> CanSeeAsync(CourseRef? course, Guid userId, CancellationToken cancellationToken = default) =>
        course is null || (await ForUserAsync(userId, cancellationToken)).CanSee(course);
}
