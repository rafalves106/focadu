using Focadu.Application.Courses;
using Focadu.Domain.Courses;
using Xunit;

namespace Focadu.Tests.Courses;

public class ListCoursesUseCaseTests
{
    private static Course Active(string name)
    {
        var course = new Course(name);
        course.Activate();
        return course;
    }

    [Fact]
    public void EnrolledCourses_LeavesOutPublishedCoursesTheUserIsNotEnrolledIn()
    {
        // O Start pede o detalhe de cada curso da lista, e o detalhe exige matricula: um curso publicado
        // sem matricula na lista derrubava a tela com 404.
        var webSecurity = Active("Web Security");
        var linux = Active("Linux");

        var result = ListCoursesUseCase.EnrolledCourses([webSecurity, linux], new HashSet<Guid> { webSecurity.Id });

        Assert.Equal([webSecurity.Id], result.Select(c => c.Id));
    }

    [Fact]
    public void EnrolledCourses_KeepsAHiddenCourseTheUserIsEnrolledIn_AfterThePublishedOnes()
    {
        var linux = new Course("Linux");
        var webSecurity = Active("Web Security");

        var result = ListCoursesUseCase.EnrolledCourses([linux, webSecurity], new HashSet<Guid> { linux.Id, webSecurity.Id });

        Assert.Equal([webSecurity.Id, linux.Id], result.Select(c => c.Id));
    }

    [Fact]
    public void EnrolledCourses_IsEmptyBeforeTheFirstEnrollment()
    {
        var result = ListCoursesUseCase.EnrolledCourses([Active("Web Security")], new HashSet<Guid>());

        Assert.Empty(result);
    }
}
