namespace Focadu.Api.Contracts;

/// <summary>Platform e string ("LinkedIn"/"GitHub", case-insensitive) - mesmo padrao de CreateCuratedContentRequest.Type.</summary>
public record SubmitPublicationRequest(string? Platform, string? Url);

public record GitHubCommitRequest(string? RepoName, bool IsNewRepo);
