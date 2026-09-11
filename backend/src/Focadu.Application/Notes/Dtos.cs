namespace Focadu.Application.Notes;

/// <summary>
/// Fase 29 (Caderninho de Anotações). WeekNumber/DayNumber/DailyDate vêm de Weekly/Daily (nunca
/// duplicados na entidade Note - ver Note.cs) - resolvidos pelo caso de uso a partir do DailyId,
/// pra UI mostrar o vínculo "Semana X, Dia Y" sem precisar de uma 2a chamada.
/// </summary>
public record NoteDto(
    Guid Id,
    Guid DailyId,
    int WeekNumber,
    int DayNumber,
    DateOnly DailyDate,
    string Content,
    IReadOnlyCollection<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt);
