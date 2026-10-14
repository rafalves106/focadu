using System.IO;
using System.Linq;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>
/// Fase 81: o seed dos cursos de pre-requisito contra a curadoria de verdade (secret/conteudo/linux/, com o arquivo morto como fixture dos dias antigos),
/// sem banco - mesmo espirito de CuratedContentAllFilesTests. Pega erro de schema do curso.json ou de
/// um dia curado antes de o deploy rodar o seed. Fora do CI hospedado (sem o repo focadu-secret), igual
/// CuratedContentAllFilesTests - ver .github/workflows/ci.yml.
/// </summary>
public class CuratedCourseImporterTests
{
    private const string Slug = "linux";

    private static CourseManifest LoadManifest() =>
        CuratedCourseImporter.ParseManifest(File.ReadAllText(TestContent.Resolve(Slug, null, "curso.json")!));

    private static string? Resolve(string weekFolder, string fileName) =>
        TestContent.Resolve(Slug, weekFolder, fileName);

    [Fact]
    public void Apply_BuildsTheCourseHiddenWithOnlyTheCuratedDays()
    {
        if (!TestContent.Available) return; // conteudo fora do checkout (CI)
        // O Linux real ja foi publicado (30/09/2026): o teste fixa o manifesto como nao publicado pra
        // conferir o curso escondido; a publicacao tem teste proprio abaixo.
        var manifest = LoadManifest() with { Published = false };
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
        if (!TestContent.Available) return; // conteudo fora do checkout (CI)
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);
        CuratedCourseImporter.Apply(course, manifest, Resolve);

        Assert.Empty(CuratedCourseImporter.Apply(course, manifest, Resolve));
    }

    [Fact]
    public void Apply_AddsLaterCuratedDays_AndPublishesWhenTheManifestSays()
    {
        if (!TestContent.Available) return; // conteudo fora do checkout (CI)
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
    public void LinuxBridge_IsMarkedInTheJson_AndRunsOnTerminalMissions()
    {
        if (!TestContent.Available) return; // conteudo fora do checkout (CI)
        var manifest = LoadManifest();
        var course = CuratedCourseImporter.CreateCourse(manifest);
        var created = CuratedCourseImporter.Apply(course, manifest, Resolve);

        // A ponte do Linux (molde B) nao tem CodeStep: e ponte porque o dia-6.json declara "ponte": true (Fase 98).
        var bridge = created.Single(c => c.Day.DayNumber == 6).Day;
        Assert.True(bridge.BridgeMark);
        Assert.True(bridge.IsBridge);
        Assert.DoesNotContain(bridge.Activities, a => a.Type == ActivityType.CodeStep);
        var missions = bridge.Activities.Single(a => a.Type == ActivityType.TerminalMission).TerminalMissionList;
        Assert.Equal(5, missions.Count);
        Assert.Null(bridge.Language);
        Assert.All(created.Where(c => c.Day.DayNumber < 6), c => Assert.False(c.Day.IsBridge));
    }
}
