using Focadu.Application.Exceptions;
using Focadu.Domain.Notes;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Notes;

/// <summary>
/// Caso de uso (Fase 63): cria uma nota vinculada ao Projeto Semanal - "Anotação rápida" da tela do
/// projeto. Pedido do dono: a anotação feita no projeto é do projeto, não da última Daily da semana.
/// Posse validada pelo GetByIdAsync (Weekly de outro usuário = 404), igual CreateNoteUseCase.
/// </summary>
public class CreateWeeklyProjectNoteUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateWeeklyProjectNoteUseCase(IWeeklyRepository weeklyRepository, INoteRepository noteRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _noteRepository = noteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<NoteDto> ExecuteAsync(
        Guid userId, Guid weeklyId, string content, IReadOnlyCollection<string>? tags, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");
        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        var note = Note.ForWeeklyProject(userId, project.Id, content, tags ?? Array.Empty<string>());
        await _noteRepository.AddAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return NoteDto.From(note, weekly);
    }
}
