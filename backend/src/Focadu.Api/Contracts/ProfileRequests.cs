namespace Focadu.Api.Contracts;

/// <summary>
/// PreferredLanguages (Fase 59): nomes das linguagens do Projeto Semanal ("Python", "JavaScript",
/// sem diferenciar maiuscula). Nulo = nao mexe no que o aluno ja marcou; lista vazia limpa.
/// </summary>
public record CompleteProfileRequest(string[]? Interests, string? AdditionalNotes, string[]? PreferredLanguages = null);

/// <summary>Fase 72: "nao mostrar minhas notas no feed do squad".</summary>
public record SquadFeedPrivacyRequest(bool HideScores);
