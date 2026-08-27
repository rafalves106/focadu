namespace Focadu.Api.Contracts;

/// <summary>
/// Type e string ("Reading"/"Video", case-insensitive) - mais legivel pra quem cura
/// conteudo manualmente do que o numero que a Api usa nas respostas de leitura. WeeklyTemplateId
/// (Fase 13, era WeeklyId): CuratedContent virou curriculo, vinculado a uma WeeklyTemplate, nao a
/// uma Weekly-instancia de usuario nenhum.
/// </summary>
public record CreateCuratedContentRequest(Guid? WeeklyTemplateId, string? Type, string? Title, string? ExternalUrl, string? BodyText);

/// <summary>Type e WeeklyTemplateId nao aparecem aqui de proposito - nunca mudam depois de criado (ver CuratedContent.Update).</summary>
public record UpdateCuratedContentRequest(string? Title, string? ExternalUrl, string? BodyText);
