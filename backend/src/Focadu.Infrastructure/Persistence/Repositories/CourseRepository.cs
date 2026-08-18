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

    public async Task<Course?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Courses
            .Include(c => c.Monthlies)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<Course>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _context.Courses
            .Include(c => c.Monthlies)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Course course, CancellationToken cancellationToken = default) =>
        await _context.Courses.AddAsync(course, cancellationToken);
}
