using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Feedback do aluno ao fim do dia (plano de curadoria, 02/10/2026): nota de clareza de 1 a 5, "onde travei" (a atividade
/// da Daily) e um comentario livre opcional. Um por Daily e usuario, regravavel. E o teste real de leitura facil: alimenta
/// o criterio de reabrir um curso (clareza media da semana, travas repetidas no mesmo tipo de bloco).
///
/// Guarda o <see cref="StuckActivityType"/> e a <see cref="StuckActivityOrder"/> alem do Id da atividade, e o
/// <see cref="DailyTemplateId"/>: o importador substitui as atividades de um dia ao atualiza-lo, entao o Id sozinho viraria
/// referencia solta e o relatorio por tipo de bloco se perderia. Referencias fracas (sem FK), como as notas do caderninho.
/// </summary>
public class DayFeedback : Entity
{
    public const int MaxCommentLength = 1000;

    public Guid UserId { get; private set; }
    public Guid DailyId { get; private set; }
    public Guid DailyTemplateId { get; private set; }

    /// <summary>Nota de clareza do dia, de 1 (travei) a 5 (leitura fluida).</summary>
    public int Clarity { get; private set; }

    public Guid? StuckActivityId { get; private set; }
    public ActivityType? StuckActivityType { get; private set; }
    public int? StuckActivityOrder { get; private set; }

    public string? Comment { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private DayFeedback()
    {
    }

    public DayFeedback(Guid userId, Guid dailyId, Guid dailyTemplateId)
    {
        UserId = userId;
        DailyId = dailyId;
        DailyTemplateId = dailyTemplateId;
        CreatedAt = UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Grava (ou regrava) a avaliacao do dia. <paramref name="stuck"/> e a atividade em que o aluno travou, se travou.</summary>
    public void Rate(int clarity, Activities.DailyActivity? stuck, string? comment)
    {
        if (clarity is < 1 or > 5)
            throw new DomainException("A clareza do dia vai de 1 a 5.", "clareza_invalida");

        var trimmed = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        if (trimmed is { Length: > MaxCommentLength })
            throw new DomainException($"O comentario pode ter no maximo {MaxCommentLength} caracteres.", "comentario_muito_longo");

        Clarity = clarity;
        StuckActivityId = stuck?.Id;
        StuckActivityType = stuck?.Type;
        StuckActivityOrder = stuck?.OrderIndex;
        Comment = trimmed;
        UpdatedAt = DateTime.UtcNow;
    }
}
