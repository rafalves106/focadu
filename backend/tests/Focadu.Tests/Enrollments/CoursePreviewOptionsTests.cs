using Focadu.Application.Enrollments;
using Xunit;

namespace Focadu.Tests.Enrollments;

/// <summary>Fase 81: lista de previa dos cursos escondidos (CoursePreview:Emails).</summary>
public class CoursePreviewOptionsTests
{
    [Theory]
    [InlineData("rafa@x.com, Outra@Y.com", "outra@y.com", true)]
    [InlineData("rafa@x.com", "outro@x.com", false)]
    [InlineData("", "rafa@x.com", false)]
    [InlineData(null, null, false)]
    public void CanPreview_MatchesEmailsIgnoringCase(string? setting, string? email, bool expected) =>
        Assert.Equal(expected, CoursePreviewOptions.FromSetting(setting).CanPreview(email));
}
