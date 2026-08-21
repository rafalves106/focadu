using Focadu.Domain.Common;

namespace Focadu.Domain.Enrollments;

/// <summary>
/// Fase 13: matricula de um User num Course - o gatilho que faz `EnrollUserInCourseUseCase`
/// gerar as instâncias (Weekly/Daily/WeeklyProject/ModulePublication) a partir do template do
/// Course. Sem invariante de negócio própria além de existir - unicidade (1 User não pode
/// matricular 2x no mesmo Course) é responsabilidade da Application (consulta ao repositório
/// antes de criar, mesmo padrão de RegisterUserUseCase/email único).
/// </summary>
public class Enrollment : Entity
{
    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public DateTime EnrolledAt { get; private set; }

    private Enrollment()
    {
    }

    public Enrollment(Guid userId, Guid courseId)
    {
        UserId = userId;
        CourseId = courseId;
        EnrolledAt = DateTime.UtcNow;
    }
}
