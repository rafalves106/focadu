using System.Text.Json;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Aplica um projeto.json curado (schema documentado em secret/curadoria/CURADORIA.md, secao 3.1,
/// escrito pela skill curar-conteudo) a uma WeeklyTemplate - le { weekNumber, title, specText } e
/// chama WeeklyTemplate.SetProjectSpec(specText). Irmao de CuratedDayImporter (que faz o mesmo pra
/// dia-N.json), so que pro Projeto Pratico semanal em vez do conteudo diario.
/// </summary>
public static class CuratedProjectImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Le um projeto.json do disco e aplica - ver Import(WeeklyTemplate, string) pro schema.</summary>
    public static void ImportFile(WeeklyTemplate weeklyTemplate, string jsonFilePath) =>
        Import(weeklyTemplate, File.ReadAllText(jsonFilePath));

    public static void Import(WeeklyTemplate weeklyTemplate, string json)
    {
        var project = JsonSerializer.Deserialize<CuratedProjectJson>(json, JsonOptions)
            ?? throw new InvalidOperationException("Conteudo de projeto curado vazio ou invalido.");

        weeklyTemplate.SetProjectSpec(project.SpecText);
    }

    private record CuratedProjectJson(int WeekNumber, string Title, string SpecText);
}
