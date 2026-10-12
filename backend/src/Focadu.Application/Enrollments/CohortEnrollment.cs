using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Matricula um aluno de turma nos cursos dela (Fase 96): no cadastro com convite de turma e quando o admin poe um curso
/// novo na turma (todos os alunos dela entram na hora). Curso em que ja esta matriculado e pulado; curso arquivado ou
/// apagado tambem (a matricula responde 404), sem derrubar o resto. Cada matricula salva sozinha.
/// </summary>
public class CohortEnrollment
{
    private readonly EnrollUserInCourseUseCase _enroll;
    private readonly IEnrollmentRepository _enrollments;

    public CohortEnrollment(EnrollUserInCourseUseCase enroll, IEnrollmentRepository enrollments)
    {
        _enroll = enroll;
        _enrollments = enrollments;
    }

    /// <summary>Devolve quantas matriculas novas foram feitas.</summary>
    public async Task<int> EnrollAsync(Guid userId, IEnumerable<Guid> courseIds, CancellationToken cancellationToken = default)
    {
        var created = 0;
        foreach (var courseId in courseIds)
        {
            if (await _enrollments.GetByUserAndCourseAsync(userId, courseId, cancellationToken) is not null) continue;
            try
            {
                await _enroll.ExecuteAsync(userId, courseId, cancellationToken);
                created++;
            }
            catch (Exception ex) when (ex is NotFoundException or ConflictException)
            {
                // Curso arquivado/apagado, ou outra chamada matriculou no meio: segue pros outros cursos.
            }
        }
        return created;
    }
}
