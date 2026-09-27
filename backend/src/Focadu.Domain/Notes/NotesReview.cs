using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Notes;

/// <summary>
/// Revisao por IA das notas de um dia (Fase 78, decisoes do dono em 26-27/09/2026, rascunho
/// secret/rascunhos/avaliacao-ia-do-caderninho.md): formativa, nunca nota - o que esta bom, o que
/// falta e se confere com o material da Daily. Cada pedido gera uma linha (historico curto): a tela
/// mostra a mais recente de cada dia, e o limite diario conta as de hoje. <see cref="NotesHash"/> e o
/// hash das notas revisadas - quando as notas do dia mudam, a revisao fica desatualizada e "Revisar de
/// novo" libera.
/// </summary>
public class NotesReview : Entity
{
    public const int MaxTextLength = 1200;

    public Guid UserId { get; private set; }
    public Guid DailyId { get; private set; }
    public string NotesHash { get; private set; }
    public int NoteCount { get; private set; }
    public string Strengths { get; private set; }
    public string Missing { get; private set; }
    public string MaterialCheck { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private NotesReview()
    {
        NotesHash = Strengths = Missing = MaterialCheck = string.Empty;
    }

    public NotesReview(Guid userId, Guid dailyId, string notesHash, int noteCount, string strengths, string missing, string materialCheck, DateTime createdAtUtc)
    {
        if (string.IsNullOrWhiteSpace(notesHash))
            throw new DomainException("Hash das notas e obrigatorio.");
        if (noteCount <= 0)
            throw new DomainException("Nao ha notas pra revisar.", "sem_notas");

        UserId = userId;
        DailyId = dailyId;
        NotesHash = notesHash;
        NoteCount = noteCount;
        Strengths = Clip(strengths);
        Missing = Clip(missing);
        MaterialCheck = Clip(materialCheck);
        CreatedAt = createdAtUtc;
    }

    private static string Clip(string text)
    {
        var trimmed = (text ?? string.Empty).Trim();
        return trimmed.Length <= MaxTextLength ? trimmed : trimmed[..MaxTextLength];
    }
}
