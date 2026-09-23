using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Notes;

/// <summary>Caso de uso: edita conteúdo/tags de uma nota já existente (Fase 29) - CRUD completo, sem janela de tempo.</summary>
public class EditNoteUseCase
{
    private readonly INoteRepository _noteRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public EditNoteUseCase(INoteRepository noteRepository, IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<NoteDto> ExecuteAsync(
        Guid userId, Guid noteId, string content, IReadOnlyCollection<string>? tags, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepository.GetByIdAsync(noteId, userId, cancellationToken)
            ?? throw new NotFoundException("nota_nao_encontrada", "Nota nao encontrada.");

        note.Edit(content, tags ?? Array.Empty<string>());
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Weekly.Number/Daily.DayNumber nunca mudam pra uma nota ja existente (o contexto e fixo) -
        // resolvidos de novo so pra montar o NoteDto de resposta (mesmo dado de CreateNoteUseCase).
        var weekly = (note.DailyId is { } dailyId
                ? await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
                : await _weeklyRepository.GetByWeeklyProjectIdAsync(note.WeeklyProjectId!.Value, userId, cancellationToken))
            ?? throw new NotFoundException("contexto_da_nota_nao_encontrado", "Daily ou projeto da nota nao encontrado.");

        return NoteDto.From(note, weekly);
    }
}
