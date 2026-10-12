using Focadu.Domain.Enums;

namespace Focadu.Domain.Courses;

/// <summary>O minimo de um curso pra decidir quem o enxerga (Fase 96).</summary>
public record CourseRef(Guid Id, CourseStatus Status, bool OnlyForCohorts)
{
    public static CourseRef From(Course course) => new(course.Id, course.Status, course.OnlyForCohorts);
}

/// <summary>
/// Quem esta olhando o catalogo (Fase 96) e a regra unica de "esse curso aparece pra ele", usada no catalogo, na matricula
/// e nas rotas de leitura de curriculo e conteudo (antes era so a regra do rascunho, Fase 81):
/// <list type="bullet">
/// <item>matriculado sempre ve o curso;</item>
/// <item>aluno de turma ve so os cursos da turma (inclusive em rascunho ou "so pra turmas"), mesmo com a turma arquivada;</item>
/// <item>quem esta na lista de previa (CoursePreview:Emails) ve tudo;</item>
/// <item>o resto ve o que nao e rascunho nem "so pra turmas".</item>
/// </list>
/// Arquivado continua aparecendo nas rotas de leitura (como antes); a matricula e o catalogo recusam por conta propria.
/// </summary>
public record CourseViewer(bool InCohort, IReadOnlySet<Guid> CohortCourseIds, IReadOnlySet<Guid> EnrolledCourseIds, bool CanPreview)
{
    public static readonly CourseViewer Anonymous = new(false, new HashSet<Guid>(), new HashSet<Guid>(), false);

    public bool CanSee(CourseRef course)
    {
        if (EnrolledCourseIds.Contains(course.Id)) return true;
        if (InCohort) return CohortCourseIds.Contains(course.Id);
        if (CanPreview) return true;
        return course.Status != CourseStatus.Draft && !course.OnlyForCohorts;
    }

    /// <summary>Pode se matricular: enxerga e o curso nao esta arquivado.</summary>
    public bool CanEnroll(CourseRef course) => course.Status != CourseStatus.Archived && CanSee(course);
}
