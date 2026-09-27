namespace Focadu.Application.Ports;

/// <summary>
/// Port da revisao por IA das notas de um dia (Fase 78): recebe o material curado da Daily e as notas
/// do aluno e devolve uma revisao formativa em tres partes. Nunca da nota, nunca reescreve as notas.
/// </summary>
public interface INotesReviewService
{
    Task<NotesReviewResult> ReviewAsync(NotesReviewRequest request, CancellationToken cancellationToken = default);
}

/// <param name="Material">Texto curado do dia (titulos e corpo das leituras), ja truncado.</param>
/// <param name="Notes">As notas do aluno naquele dia, na ordem em que foram escritas.</param>
public record NotesReviewRequest(string DayTitle, string Material, IReadOnlyList<string> Notes);

public record NotesReviewResult(string Strengths, string Missing, string MaterialCheck);
