using Focadu.Domain.Activities;
using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Fase 13: estrutura curricular de um dia (RENAME do antigo `Daily`) - admin-authored, so
/// DayNumber + as DailyActivity que existem naquele dia. Sem Status/Date/PenaltyPoints/etc (isso
/// virou progresso, mora na instancia `Daily` por usuario).
///
/// <c>WeeklyTemplateId</c> e nullable por um motivo especifico: reforco diario (Fase 4) gera
/// atividades dinamicamente, por usuario, copiadas da Daily de origem - nao e curriculo
/// compartilhado. Em vez de dar a `DailyActivity` uma segunda FK opcional (pra Daily-instancia),
/// reforco cria um DailyTemplate "sintetico" (<see cref="CreateSynthetic"/>, sem
/// WeeklyTemplateId, nunca adicionado a nenhuma `WeeklyTemplate.DailyTemplates`) so pra guardar as
/// atividades clonadas - assim toda `Daily` (instancia) sempre tem exatamente um `DailyTemplateId`
/// e todo `DailyActivity` sempre pertence a exatamente um `DailyTemplate`, sem ramificacao no
/// resto do codigo que le `daily.Template.Activities`.
/// </summary>
public class DailyTemplate : Entity
{
    public Guid? WeeklyTemplateId { get; private set; }
    public int DayNumber { get; private set; }

    private readonly List<DailyActivity> _activities = new();
    public IReadOnlyCollection<DailyActivity> Activities => _activities.AsReadOnly();

    private DailyTemplate()
    {
    }

    internal DailyTemplate(Guid weeklyTemplateId, int dayNumber)
        : this(dayNumber)
    {
        WeeklyTemplateId = weeklyTemplateId;
    }

    private DailyTemplate(int dayNumber)
    {
        if (dayNumber < 1)
            throw new DomainException("DayNumber deve ser maior que zero.");

        DayNumber = dayNumber;
    }

    /// <summary>Ver doc da classe - usado so por Weekly.CreateDailyReinforcement (instancia).</summary>
    internal static DailyTemplate CreateSynthetic(int dayNumber) => new(dayNumber);

    public DailyActivity AddActivity(
        ActivityType type,
        int orderIndex,
        AnswerMode answerMode,
        string? prompt = null,
        Guid? contentId = null,
        string? expectedAnswer = null)
    {
        var activity = new DailyActivity(Id, type, orderIndex, answerMode, prompt, contentId, expectedAnswer);
        _activities.Add(activity);
        return activity;
    }

    /// <summary>Usado por Weekly.CreateDailyReinforcement (instancia) para copiar uma atividade que falhou na Daily de origem.</summary>
    internal DailyActivity AddClonedActivity(DailyActivity source, int orderIndex)
    {
        var clone = source.CloneForReinforcement(Id, orderIndex);
        _activities.Add(clone);
        return clone;
    }
}
