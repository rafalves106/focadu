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

    /// <summary>
    /// Fase 79: repositorio (GitHub ou Forgejo) onde o aluno guardou o script da ponte "code comigo" -
    /// opcional, so depois de concluir o dia (o codigo ja fica guardado nas respostas dos passos).
    /// </summary>
    public string? CodeRepositoryUrl { get; private set; }

    private DailyTemplate? _template;

    /// <summary>Definição curricular deste dia (quais atividades existem) - populada via Include pelo repositório; nunca null num objeto carregado do banco ou construído por Weekly.AddDaily.</summary>
    public DailyTemplate Template => _template
        ?? throw new InvalidOperationException("DailyTemplate nao carregado - falta Include no repositorio.");

    /// <summary>Pass-through pra Template.Activities - mantém os call-sites que liam `daily.Activities` antes do split funcionando sem mudança.</summary>
    public IReadOnlyCollection<DailyActivity> Activities => Template.Activities;

    private readonly List<ActivityResponse> _responses = new();

    /// <summary>Todas as tentativas de resposta desta Daily, de qualquer atividade - filtre por ActivityId pra ver o histórico de uma atividade específica.</summary>
    public IReadOnlyCollection<ActivityResponse> Responses => _responses.AsReadOnly();

    private readonly List<CodeStepHint> _hints = new();

    /// <summary>Fase 86: dicas da Focada dadas nos passos de codigo com laboratorio (nao sao tentativas).</summary>
    public IReadOnlyCollection<CodeStepHint> Hints => _hints.AsReadOnly();

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

    /// <summary>
    /// Fase 69: troca a variante de linguagem deste dia (a ponte pro projeto) pela da linguagem que
    /// o aluno escolheu - chamado so por Weekly.ChooseProjectLanguage. So antes de a Daily comecar:
    /// respostas ja dadas pertencem as atividades da variante antiga.
    /// </summary>
    internal void BindLanguageVariant(DailyTemplate variant)
    {
        if (variant.DayNumber != DayNumber || variant.Language is null)
            throw new DomainException("A variante nao e deste dia.");
        if (Status is not (DailyStatus.Locked or DailyStatus.Available) || _responses.Count > 0)
            throw new DomainException("A Daily ja comecou e nao pode trocar de linguagem.", "daily_ja_iniciada");

        _template = variant;
        DailyTemplateId = variant.Id;
    }

    /// <summary>Fase 69: dia que existe em uma versao por linguagem (a ponte) - so pode comecar depois que a linguagem do projeto foi escolhida.</summary>
    public bool RequiresProjectLanguage => Template.Language is not null;

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
        Guid activityId, int score, string? transcript = null, string? correctedTranscript = null,
        string? justification = null, string? aiFeedback = null)
    {
        if (Status is DailyStatus.Locked or DailyStatus.Available)
            throw new DomainException("A Daily precisa ser iniciada antes de registrar respostas.", "daily_nao_iniciada");

        if (Activities.All(a => a.Id != activityId))
            throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        var attemptNumber = _responses.Count(r => r.ActivityId == activityId) + 1;
        var response = new ActivityResponse(
            activityId, attemptNumber, score, transcript, correctedTranscript, justification, aiFeedback);
        _responses.Add(response);

        // Fase 79: ajustar um passo de codigo nao e erro da sessao - tentar de novo faz parte do
        // passo (ver CodeStepProgress), entao nunca soma penalidade nem gera reforco.
        var isCodeStep = Activities.First(a => a.Id == activityId).Type == ActivityType.CodeStep;
        if (!HasEverCompleted && !response.Passed && !isCodeStep)
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
            .Where(a => a.Type != ActivityType.CodeStep && _responses.Any(r => r.ActivityId == a.Id && !r.Passed))
            .OrderBy(a => a.OrderIndex)
            .ToList();

    /// <summary>
    /// Verdadeiro quando toda Activity desta Daily tem resposta e a tentativa MAIS RECENTE foi
    /// aprovada (Fase 15, Bônus de Superação - só faz sentido pra Dailies de reforço, onde cada
    /// Activity é uma das que o usuário errou originalmente). Activity sem nenhuma resposta ainda
    /// conta como não aprovada (não dá pra "aprovar" o que nunca foi respondido); Daily sem
    /// nenhuma Activity (não deveria acontecer - CreateDailyReinforcement sempre clona ao menos as
    /// atividades falhas que a disparou) também não conta como aprovada, defensivamente.
    /// </summary>
    public bool AllActivitiesPassed() =>
        Activities.Count > 0
        && Activities.All(a => _responses.Where(r => r.ActivityId == a.Id).OrderBy(r => r.AttemptNumber).LastOrDefault()?.Passed == true);

    /// <summary>
    /// Score de Estudo desta Daily (Fase 16, métrica de QUALIDADE - diferente de Gems, que
    /// recompensa consistência) - média ponderada de ActivityResponse.Score (tentativa MAIS
    /// RECENTE de cada Activity, mesmo critério de AllActivitiesPassed) usando os pesos de
    /// EvaluationPolicy.ActivityScoreWeight. Reading/Video ficam de fora (sempre 100, ruído
    /// artificial - nunca avaliam nada de verdade), e TerminalMission tambem (mesmo motivo: Score fixo 100); CodeStep tambem (Fase 79: o passo de codigo
    /// da ponte nao vale nota, so "passou / ajuste isto"). Dailies de reforço nunca pontuam (null) - já
    /// têm sua própria recompensa em Gems (Bônus de Superação, Fase 15); incluir no Score
    /// incentivaria errar de propósito pra "score duplo". Null também quando nenhuma atividade
    /// avaliável ainda tem resposta - nunca 0 (evita simular uma nota que ninguém tirou).
    /// </summary>
    public double? CalculateScore()
    {
        if (IsReinforcement) return null;

        var scored = Activities
            .Where(a => a.Type is not (ActivityType.Reading or ActivityType.Video or ActivityType.CodeStep or ActivityType.TerminalMission))
            .Select(a => _responses.Where(r => r.ActivityId == a.Id).OrderBy(r => r.AttemptNumber).LastOrDefault() is { } latest
                ? (Weight: EvaluationPolicy.ActivityScoreWeight(a.Type), Score: latest.Score)
                : ((double Weight, int Score)?)null)
            .Where(x => x is not null)
            .Select(x => x!.Value)
            .ToList();

        if (scored.Count == 0) return null;

        var totalWeight = scored.Sum(x => x.Weight);
        return scored.Sum(x => x.Weight * x.Score) / totalWeight;
    }

    /// <summary>Fase 79: o passo de codigo acabou (passou, ou gastou as tentativas e a solucao apareceu).</summary>
    public bool IsCodeStepDone(Guid activityId) =>
        CodeStepProgress.IsDone(_responses.Where(r => r.ActivityId == activityId));

    /// <summary>
    /// Fase 79: o script do dia ate antes deste passo - o codigo que cada passo de codigo anterior
    /// entregou (a tentativa aprovada ou a solucao), na ordem. Nulo quando algum passo anterior
    /// ainda nao acabou: o passo de codigo so abre depois do anterior.
    /// </summary>
    public string? PriorCode(Guid activityId)
    {
        var target = Activities.First(a => a.Id == activityId);
        var parts = new List<string>();
        foreach (var previous in Activities.Where(a => a.Type == ActivityType.CodeStep && a.OrderIndex < target.OrderIndex).OrderBy(a => a.OrderIndex))
        {
            var carried = CodeStepProgress.CarriedCode(previous, _responses.Where(r => r.ActivityId == previous.Id));
            if (carried is null) return null;
            parts.Add(carried.TrimEnd());
        }

        return string.Join("\n\n", parts);
    }

    /// <summary>
    /// Fase 86: pede uma dica da Focada num passo de codigo com laboratorio. Nao e tentativa: so conta pro
    /// limite de <see cref="CodeStepProgress.MaxHints"/> por passo. Nao da pra pedir depois que o passo
    /// acabou (passou ou a solucao apareceu) - numa Daily ja concluida (replay) o passo pode ser refeito.
    /// </summary>
    public CodeStepHint AddCodeStepHint(Guid activityId, string right, string wrong, string improve)
    {
        var activity = Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade nao encontrada nesta Daily.", "atividade_nao_encontrada");
        if (!Template.StepUsesLab(activity))
            throw new DomainException("Este passo nao tem laboratorio, entao nao tem dica.", "passo_sem_laboratorio");
        if (!HasEverCompleted && IsCodeStepDone(activityId))
            throw new DomainException("Este passo ja foi concluido.", "passo_concluido");
        if (PriorCode(activityId) is null)
            throw new DomainException("Conclua o passo anterior antes deste.", "passo_anterior_pendente");

        var used = _hints.Count(h => h.ActivityId == activityId);
        if (used >= CodeStepProgress.MaxHints)
            throw new DomainException($"As {CodeStepProgress.MaxHints} dicas deste passo ja foram usadas.", "dicas_esgotadas");

        var hint = new CodeStepHint(activityId, used + 1, right, wrong, improve);
        _hints.Add(hint);
        return hint;
    }

    /// <summary>
    /// Fase 79: o conteudo do DailyTemplate desta Daily foi trocado (a ponte virou "code comigo") -
    /// as respostas antigas respondem atividades que nao existem mais. So pra Daily ainda nao
    /// concluida (SyncBridgeDaysUseCase): a sessao recomeca do zero, sem penalidade herdada.
    /// </summary>
    public void ResetAfterTemplateRefresh()
    {
        if (HasEverCompleted)
            throw new DomainException("Uma Daily ja concluida mantem o historico dela.");

        _responses.Clear();
        _hints.Clear();
        PenaltyPoints = 0;
    }

    /// <summary>
    /// Fase 79: liga (ou desliga, com nulo/vazio) o repositorio do script da ponte. So em Daily com
    /// passo de codigo e ja concluida; aceita qualquer endereco http(s) absoluto - o aluno pode usar o
    /// GitHub dele ou o Forgejo da Focadu.
    /// </summary>
    public void LinkCodeRepository(string? url)
    {
        if (Activities.All(a => a.Type != ActivityType.CodeStep))
            throw new DomainException("So a ponte com passos de codigo tem repositorio.", "daily_sem_codigo");
        if (!HasEverCompleted)
            throw new DomainException("Conclua o dia antes de linkar o repositorio.", "daily_nao_concluida");

        if (string.IsNullOrWhiteSpace(url))
        {
            CodeRepositoryUrl = null;
            return;
        }

        var trimmed = url.Trim();
        if (trimmed.Length > MaxRepositoryUrlLength
            || !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new DomainException("Use o endereco completo do repositorio (https://...).", "url_repositorio_invalida");
        }

        CodeRepositoryUrl = trimmed;
    }

    public const int MaxRepositoryUrlLength = 500;

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
