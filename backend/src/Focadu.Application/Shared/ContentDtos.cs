using Focadu.Domain.Enums;

namespace Focadu.Application.Shared;

/// <summary>
/// Compartilhado entre GetWeeklyDetailUseCase (leitura, dentro de WeeklyDetailDto) e os casos de
/// uso de autoria de conteudo curado (Focadu.Application.Content, Fase 4) - mesmo shape nos dois
/// lugares, sem duplicar o record.
/// </summary>
public record CuratedContentDto(
    Guid Id,
    CuratedContentType Type,
    string Title,
    string? ExternalUrl,
    string? BodyText);
