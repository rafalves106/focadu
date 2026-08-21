using Focadu.Domain.Enrollments;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class EnrollmentRepository : IEnrollmentRepository
{
    private readonly FocaduDbContext _context;

    public EnrollmentRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Enrollment?> GetByUserAndCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default) =>
        await _context.Enrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId, cancellationToken);

    public async Task<IReadOnlyCollection<Enrollment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.Enrollments.Where(e => e.UserId == userId).ToListAsync(cancellationToken);

    public async Task<IReadOnlyCollection<Enrollment>> GetByCourseIdAsync(Guid courseId, CancellationToken cancellationToken = default) =>
        await _context.Enrollments.Where(e => e.CourseId == courseId).ToListAsync(cancellationToken);

    public async Task AddAsync(Enrollment enrollment, CancellationToken cancellationToken = default) =>
        await _context.Enrollments.AddAsync(enrollment, cancellationToken);
}
