using Focadu.Domain.Notes;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Notes;

/// <summary>
/// Fase 29 (Caderninho de Anotações). WeekNumber/DayNumber/DailyDate vêm de Weekly/Daily (nunca
/// duplicados na entidade Note - ver Note.cs) - resolvidos pelo caso de uso a partir do DailyId,
/// pra UI mostrar o vínculo "Semana X, Dia Y" sem precisar de uma 2a chamada.
///
/// Fase 63: nota do Projeto Semanal - `WeeklyProjectId` preenchido, `DailyId`/`DayNumber` nulos, e
/// `DailyDate` vira o dia (horario local) em que a nota foi criada, pra ordenar/filtrar por data do
/// mesmo jeito. A UI mostra "Semana X, Projeto".
/// </summary>
public record NoteDto(
    Guid Id,
    Guid? DailyId,
    Guid? WeeklyProjectId,
    int WeekNumber,
    int? DayNumber,
    DateOnly DailyDate,
    string Content,
    IReadOnlyCollection<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    /// <summary>Monta o DTO a partir da Weekly dona do contexto da nota (a Daily ou o Projeto dela).</summary>
    internal static NoteDto From(Note note, Weekly weekly)
    {
        if (note.DailyId is { } dailyId)
        {
            var daily = weekly.Dailies.First(d => d.Id == dailyId);
            return new NoteDto(note.Id, dailyId, null, weekly.Number, daily.DayNumber, daily.Date, note.Content, note.Tags, note.CreatedAt, note.UpdatedAt);
        }

        return new NoteDto(
            note.Id, null, note.WeeklyProjectId, weekly.Number, null, DateOnly.FromDateTime(note.CreatedAt.ToLocalTime()),
            note.Content, note.Tags, note.CreatedAt, note.UpdatedAt);
    }
}
