using Focadu.Domain.Enrollments;
using Xunit;

namespace Focadu.Tests.Enrollments;

public class EnrollmentTests
{
    [Fact]
    public void Create_SetsUserCourseAndEnrolledAt()
    {
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var enrollment = new Enrollment(userId, courseId);

        Assert.Equal(userId, enrollment.UserId);
        Assert.Equal(courseId, enrollment.CourseId);
        Assert.InRange(enrollment.EnrolledAt, before, DateTime.UtcNow);
    }
}
