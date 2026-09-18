using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>
/// Fase 45: rede de seguranca pro unico arquivo de curadoria em nivel de CURSO hoje
/// (certificacoes.json) - mesmo raciocinio de CuratedContentAllFilesTests (pegar erro de
/// schema/referencia sem precisar rodar o seed de verdade contra um Postgres), so que aqui contra
/// os 4 Monthly reais do curso em vez de uma WeeklyTemplate solta.
/// </summary>
public class CertificationCoverageFileTests
{
    private static readonly string FilePath = FindFile();

    private static string FindFile()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;

        var repoRoot = dir?.FullName
            ?? throw new InvalidOperationException("Nao foi possivel localizar a raiz do repositorio.");

        var nested = Path.Combine(repoRoot, "secret", "curadoria", "web-security", "certificacoes.json");
        if (File.Exists(nested))
            return nested;

        var siblingParent = Directory.GetParent(repoRoot)?.FullName;
        var sibling = siblingParent is null
            ? null
            : Path.Combine(siblingParent, "focadu-secret", "curadoria", "web-security", "certificacoes.json");
        if (sibling is not null && File.Exists(sibling))
            return sibling;

        throw new InvalidOperationException(
            $"certificacoes.json nao encontrado nem em '{nested}' nem em '{sibling}'.");
    }

    private static Course NewCourseWithFourMonthlies()
    {
        var course = new Course("Web Security");
        for (var number = 1; number <= 4; number++)
            course.AddMonthly(number, $"Modulo {number}");
        return course;
    }

    [Fact]
    public void CertificacoesJson_ImportsWithoutException()
    {
        var exception = Record.Exception(() =>
            CertificationCoverageImporter.ImportFile(NewCourseWithFourMonthlies(), FilePath));

        Assert.True(exception is null, $"certificacoes.json falhou ao importar: {exception}");
    }

    [Fact]
    public void CertificacoesJson_EveryMonthlyHasAtLeastOneCertification()
    {
        var course = NewCourseWithFourMonthlies();
        CertificationCoverageImporter.ImportFile(course, FilePath);

        Assert.All(course.Monthlies, m => Assert.NotEmpty(m.CertificationCoverages));
    }
}
