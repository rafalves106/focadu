using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

public record ModulePublicationDto(
    Guid WeeklyId,
    PublicationStatus Status,
    PublicationPlatform? Platform,
    string? SubmittedUrl,
    string? GeneratedDraft,
    string? ValidationError,
    PublicationImageDto? Image = null);

/// <summary>
/// Fase 107: os campos da imagem de conclusao da semana (modelo do Figma "Imagem de conclusao da semana"), que o
/// front desenha e o aluno baixa pra anexar ao post. Vem so na resposta do rascunho (nao e persistido): destaques e
/// nome do projeto sao da Focada, gerados junto com o post. O nome do aluno e a data o front ja tem.
/// </summary>
public record PublicationImageDto(
    string? CourseName,
    int WeekNumber,
    int TotalWeeks,
    string WeekTitle,
    IReadOnlyList<string> Highlights,
    string? ProjectTitle);

public record GitHubRepoDto(string Owner, string Name, string FullName, string Url, bool IsPrivate);
