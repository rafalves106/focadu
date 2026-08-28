using Focadu.Domain.Courses;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class CourseRepository : ICourseRepository
{
    private readonly FocaduDbContext _context;

    public CourseRepository(FocaduDbContext context)
    {
        _context = context;
    }

    // Fase 13: inclui WeeklyTemplates (estrutural - Number/Title/Theme) junto de Monthlies -
    // GetCourseDetailUseCase/GetAvailableCoursesUseCase precisam disso pra listar semanas/contar
    // duracao, mas nunca precisam descer ate DailyTemplate/DailyActivity (isso so
    // GetFullTemplateGraphAsync traz, ver abaixo).
    public async Task<Course?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Courses
            .Include(c => c.Monthlies).ThenInclude(m => m.WeeklyTemplates)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<Course?> GetFullTemplateGraphAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Courses
            .Include(c => c.Monthlies).ThenInclude(m => m.WeeklyTemplates).ThenInclude(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.QuizOptions)
            .Include(c => c.Monthlies).ThenInclude(m => m.WeeklyTemplates).ThenInclude(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.WordMatchPairs)
            .Include(c => c.Monthlies).ThenInclude(m => m.WeeklyTemplates).ThenInclude(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.RoleplayNodes).ThenInclude(n => n.Options)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<Course>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _context.Courses
            .Include(c => c.Monthlies).ThenInclude(m => m.WeeklyTemplates)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Course course, CancellationToken cancellationToken = default) =>
        await _context.Courses.AddAsync(course, cancellationToken);
}
