namespace Focadu.Api.Contracts;

/// <summary>Type e string ("Reading"/"Video"/"Diagram", case-insensitive) - mais legivel pra quem cura conteudo manualmente do que o numero que a Api usa nas respostas de leitura.</summary>
public record CreateCuratedContentRequest(Guid? WeeklyId, string? Type, string? Title, string? ExternalUrl, string? BodyText);

/// <summary>Type e WeeklyId nao aparecem aqui de proposito - nunca mudam depois de criado (ver CuratedContent.Update).</summary>
public record UpdateCuratedContentRequest(string? Title, string? ExternalUrl, string? BodyText);
