namespace Focadu.Application.Notes;

/// <summary>
/// Caso de uso: tags distintas já usadas pelo usuário neste Course (autocomplete do campo de
/// tags, Fase 29) - reaproveita ListNotesUseCase sem filtro em vez de duplicar a resolução de
/// DailyId da Enrollment.
/// </summary>
public class ListNoteTagsUseCase
{
    private readonly ListNotesUseCase _listNotesUseCase;

    public ListNoteTagsUseCase(ListNotesUseCase listNotesUseCase)
    {
        _listNotesUseCase = listNotesUseCase;
    }

    public async Task<IReadOnlyCollection<string>> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var notes = await _listNotesUseCase.ExecuteAsync(userId, courseId, from: null, to: null, searchText: null, tag: null, cancellationToken);

        return notes
            .SelectMany(n => n.Tags)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
