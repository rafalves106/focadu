using Focadu.Application.Exceptions;
using Focadu.Domain.Notes;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Notes;

/// <summary>
/// Caso de uso: cria uma nota no contexto de uma Daily específica (painel de captura rápida,
/// Fase 29). Reaproveita IWeeklyRepository.GetByDailyIdAsync pra validar posse da Daily e achar
/// Weekly.Number/Daily.DayNumber pro NoteDto - mesmo idiom de GetDailyStateUseCase.
/// </summary>
public class CreateNoteUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateNoteUseCase(IWeeklyRepository weeklyRepository, INoteRepository noteRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _noteRepository = noteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<NoteDto> ExecuteAsync(
        Guid userId, Guid dailyId, string content, IReadOnlyCollection<string>? tags, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");
        var daily = weekly.Dailies.First(d => d.Id == dailyId);

        var note = new Note(userId, dailyId, content, tags ?? Array.Empty<string>());
        await _noteRepository.AddAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new NoteDto(note.Id, dailyId, weekly.Number, daily.DayNumber, daily.Date, note.Content, note.Tags, note.CreatedAt, note.UpdatedAt);
    }
}
