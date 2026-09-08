using System.Collections.Generic;
using System.IO;
using System.Linq;
using Focadu.Application.Seed;
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

    [Fact]
    public void ExactlySixtyDayFilesExist_NumberedOneToSixty()
    {
        var dayNumbers = AllDayFiles()
            .Select(args => (string)args[0])
            .Select(f => int.Parse(Path.GetFileNameWithoutExtension(f).Split('-')[1]))
            .OrderBy(n => n)
            .ToList();

        Assert.Equal(Enumerable.Range(1, 60), dayNumbers);
    }

    [Fact]
    public void ExactlyTwelveProjectFilesExist()
    {
        Assert.Equal(12, AllProjectFiles().Count());
    }
}
