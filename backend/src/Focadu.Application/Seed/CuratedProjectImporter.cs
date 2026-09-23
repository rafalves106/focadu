using System.Text.Json;
using Focadu.Application.Weeklies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Aplica um projeto.json curado (schema documentado em secret/curadoria/CURADORIA.md, secao 3.1,
/// escrito pela skill curar-conteudo) a uma WeeklyTemplate - le { weekNumber, title, specText } e
/// chama WeeklyTemplate.SetProjectSpec(specText). Irmao de CuratedDayImporter (que faz o mesmo pra
/// dia-N.json), so que pro Projeto Pratico semanal em vez do conteudo diario.
///
/// Fase 59 (piloto da Semana 1): dois campos opcionais, ausentes nas semanas ainda nao curadas por
/// linguagem (que seguem exatamente como antes):
/// - "languages": [{ "language": "python", "forgejoTemplateSlug": "..." }] - 1 repositorio-modelo por
///   linguagem, vira WeeklyTemplate.AddLanguageVariant.
/// - "references": [{ "language": "python" | omitido, "title", "url", "documents", "verifiedAt":
///   "2026-09-21" }] - links de referencia; sem "language" valem pra todas as linguagens. A ordem
///   do arquivo e a ordem de exibicao.
///
/// Fase 64 (dialogo da Focada no Projeto Semanal), tambem opcionais:
/// - "briefing": ["fala 1", "fala 2", ...] - o briefing de missao, escrito a mao (max. 200
///   caracteres por fala), vira WeeklyTemplate.SetProjectBriefing.
/// - "falasDeEstado": { "repositorio" | "entregue" | "avaliadoAlta" | "avaliadoBaixa": "texto" } -
///   so as falas de estado que esta semana sobrescreve; o resto usa as padrao do frontend. Exige
///   "briefing" junto.
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

        if (project.Briefing is { Count: > 0 })
            weeklyTemplate.SetProjectBriefing(project.Briefing, project.FalasDeEstado);
        else if (project.FalasDeEstado is { Count: > 0 })
            throw new DomainException("projeto.json com \"falasDeEstado\" mas sem \"briefing\".", "briefing_ausente");

        foreach (var variant in project.Languages ?? [])
            weeklyTemplate.AddLanguageVariant(ParseLanguage(variant.Language), variant.ForgejoTemplateSlug);

        foreach (var reference in project.References ?? [])
        {
            // Sem "language" = comum a todas; com "language", precisa ser uma linguagem valida (nao
            // ignora em silencio um erro de digitacao: a referencia sumiria da tela sem ninguem ver).
            ProjectLanguage? language = string.IsNullOrWhiteSpace(reference.Language) ? null : ParseLanguage(reference.Language);
            var verifiedAt = reference.VerifiedAt?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            weeklyTemplate.AddReference(language, reference.Title, reference.Url, reference.Documents, verifiedAt);
        }
    }

    private static ProjectLanguage ParseLanguage(string? text) =>
        ProjectLanguages.TryParse(text, out var language)
            ? language
            : throw new DomainException($"Linguagem invalida no projeto.json: '{text}'.", "linguagem_invalida");

    private record CuratedProjectJson(
        int WeekNumber, string Title, string SpecText,
        List<CuratedLanguageJson>? Languages, List<CuratedReferenceJson>? References,
        List<string>? Briefing, Dictionary<string, string>? FalasDeEstado);

    private record CuratedLanguageJson(string Language, string ForgejoTemplateSlug);

    private record CuratedReferenceJson(string? Language, string Title, string Url, string Documents, DateOnly? VerifiedAt);
}
