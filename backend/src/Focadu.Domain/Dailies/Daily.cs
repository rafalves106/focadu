using Focadu.Domain.Activities;
using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Um dia de estudo dentro de uma Weekly. Concentra as regras de acesso/penalidade que dependem
/// só do próprio dia; as regras que dependem dos dias irmãos (ex: "já existe outra Daily em
/// andamento hoje") vivem em Weekly, que é quem enxerga a coleção inteira de Dailies.
/// </summary>
public class Daily : Entity
{
    public Guid WeeklyId { get; private set; }
    public int DayNumber { get; private set; }
    public DateOnly Date { get; private set; }
    public DailyStatus Status { get; private set; }
    public bool IsReinforcement { get; private set; }
    public int PenaltyPoints { get; private set; }

    /// <summary>
    /// Marca a primeira conclusão da Daily. Enquanto nulo, respostas reprovadas contam para
    /// PenaltyPoints (rodada "valendo"). Depois de preenchido, qualquer nova submissão é modo
    /// replay: fica no histórico, mas nunca mais mexe em PenaltyPoints nem dispara reforço —
    /// implementa a regra de "repetir quantas vezes quiser, sem penalidade nova".
    /// </summary>
    public DateTime? CompletedAt { get; private set; }

    /// <summary>Evita que a mesma Daily dispare mais de uma Daily de reforço na mesma rodada.</summary>
    public bool ReinforcementTriggered { get; private set; }

    private readonly List<DailyActivity> _activities = new();
    public IReadOnlyCollection<DailyActivity> Activities => _activities.AsReadOnly();

    private Daily()
    {
    }

    internal Daily(Guid weeklyId, int dayNumber, DateOnly date, bool isReinforcement = false)
    {
        if (dayNumber < 1)
            throw new DomainException("DayNumber deve ser maior que zero.");

        WeeklyId = weeklyId;
        DayNumber = dayNumber;
        Date = date;
        Status = DailyStatus.Locked;
        IsReinforcement = isReinforcement;
        PenaltyPoints = 0;
    }

    /// <summary>True quando a Daily já concluiu ao menos uma vez. A partir daí, novas submissões são repetição (replay).</summary>
    public bool HasEverCompleted => CompletedAt.HasValue;

    /// <summary>"Dia fraco": Daily que atingiu o limiar de penalidade que dispara reforço diário.</summary>
    public bool IsWeakDay => PenaltyPoints >= EvaluationPolicy.DailyPenaltyThreshold;

    public void Unlock()
    {
        if (Status == DailyStatus.Locked)
        {
            Status = DailyStatus.Available;
        }
    }

    /// <summary>
    /// Inicia a Daily pela primeira vez (Locked/Available -> InProgress), ou retoma se já estiver
    /// InProgress. Para repetir uma Daily já concluída, não chame Start: submeta respostas
    /// diretamente (SubmitActivityResponse aceita Status Completed como modo replay).
    /// </summary>
    public void Start()
    {
        switch (Status)
        {
            case DailyStatus.Locked:
            case DailyStatus.Available:
                Status = DailyStatus.InProgress;
                break;
            case DailyStatus.InProgress:
                break; // idempotente: permite retomar de onde parou.
            case DailyStatus.Completed:
                throw new DomainException(
                    "Esta Daily já foi concluída. Para repetir, envie novas respostas diretamente (modo replay).",
                    "daily_ja_concluida");
        }
    }

    public DailyActivity AddActivity(
        ActivityType type,
        int orderIndex,
        AnswerMode answerMode,
        Guid? contentId = null,
        string? expectedAnswer = null)
    {
        var activity = new DailyActivity(Id, type, orderIndex, answerMode, contentId, expectedAnswer);
        _activities.Add(activity);
        return activity;
    }

    /// <summary>Usado por Weekly.CreateDailyReinforcement para copiar uma atividade que falhou na Daily de origem.</summary>
    internal DailyActivity AddClonedActivity(DailyActivity source, int orderIndex)
    {
        var clone = source.CloneForReinforcement(Id, orderIndex);
        _activities.Add(clone);
        return clone;
    }

    /// <summary>
    /// Registra uma tentativa de resposta para uma atividade desta Daily. Antes da primeira
    /// conclusão, uma resposta reprovada incrementa PenaltyPoints — a regra central que alimenta
    /// o gatilho de reforço diário. Depois da primeira conclusão (replay), a resposta é guardada
    /// no histórico normalmente, mas não mexe em PenaltyPoints nem dispara reforço de novo.
    /// </summary>
    public ActivityResponse SubmitActivityResponse(Guid activityId, int score, string? transcript = null, string? aiFeedback = null)
    {
        if (Status is DailyStatus.Locked or DailyStatus.Available)
            throw new DomainException("A Daily precisa ser iniciada antes de registrar respostas.", "daily_nao_iniciada");

        var activity = _activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        var response = activity.RecordResponse(score, transcript, aiFeedback);

        if (!HasEverCompleted && !response.Passed)
        {
            PenaltyPoints++;
        }

        return response;
    }

    /// <summary>True quando, ainda na primeira rodada, a Daily atingiu o limiar de penalidade e ainda não disparou reforço.</summary>
    public bool ShouldTriggerDailyReinforcement() =>
        !HasEverCompleted && !ReinforcementTriggered && PenaltyPoints >= EvaluationPolicy.DailyPenaltyThreshold;

    internal void MarkReinforcementTriggered() => ReinforcementTriggered = true;

    /// <summary>Atividades com ao menos uma resposta reprovada nesta Daily — usadas para montar a Daily de reforço.</summary>
    public IReadOnlyCollection<DailyActivity> GetFailedActivities() =>
        _activities.Where(a => a.HasFailedAtLeastOnce).OrderBy(a => a.OrderIndex).ToList();

    /// <summary>
    /// Conclui a Daily. Na primeira conclusão, registra CompletedAt (a partir daí a penalidade
    /// para de contar). Em conclusões seguintes (replay), é só um hook — propositalmente vazio —
    /// para uma futura lógica de recompensa/streak; nunca dá recompensa duplicada.
    /// </summary>
    public void Complete()
    {
        if (Status == DailyStatus.Completed)
        {
            OnReplayCompleted();
            return;
        }

        if (Status != DailyStatus.InProgress)
            throw new DomainException("Só é possível concluir uma Daily que está em andamento.", "daily_nao_em_andamento");

        Status = DailyStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        OnFirstCompleted();
    }

    /// <summary>Hook para a futura implementação de recompensas na primeira conclusão (fora de escopo neste passo).</summary>
    protected virtual void OnFirstCompleted()
    {
    }

    /// <summary>Hook para repetições — propositalmente vazio: repetição nunca gera recompensa duplicada.</summary>
    protected virtual void OnReplayCompleted()
    {
    }
}
