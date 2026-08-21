using Focadu.Domain.Activities;
using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Fase 13: um dia de estudo dentro de uma Weekly - progresso de UM usuário (instância; era o
/// dono de DailyActivity/Status/PenaltyPoints/etc antes do split, agora referencia
/// <see cref="DailyTemplateId"/> pra saber quais atividades existem, e é dono de
/// <see cref="Responses"/> (moveu de DailyActivity pra cá, já que "respondida ou não" é progresso
/// por usuário, nunca dado de curriculo). Concentra as regras de acesso/penalidade que dependem
/// só do próprio dia; as regras que dependem dos dias irmãos (ex: "já existe outra Daily em
/// andamento hoje") vivem em Weekly (instância), que é quem enxerga a coleção inteira.
/// </summary>
public class Daily : Entity
{
    public Guid WeeklyId { get; private set; }
    public Guid DailyTemplateId { get; private set; }
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

    /// <summary>Id da Daily de reforço gerada a partir desta Daily, quando ReinforcementTriggered = true - preenchido junto, nunca separadamente (ver MarkReinforcementTriggered).</summary>
    public Guid? ReinforcementDailyId { get; private set; }

    private DailyTemplate? _template;

    /// <summary>Definição curricular deste dia (quais atividades existem) - populada via Include pelo repositório; nunca null num objeto carregado do banco ou construído por Weekly.AddDaily.</summary>
    public DailyTemplate Template => _template
        ?? throw new InvalidOperationException("DailyTemplate nao carregado - falta Include no repositorio.");

    /// <summary>Pass-through pra Template.Activities - mantém os call-sites que liam `daily.Activities` antes do split funcionando sem mudança.</summary>
    public IReadOnlyCollection<DailyActivity> Activities => Template.Activities;

    private readonly List<ActivityResponse> _responses = new();

    /// <summary>Todas as tentativas de resposta desta Daily, de qualquer atividade - filtre por ActivityId pra ver o histórico de uma atividade específica.</summary>
    public IReadOnlyCollection<ActivityResponse> Responses => _responses.AsReadOnly();

    private Daily()
    {
    }

    internal Daily(Guid weeklyId, DailyTemplate template, int dayNumber, DateOnly date, bool isReinforcement = false)
    {
        if (dayNumber < 1)
            throw new DomainException("DayNumber deve ser maior que zero.");

        WeeklyId = weeklyId;
        _template = template;
        DailyTemplateId = template.Id;
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

    /// <summary>
    /// Registra uma tentativa de resposta para uma atividade do Template desta Daily. Antes da
    /// primeira conclusão, uma resposta reprovada incrementa PenaltyPoints — a regra central que
    /// alimenta o gatilho de reforço diário. Depois da primeira conclusão (replay), a resposta é
    /// guardada no histórico normalmente, mas não mexe em PenaltyPoints nem dispara reforço de novo.
    /// </summary>
    public ActivityResponse SubmitActivityResponse(
        Guid activityId, int score, string? transcript = null, string? justification = null, string? aiFeedback = null)
    {
        if (Status is DailyStatus.Locked or DailyStatus.Available)
            throw new DomainException("A Daily precisa ser iniciada antes de registrar respostas.", "daily_nao_iniciada");

        if (Activities.All(a => a.Id != activityId))
            throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        var attemptNumber = _responses.Count(r => r.ActivityId == activityId) + 1;
        var response = new ActivityResponse(activityId, attemptNumber, score, transcript, justification, aiFeedback);
        _responses.Add(response);

        if (!HasEverCompleted && !response.Passed)
        {
            PenaltyPoints++;
        }

        return response;
    }

    /// <summary>True quando, ainda na primeira rodada, a Daily atingiu o limiar de penalidade e ainda não disparou reforço.</summary>
    public bool ShouldTriggerDailyReinforcement() =>
        !HasEverCompleted && !ReinforcementTriggered && PenaltyPoints >= EvaluationPolicy.DailyPenaltyThreshold;

    internal void MarkReinforcementTriggered(Guid reinforcementDailyId)
    {
        ReinforcementTriggered = true;
        ReinforcementDailyId = reinforcementDailyId;
    }

    /// <summary>Atividades do Template com ao menos uma resposta reprovada nesta Daily — usadas para montar a Daily de reforço.</summary>
    public IReadOnlyCollection<DailyActivity> GetFailedActivities() =>
        Activities
            .Where(a => _responses.Any(r => r.ActivityId == a.Id && !r.Passed))
            .OrderBy(a => a.OrderIndex)
            .ToList();

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
