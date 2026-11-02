namespace Focadu.Api.Contracts;

/// <summary>Platform e string ("LinkedIn", case-insensitive; Fase 106: GitHub saiu) - mesmo padrao de CreateCuratedContentRequest.Type.</summary>
public record SubmitPublicationRequest(string? Platform, string? Url);

