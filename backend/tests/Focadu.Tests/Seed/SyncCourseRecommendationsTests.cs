using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Xunit;

namespace Focadu.Tests.Seed;

public class SyncCourseRecommendationsTests
{
    [Theory]
    [InlineData("Web Security", "web-security")]
    [InlineData("Linux", "linux")]
    [InlineData("Python pra Web Security", "python-pra-web-security")]
    [InlineData("Segurança  em Nuvem", "seguranca-em-nuvem")]
    public void Slug_MatchesTheCurationFolder(string name, string slug) =>
        Assert.Equal(slug, SyncCourseRecommendationsUseCase.Slug(name));

    [Fact]
    public void Apply_SetsRequirementsRecommendationAndPreparesText()
    {
        var course = new Course("Web Security");
        var json = SyncCourseRecommendationsUseCase.Parse(
            """{ "requisitos": ["Andar pelo terminal", " Pipes "], "recomendadoAntes": ["Linux"], "preparaTexto": null }""");

        SyncCourseRecommendationsUseCase.Apply(course, json);

        Assert.Equal(["Andar pelo terminal", "Pipes"], course.Requirements);
        Assert.Equal(["Linux"], course.RecommendedBefore);
        Assert.Null(course.PreparesText);
    }

    [Fact]
    public void SetRecommendation_IgnoresBlankItemsAndTheCourseItself_AndReplacesThePrevious()
    {
        var course = new Course("Linux");
        course.SetRecommendation(["velho"], ["Web Security"], "velho");

        course.SetRecommendation(["", "Nada: começa do zero."], ["Linux", " ", "Web Security", "Web Security"], "  Prepara pro Web Security.  ");

        Assert.Equal(["Nada: começa do zero."], course.Requirements);
        Assert.Equal(["Web Security"], course.RecommendedBefore);
        Assert.Equal("Prepara pro Web Security.", course.PreparesText);
    }

    [Fact]
    public void Apply_WithoutFields_ClearsEverything()
    {
        var course = new Course("Linux");
        course.SetRecommendation(["x"], ["Web Security"], "y");

        SyncCourseRecommendationsUseCase.Apply(course, SyncCourseRecommendationsUseCase.Parse("{}"));

        Assert.Empty(course.Requirements);
        Assert.Empty(course.RecommendedBefore);
        Assert.Null(course.PreparesText);
    }
}
