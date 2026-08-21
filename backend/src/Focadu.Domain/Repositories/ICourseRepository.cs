using Focadu.Domain.Courses;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate Course.</summary>
public interface ICourseRepository
{
    Task<Course?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fase 13: mesmo Course, mas com o grafo TEMPLATE completo (Monthlies.WeeklyTemplates.
    /// DailyTemplates.Activities.QuizOptions/RoleplayNodes) - separado de GetByIdAsync (raso, so
    /// Monthlies) porque so EnrollUserInCourseUseCase precisa da arvore inteira; carregar isso em
    /// toda leitura simples (ex: ListCoursesUseCase) seria trabalho desperdicado.
    /// </summary>
    Task<Course?> GetFullTemplateGraphAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Course>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Course course, CancellationToken cancellationToken = default);
}
