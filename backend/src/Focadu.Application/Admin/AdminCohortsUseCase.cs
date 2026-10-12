using Focadu.Application.Enrollments;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Application.Users;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Admin;

/// <summary>
/// Aba Turmas do Painel de gestao (Fase 96, Figma "Turmas — v1", TU 01-08 e TU 20-21): listar, criar, editar e arquivar
/// turmas, e o "quem ve o curso" (visivel pra todos / so pra turmas) da aba Curadoria. Curso que entra numa turma matricula
/// na hora os alunos dela; curso que sai deixa as matriculas como estao. Arquivar revoga os convites ativos da turma.
/// </summary>
public class AdminCohortsUseCase
{
    private readonly ICohortRepository _cohorts;
    private readonly ISignupInviteRepository _invites;
    private readonly ICourseRepository _courses;
    private readonly IAdminQueries _queries;
    private readonly AdminStudentsUseCase _students;
    private readonly CohortEnrollment _cohortEnrollment;
    private readonly IUnitOfWork _unitOfWork;

    public AdminCohortsUseCase(
        ICohortRepository cohorts, ISignupInviteRepository invites, ICourseRepository courses, IAdminQueries queries,
        AdminStudentsUseCase students, CohortEnrollment cohortEnrollment, IUnitOfWork unitOfWork)
    {
        _cohorts = cohorts;
        _invites = invites;
        _courses = courses;
        _queries = queries;
        _students = students;
        _cohortEnrollment = cohortEnrollment;
        _unitOfWork = unitOfWork;
    }

    public async Task<AdminCohortsDto> ListAsync(CancellationToken cancellationToken = default)
    {
        var cohorts = await _cohorts.ListAsync(cancellationToken);
        var courses = await _queries.ListCoursesAsync(cancellationToken);
        var users = await _queries.ListUsersAsync(cancellationToken);
        var invites = await _invites.ListAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var dtos = cohorts
            .Select(c => ToDto(c, courses, users, invites, now))
            .OrderBy(c => c.ArchivedAt is null ? 0 : 1).ThenByDescending(c => c.CreatedAt)
            .ToList();
        var options = courses
            .Select(c => new AdminCohortCourseOptionDto(c.Id, c.Name, c.OnlyForCohorts, ActiveCohortNames(cohorts, c.Id)))
            .ToList();
        return new AdminCohortsDto(dtos, options, users.Count(u => u.CohortId is not null));
    }

    public async Task<AdminCohortDetailDto> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cohort = await FindAsync(id, cancellationToken);
        var courses = await _queries.ListCoursesAsync(cancellationToken);
        var users = await _queries.ListUsersAsync(cancellationToken);
        var invites = await _invites.ListAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var students = (await _students.ListAsync(cancellationToken)).Where(s => s.CohortId == id).ToList();
        var cohortInvites = invites.Where(i => i.CohortId == id)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => AdminInvitesUseCase.ToDto(i, now, cohort.Name))
            .ToList();
        return new AdminCohortDetailDto(ToDto(cohort, courses, users, invites, now), cohortInvites, students);
    }

    public async Task<AdminCohortDetailDto> CreateAsync(string? name, IReadOnlyList<Guid>? courseIds, CancellationToken cancellationToken = default)
    {
        await EnsureCoursesExistAsync(courseIds, cancellationToken);
        var cohort = Cohort.Create(name, courseIds);
        await _cohorts.AddAsync(cohort, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(cohort.Id, cancellationToken);
    }

    /// <summary>Curso novo na turma: todos os alunos dela sao matriculados nele agora.</summary>
    public async Task<AdminCohortDetailDto> UpdateAsync(Guid id, string? name, IReadOnlyList<Guid>? courseIds, CancellationToken cancellationToken = default)
    {
        var cohort = await FindAsync(id, cancellationToken);
        await EnsureCoursesExistAsync(courseIds, cancellationToken);
        var added = cohort.Update(name, courseIds);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (added.Count > 0)
            foreach (var user in (await _queries.ListUsersAsync(cancellationToken)).Where(u => u.CohortId == id))
                await _cohortEnrollment.EnrollAsync(user.Id, added, cancellationToken);

        return await GetAsync(id, cancellationToken);
    }

    /// <summary>Alunos ficam como estao (matricula, progresso, so os cursos da turma); os convites ativos param na hora.</summary>
    public async Task<AdminCohortDetailDto> ArchiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cohort = await FindAsync(id, cancellationToken);
        var now = DateTime.UtcNow;
        cohort.Archive(now);
        foreach (var invite in (await _invites.ListAsync(cancellationToken)).Where(i => i.CohortId == id && i.StatusAt(now) == "ativo"))
            invite.Revoke(now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    /// <summary>Aba Curadoria (TU 20-21): "Visivel pra todos" ou "So pra turmas".</summary>
    public async Task<AdminCourseVisibilityDto> SetCourseVisibilityAsync(Guid courseId, bool onlyForCohorts, CancellationToken cancellationToken = default)
    {
        var course = await _courses.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");
        course.SetOnlyForCohorts(onlyForCohorts);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var cohorts = await _cohorts.ListAsync(cancellationToken);
        var inCohorts = cohorts.Where(c => !c.IsArchived && c.HasCourse(courseId)).Select(c => c.Id).ToHashSet();
        var students = (await _queries.ListUsersAsync(cancellationToken)).Count(u => u.CohortId is { } cid && inCohorts.Contains(cid));
        return new AdminCourseVisibilityDto(course.Id, course.Name, course.OnlyForCohorts, ActiveCohortNames(cohorts, courseId), students);
    }

    internal static IReadOnlyList<string> ActiveCohortNames(IEnumerable<Cohort> cohorts, Guid courseId) =>
        cohorts.Where(c => !c.IsArchived && c.HasCourse(courseId)).OrderBy(c => c.Name).Select(c => c.Name).ToList();

    private async Task<Cohort> FindAsync(Guid id, CancellationToken cancellationToken) =>
        await _cohorts.GetByIdAsync(id, cancellationToken)
        ?? throw new NotFoundException("turma_nao_encontrada", "Turma nao encontrada.");

    private async Task EnsureCoursesExistAsync(IReadOnlyList<Guid>? courseIds, CancellationToken cancellationToken)
    {
        var known = (await _queries.ListCoursesAsync(cancellationToken)).Select(c => c.Id).ToHashSet();
        if ((courseIds ?? []).Any(id => !known.Contains(id)))
            throw new ValidationException("curso_invalido", "Algum curso marcado nao existe mais. Recarregue a pagina.");
    }

    private static AdminCohortDto ToDto(
        Cohort cohort, IReadOnlyList<AdminCourseRow> courses, IReadOnlyList<AdminUserRow> users, IReadOnlyList<SignupInvite> invites, DateTime now) =>
        new(cohort.Id, cohort.Name,
            cohort.CourseIds
                .Select(id => courses.FirstOrDefault(c => c.Id == id))
                .OfType<AdminCourseRow>()
                .Select(c => new AdminCohortCourseDto(c.Id, c.Name))
                .ToList(),
            users.Count(u => u.CohortId == cohort.Id),
            invites.Count(i => i.CohortId == cohort.Id && i.StatusAt(now) == "ativo"),
            cohort.CreatedAt, cohort.ArchivedAt, cohort.IsArchived ? "arquivada" : "ativa");
}
