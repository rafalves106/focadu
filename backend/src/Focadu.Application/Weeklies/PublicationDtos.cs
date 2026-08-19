using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

public record ModulePublicationDto(
    Guid WeeklyId,
    PublicationStatus Status,
    PublicationPlatform? Platform,
    string? SubmittedUrl,
    string? GeneratedDraft,
    string? ValidationError);

public record GitHubRepoDto(string Owner, string Name, string FullName, string Url, bool IsPrivate);
