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
    // Todos os cursos em conteudo/; na falta de dias novos, o arquivo morto (processo/arquivo/conteudo-antigo/)
    // segue como fixture do importador. Fora do checkout (CI) a lista fica so com um marcador.
    private static readonly string[] CourseSlugs = ["web-security", "linux", "python-websec", "design-patterns", "arquitetura-de-software"];

    private static IEnumerable<string> CourseDirs() =>
        CourseSlugs.Select(TestContent.CourseDir).Where(d => d is not null).Select(d => d!);

    private static IEnumerable<object[]> Files(string pattern)
    {
        var files = CourseDirs().SelectMany(d => Directory.EnumerateFiles(d, pattern, SearchOption.AllDirectories)).OrderBy(f => f).ToList();
        return files.Count == 0 ? [[""]] : files.Select(f => new object[] { f });
    }

    public static IEnumerable<object[]> AllDayFiles() => Files("dia-*.json");

    public static IEnumerable<object[]> AllProjectFiles() => Files("projeto.json");

    [Theory]
    [MemberData(nameof(AllDayFiles))]
    public void EveryDayFile_ImportsWithoutException(string filePath)
    {
        if (filePath.Length == 0) return; // conteudo fora do checkout (CI)
        var weeklyTemplate = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana Teste");

        var exception = Record.Exception(() => CuratedDayImporter.ImportFile(weeklyTemplate, filePath));

        Assert.True(exception is null, $"{Path.GetFileName(filePath)} falhou ao importar: {exception}");
    }

    [Theory]
    [MemberData(nameof(AllProjectFiles))]
    public void EveryProjectFile_ImportsWithoutException(string filePath)
    {
        if (filePath.Length == 0) return; // conteudo fora do checkout (CI)
        var weeklyTemplate = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana Teste");

        var exception = Record.Exception(() => CuratedProjectImporter.ImportFile(weeklyTemplate, filePath));

        Assert.True(exception is null, $"{Path.GetFileName(filePath)} falhou ao importar: {exception}");
    }

    // Plano de curadoria (02/10/2026): os testes que fixavam "60 dias" e "12 projetos" do Web Security antigo
    // sairam junto com o conteudo antigo; o novo curso define as suas quantidades. A contagem por tipo de
    // atividade e a estrutura do dia sao conferidas pelo linter e pelo dia.schema.json.

    // Fase 69: a ponte da Semana 1 (semana-1/ponte/<linguagem>.json) - uma variante por linguagem,
    // no Dia 6, e reimportar nao duplica (o SyncBridgeDaysUseCase roda em todo deploy). Mora aqui, e
    // nao em BridgeDayTests, porque le a curadoria do disco (fora do CI, ver ci.yml).
    [Fact]
    public void ImportBridge_Week1_ImportsBothLanguages_OnceOnly()
    {
        if (SeedWebSecurityCourseUseCase.TryCuratedContentPath("semana-1", "ponte/python.json") is null) return; // ponte antiga arquivada (plano de 02/10/2026)
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        var created = SeedWebSecurityCourseUseCase.ImportBridge(template, "semana-1");

        Assert.Equal(new[] { ProjectLanguage.Python, ProjectLanguage.JavaScript }, created.Select(t => t.Language!.Value).OrderBy(l => l));
        Assert.All(created, t => Assert.Equal(6, t.DayNumber));
        Assert.Empty(SeedWebSecurityCourseUseCase.ImportBridge(template, "semana-1"));
    }

    // Fase 79: a ponte antiga (leitura + quiz), ja no banco, e trocada no lugar pela "code comigo" do
    // disco - os conteudos que so ela usava saem - e reimportar de novo nao mexe em nada.
    [Fact]
    public void RefreshBridge_Week1_SwapsTheOldBridgeForTheCodeSteps_OnceOnly()
    {
        if (SeedWebSecurityCourseUseCase.TryCuratedContentPath("semana-1", "ponte/python.json") is null) return; // ponte antiga arquivada (plano de 02/10/2026)
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        const string oldBridge = """
        { "dayNumber": 6,
          "curatedContents": [ { "ref": "reading", "type": "Reading", "title": "Antiga", "externalUrl": null, "bodyText": "texto" } ],
          "activities": [ { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "reading" } ] }
        """;
        CuratedDayImporter.Import(template, oldBridge, ProjectLanguage.Python);
        CuratedDayImporter.Import(template, oldBridge, ProjectLanguage.JavaScript);
        var python = template.FindDailyTemplateVariant(6, ProjectLanguage.Python)!;

        var refreshed = SeedWebSecurityCourseUseCase.RefreshBridge(template, "semana-1");

        Assert.Equal(2, refreshed.Count);
        Assert.Same(python, refreshed.Single(t => t.Language == ProjectLanguage.Python));
        Assert.Equal(6, python.Activities.Count(a => a.Type == ActivityType.CodeStep));
        Assert.All(python.Activities.Where(a => a.Type == ActivityType.CodeStep), a => Assert.False(string.IsNullOrWhiteSpace(a.CodeRubric)));
        Assert.DoesNotContain(template.CuratedContents, c => c.Title == "Antiga");
        Assert.Empty(SeedWebSecurityCourseUseCase.RefreshBridge(template, "semana-1"));
    }
}
