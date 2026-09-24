using System.Collections.Generic;
using System.IO;
using System.Linq;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>
/// Fase 26 (fechamento do curriculo Web Security, 60 dias / 12 projetos): rede de seguranca que
/// valida TODO arquivo dia-N.json/projeto.json em secret/curadoria/web-security/ contra os
/// importers reais, sem precisar de banco (WeeklyTemplate e um agregado de dominio puro, nao
/// precisa ser persistido pra ser populado). O curriculo e curado fora do ciclo normal de dev (por
/// IA/humano, ver secret/curadoria/CURADORIA.md), entao nao passa por code review automatico como
/// o resto do codigo - este teste pega erro de schema/enum/referencia antes de rodar o seed de
/// verdade contra um Postgres.
/// </summary>
public class CuratedContentAllFilesTests
{
    private static readonly string CourseDir = FindCourseDir();

    private static string FindCourseDir()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;

        var repoRoot = dir?.FullName
            ?? throw new InvalidOperationException("Nao foi possivel localizar a raiz do repositorio.");

        var nested = Path.Combine(repoRoot, "secret", "curadoria", "web-security");
        if (Directory.Exists(nested))
            return nested;

        var siblingParent = Directory.GetParent(repoRoot)?.FullName;
        var sibling = siblingParent is null
            ? null
            : Path.Combine(siblingParent, "focadu-secret", "curadoria", "web-security");
        if (sibling is not null && Directory.Exists(sibling))
            return sibling;

        throw new InvalidOperationException(
            $"Pasta de curadoria nao encontrada nem em '{nested}' nem em '{sibling}'.");
    }

    public static IEnumerable<object[]> AllDayFiles() =>
        Directory.EnumerateFiles(CourseDir, "dia-*.json", SearchOption.AllDirectories)
            .OrderBy(f => f)
            .Select(f => new object[] { f });

    public static IEnumerable<object[]> AllProjectFiles() =>
        Directory.EnumerateFiles(CourseDir, "projeto.json", SearchOption.AllDirectories)
            .OrderBy(f => f)
            .Select(f => new object[] { f });

    [Theory]
    [MemberData(nameof(AllDayFiles))]
    public void EveryDayFile_ImportsWithoutException(string filePath)
    {
        var weeklyTemplate = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana Teste");

        var exception = Record.Exception(() => CuratedDayImporter.ImportFile(weeklyTemplate, filePath));

        Assert.True(exception is null, $"{Path.GetFileName(filePath)} falhou ao importar: {exception}");
    }

    [Theory]
    [MemberData(nameof(AllProjectFiles))]
    public void EveryProjectFile_ImportsWithoutException(string filePath)
    {
        var weeklyTemplate = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana Teste");

        var exception = Record.Exception(() => CuratedProjectImporter.ImportFile(weeklyTemplate, filePath));

        Assert.True(exception is null, $"{Path.GetFileName(filePath)} falhou ao importar: {exception}");
    }

    // 23/09/2026: 6 Dailies por semana - a semana N ocupa os Dias 6N-5 a 6N, e o Dia 6N (a ponte pro
    // projeto) ainda nao tem arquivo dia-N.json. Sao 60 dias de conteudo, numerados de 1 a 71 com
    // os multiplos de 6 livres.
    [Fact]
    public void SixtyContentDayFilesExist_FivePerWeekWithTheBridgeDayFree()
    {
        var dayNumbers = AllDayFiles()
            .Select(args => (string)args[0])
            .Select(f => int.Parse(Path.GetFileNameWithoutExtension(f).Split('-')[1]))
            .OrderBy(n => n)
            .ToList();

        var expected = Enumerable.Range(1, 12).SelectMany(week => Enumerable.Range(6 * week - 5, 5));
        Assert.Equal(expected, dayNumbers);
    }

    [Fact]
    public void ExactlyTwelveProjectFilesExist()
    {
        Assert.Equal(12, AllProjectFiles().Count());
    }

    // Fase 69: a ponte da Semana 1 (semana-1/ponte/<linguagem>.json) - uma variante por linguagem,
    // no Dia 6, e reimportar nao duplica (o SyncBridgeDaysUseCase roda em todo deploy). Mora aqui, e
    // nao em BridgeDayTests, porque le a curadoria do disco (fora do CI, ver ci.yml).
    [Fact]
    public void ImportBridge_Week1_ImportsBothLanguages_OnceOnly()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        var created = SeedWebSecurityCourseUseCase.ImportBridge(template, "semana-1");

        Assert.Equal(new[] { ProjectLanguage.Python, ProjectLanguage.JavaScript }, created.Select(t => t.Language!.Value).OrderBy(l => l));
        Assert.All(created, t => Assert.Equal(6, t.DayNumber));
        Assert.Empty(SeedWebSecurityCourseUseCase.ImportBridge(template, "semana-1"));
    }
}
