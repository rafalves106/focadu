using Focadu.Application.Exceptions;
using Focadu.Application.Weeklies;
using Focadu.Domain.Enums;

namespace Focadu.Api.Contracts;

public record SubmitWeeklyProjectRequest(string? SubmissionUrl);

/// <summary>Fase 59: nome da linguagem escolhida pro projeto ("Python" ou "JavaScript", sem diferenciar maiuscula).</summary>
public record ChooseProjectLanguageRequest(string? Language);

/// <summary>Traducao de texto do request pra ProjectLanguage (Fase 59) - texto invalido vira 400 com codigo estavel, nunca um 500 nem uma linguagem ignorada em silencio.</summary>
internal static class ProjectLanguageParsing
{
    private static string Names => string.Join(" ou ", Enum.GetNames<ProjectLanguage>());

    public static ProjectLanguage Require(string? text) =>
        ProjectLanguages.TryParse(text, out var language)
            ? language
            : throw new ValidationException("linguagem_invalida", $"A linguagem precisa ser {Names}.");

    public static IReadOnlyList<ProjectLanguage>? RequireAll(string[]? texts) => texts?.Select(Require).ToList();
}
