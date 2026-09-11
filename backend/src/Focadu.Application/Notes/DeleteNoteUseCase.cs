using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Notes;

/// <summary>Caso de uso: apaga uma nota (Fase 29) - CRUD completo, sem restricao.</summary>
public class DeleteNoteUseCase
{
    private readonly INoteRepository _noteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteNoteUseCase(INoteRepository noteRepository, IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepository.GetByIdAsync(noteId, userId, cancellationToken)
            ?? throw new NotFoundException("nota_nao_encontrada", "Nota nao encontrada.");

        _noteRepository.Remove(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
