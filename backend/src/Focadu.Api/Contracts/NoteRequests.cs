namespace Focadu.Api.Contracts;

/// <summary>Caderninho de Anotações (Fase 29).</summary>
public record CreateNoteRequest(string Content, IReadOnlyCollection<string>? Tags);

public record UpdateNoteRequest(string Content, IReadOnlyCollection<string>? Tags);
