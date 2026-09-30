using System.IO;
using System.Linq;
using Focadu.Application.Enrollments;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>
/// Fase 81: o seed dos cursos de pre-requisito contra a curadoria de verdade (secret/curadoria/linux/),
/// sem banco - mesmo espirito de CuratedContentAllFilesTests. Pega erro de schema do curso.json ou de
/// um dia curado antes de o deploy rodar o seed.
/// </summary>
public class CuratedCourseImporterTests
{
    private const string Slug = "linux";

    private static CourseManifest LoadManifest() =>
        CuratedCourseImporter.ParseManifest(File.ReadAllText(CuratedContentLocator.Resolve(Slug, null, "curso.json", required: true)!));

    private static string? Resolve(string weekFolder, string fileName) =>
        CuratedContentLocator.Resolve(Slug, weekFolder, fileName, required: false);

    [Fact]
    public void Apply_BuildsTheCourseHiddenWithOnlyTheCuratedDays()
    {
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);

        var created = CuratedCourseImporter.Apply(course, manifest, Resolve);

        Assert.Equal(CourseStatus.Draft, course.Status);
        var weeks = course.Monthlies.SelectMany(m => m.WeeklyTemplates).OrderBy(w => w.Number).ToList();
        Assert.Equal(manifest.Modules.Sum(m => m.Weeks.Count), weeks.Count);
        Assert.All(weeks, w => Assert.True(w.IsPracticeOnly));
        Assert.All(weeks, w => Assert.Equal("Bash", w.PracticeLanguage));

        // So entram os dias que existem em disco - e todos os que existem entram.
        var curatedFiles = manifest.Modules.SelectMany(m => m.Weeks)
            .SelectMany(w => w.Days.Select(d => Resolve($"semana-{w.Number}", $"dia-{d}.json")))
            .Count(p => p is not null);
        Assert.Equal(curatedFiles, created.Count);
        Assert.Contains(created, c => c.Day.DayNumber == 1);
    }

    [Fact]
    public void Apply_IsIdempotent()
    {
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);
        CuratedCourseImporter.Apply(course, manifest, Resolve);

        Assert.Empty(CuratedCourseImporter.Apply(course, manifest, Resolve));
    }

    [Fact]
    public void Apply_AddsLaterCuratedDays_AndPublishesWhenTheManifestSays()
    {
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);
        // 1o deploy: so o Dia 1 existia.
        CuratedCourseImporter.Apply(course, manifest, (w, f) => f == "dia-1.json" ? Resolve(w, f) : null);

        var created = CuratedCourseImporter.Apply(course, manifest with { Published = true }, Resolve);

        Assert.DoesNotContain(created, c => c.Day.DayNumber == 1);
        Assert.Contains(created, c => c.Day.DayNumber == 2);
        Assert.Equal(CourseStatus.Active, course.Status);
    }

    [Fact]
    public void BridgeDays_HaveCodeSteps_WithExpectedOutput()
    {
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);
        var created = CuratedCourseImporter.Apply(course, manifest, Resolve);

        var bridge = created.Single(c => c.Day.DayNumber == 6).Day;
        var steps = bridge.Activities.Where(a => a.Type == ActivityType.CodeStep).ToList();
        Assert.Equal(6, steps.Count);
        Assert.All(steps, s => Assert.False(string.IsNullOrWhiteSpace(s.CodeExpectedOutput)));
        Assert.Null(bridge.Language);
    }

    [Theory]
    [InlineData("rafa@x.com, Outra@Y.com", "outra@y.com", true)]
    [InlineData("rafa@x.com", "outro@x.com", false)]
    [InlineData("", "rafa@x.com", false)]
    [InlineData(null, null, false)]
    public void CoursePreviewOptions_MatchesEmailsIgnoringCase(string? setting, string? email, bool expected) =>
        Assert.Equal(expected, CoursePreviewOptions.FromSetting(setting).CanPreview(email));
}
