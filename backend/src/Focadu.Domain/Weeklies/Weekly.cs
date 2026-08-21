using Focadu.Domain.Common;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Fase 13: uma semana de estudo - progresso de UM usuário matriculado (instância; era o dono de
/// Number/Title/Theme/CuratedContents/DailyActivity antes do split - isso virou curriculo, agora
/// referenciado via <see cref="Template"/>). Continua sendo o aggregate root "operacional": quem
/// enxerga todas as Dailies da semana ao mesmo tempo, por isso concentra as regras de negócio que
/// precisam compará-las entre si (acesso a Daily passada/futura, reforço diário e semanal) -
/// migrou praticamente inalterada do antigo `Weekly`, só trocando a fonte dos dados estruturais.
/// </summary>
public class Weekly : Entity
{
    public Guid EnrollmentId { get; private set; }
    public Guid WeeklyTemplateId { get; private set; }
    public DateOnly StartDate { get; private set; }

    private WeeklyTemplate? _template;

    /// <summary>Definição curricular desta semana (Number/Title/Theme/CuratedContents/DailyProjectSpec) - populada via Include pelo repositório.</summary>
    public WeeklyTemplate Template => _template
        ?? throw new InvalidOperationException("WeeklyTemplate nao carregado - falta Include no repositorio.");

    // Pass-through de identidade curricular - nunca difere por usuário, nunca armazenado 2x.
    public Guid MonthlyId => Template.MonthlyId;
    public int Number => Template.Number;
    public string Title => Template.Title;
    public string? Theme => Template.Theme;

    private readonly List<Daily> _dailies = new();
    public IReadOnlyCollection<Daily> Dailies => _dailies.AsReadOnly();

    private WeeklyProject? _project;
    public WeeklyProject? Project => _project;

    private readonly List<WeeklyReinforcement> _reinforcements = new();
    public IReadOnlyCollection<WeeklyReinforcement> Reinforcements => _reinforcements.AsReadOnly();

    private ModulePublication? _publication;
    public ModulePublication? Publication => _publication;

    private Weekly()
    {
    }

    /// <summary>Publico (nao internal) de proposito: EnrollUserInCourseUseCase (Focadu.Application, assembly diferente) e quem cria Weekly-instancia - nao ha nenhuma entidade de dominio "dona" da criacao (diferente de Daily, sempre criada via Weekly.AddDaily).</summary>
    public Weekly(Guid enrollmentId, WeeklyTemplate template, DateOnly startDate)
    {
        EnrollmentId = enrollmentId;
        _template = template;
        WeeklyTemplateId = template.Id;
        StartDate = startDate;
    }

    /// <summary>Cria a Daily-instância correspondente a um DailyTemplate curricular desta Weekly. Usado por EnrollUserInCourseUseCase, um por DailyTemplate.</summary>
    public Daily AddDaily(DailyTemplate dailyTemplate, DateOnly date)
    {
        if (_dailies.Any(d => d.DayNumber == dailyTemplate.DayNumber))
            throw new DomainException("Ja existe uma Daily com esse DayNumber nesta Weekly.");

        var daily = new Daily(Id, dailyTemplate, dailyTemplate.DayNumber, date);
        _dailies.Add(daily);
        return daily;
    }

    /// <summary>Cria o WeeklyProject-instância (Pending) - chamado uma vez, na matrícula (EnrollUserInCourseUseCase), junto com as Dailies.</summary>
    public WeeklyProject InitializeProject()
    {
        if (_project is not null)
            throw new DomainException("Esta Weekly ja tem um projeto inicializado.");

        _project = new WeeklyProject(Id);
        return _project;
    }

    /// <summary>Cria a publicacao desta Weekly sob demanda (na primeira vez que o aluno abre o fluxo, Fase 11) - idempotente.</summary>
    public ModulePublication StartPublication()
    {
        _publication ??= new ModulePublication(Id);
        return _publication;
    }

    /// <summary>
    /// "Modulo completo" (Fase 11): todas as Dailies originais (nao-reforco) concluidas e o
    /// WeeklyProject avaliado. Reforco fica de fora de proposito - nao e parte do conteudo
    /// planejado do modulo, e uma Daily de reforco pendente nunca deveria travar a prova de
    /// aprendizado de quem ja terminou o conteudo original.
    /// </summary>
    public bool IsModuleComplete()
    {
        var originalDailies = _dailies.Where(d => !d.IsReinforcement).ToList();
        return originalDailies.Count > 0
            && originalDailies.All(d => d.Status == DailyStatus.Completed)
            && _project is { Status: WeeklyProjectStatus.Evaluated };
    }

    /// <summary>Verdadeiro quando o modulo esta completo mas ainda nao tem uma publicacao Validated - trava o proximo modulo (ver StartOrResumeDailyUseCase).</summary>
    public bool RequiresPublicationToUnlock() =>
        IsModuleComplete() && _publication?.Status != PublicationStatus.Validated;

    /// <summary>
    /// "Perfeita" (Fase 14, Gamificacao): modulo completo e nenhuma Daily original teve
    /// penalidade (nunca errou o suficiente pra disparar reforco/dia fraco). Reforco fica de fora
    /// da checagem pelo mesmo motivo de IsModuleComplete - nao e parte do conteudo planejado.
    /// Usada pelo bonus de Gems de Weekly/Monthly perfeita (ver GamificationCreditor).
    /// </summary>
    public bool IsPerfect() =>
        IsModuleComplete() && _dailies.Where(d => !d.IsReinforcement).All(d => d.PenaltyPoints == 0);

    /// <summary>
    /// Verdadeiro quando existe um WeeklyReinforcement disparado (Fase 4, 2+ dias fracos) que
    /// ainda nao foi totalmente atendido (Fase 15 - ver WeeklyReinforcement.IsResolved). So
    /// leitura/exibicao (indicador "revisao semanal pendente"), nao muda a logica de disparo.
    /// </summary>
    public bool HasPendingWeeklyReinforcement() => _reinforcements.Any(r => !r.IsResolved(_dailies));

    public IReadOnlyCollection<Daily> GetWeakDailies() =>
        _dailies.Where(d => d.IsWeakDay).ToList();

    /// <summary>
    /// Resolve qual Daily desta Weekly esta datada em "date", preferindo sempre a Daily
    /// nao-reforco quando houver mais de uma na mesma data (ex: uma Daily normal e a Daily de
    /// reforco gerada a partir dela no mesmo dia, ja que CreateDailyReinforcement usa "hoje" como
    /// data). O atalho "/hoje" nunca deve resolver acidentalmente pra uma Daily de reforco -
    /// acesso a ela e sempre via link explicito (Daily.ReinforcementDailyId). Determinístico
    /// mesmo sem esse cenario: OrderBy/ThenBy nunca dependem da ordem natural do banco.
    /// </summary>
    public Daily? GetDailyByDate(DateOnly date) =>
        _dailies
            .Where(d => d.Date == date)
            .OrderBy(d => d.IsReinforcement)
            .ThenBy(d => d.DayNumber)
            .FirstOrDefault();

    public bool ShouldTriggerWeeklyReinforcement()
    {
        var alreadyCovered = _reinforcements.SelectMany(r => r.WeakDailyIds).ToHashSet();
        var uncoveredWeakDays = GetWeakDailies().Count(d => !alreadyCovered.Contains(d.Id));
        return uncoveredWeakDays >= EvaluationPolicy.WeeklyWeakDaysThreshold;
    }

    public WeeklyReinforcement TriggerWeeklyReinforcement()
    {
        if (!ShouldTriggerWeeklyReinforcement())
        {
            throw new DomainException(
                "Condicoes para reforco semanal nao foram atingidas.",
                "reforco_semanal_condicoes_nao_atingidas");
        }

        var alreadyCovered = _reinforcements.SelectMany(r => r.WeakDailyIds).ToHashSet();
        var weakIds = GetWeakDailies().Where(d => !alreadyCovered.Contains(d.Id)).Select(d => d.Id).ToList();

        var reinforcement = new WeeklyReinforcement(Id, weakIds);
        _reinforcements.Add(reinforcement);
        return reinforcement;
    }

    /// <summary>
    /// Cria a Daily de reforco diario para sourceDailyId (IsReinforcement = true, vinculada a esta
    /// mesma Weekly), copiando apenas as atividades onde houve falha na Daily de origem. As
    /// atividades clonadas moram num DailyTemplate "sintetico" (nunca no curriculo compartilhado -
    /// ver DailyTemplate.CreateSynthetic), ja que reforco e progresso individual, nao curriculo.
    /// </summary>
    public Daily CreateDailyReinforcement(Guid sourceDailyId, DateOnly date)
    {
        var source = _dailies.FirstOrDefault(d => d.Id == sourceDailyId)
            ?? throw new DomainException("Daily de origem nao encontrada nesta Weekly.", "daily_nao_encontrada");

        if (!source.ShouldTriggerDailyReinforcement())
        {
            throw new DomainException(
                "Condicoes para reforco diario nao foram atingidas.",
                "reforco_diario_condicoes_nao_atingidas");
        }

        var nextDayNumber = _dailies.Max(d => d.DayNumber) + 1;
        var reinforcementTemplate = DailyTemplate.CreateSynthetic(nextDayNumber);

        var orderIndex = 0;
        foreach (var activity in source.GetFailedActivities())
        {
            reinforcementTemplate.AddClonedActivity(activity, orderIndex++);
        }

        var reinforcementDaily = new Daily(Id, reinforcementTemplate, nextDayNumber, date, isReinforcement: true);

        source.MarkReinforcementTriggered(reinforcementDaily.Id);
        _dailies.Add(reinforcementDaily);
        return reinforcementDaily;
    }

    /// <summary>
    /// Avalia o que pode ser feito com uma Daily desta Weekly, dado "hoje":
    /// - Daily futura: nunca acessivel.
    /// - Daily de hoje concluida: Replay (repeticao livre, sem limite).
    /// - Daily de hoje InProgress: Resume.
    /// - Daily de hoje ainda nao iniciada: Start, mas so se nao houver outra InProgress hoje.
    /// - Daily de dia anterior: ReadOnly, exceto Replay quando nao ha nenhuma Daily InProgress
    ///   no momento e o usuario esta deliberadamente refazendo essa Daily (sempre dentro da
    ///   mesma Weekly, ja que esta avaliacao nunca enxerga Dailies de outra semana).
    ///
    /// Nota: "Locked" e conceitual para Dailies futuras - nao ha transicao de status disparada
    /// por scheduler/cron nenhum; a barreira e sempre resolvida comparando Daily.Date com "hoje"
    /// aqui dentro, no momento em que o acesso e avaliado.
    /// </summary>
    public DailyAccessMode EvaluateDailyAccess(Guid dailyId, DateOnly today)
    {
        var target = _dailies.FirstOrDefault(d => d.Id == dailyId)
            ?? throw new DomainException("Daily nao encontrada nesta Weekly.", "daily_nao_encontrada");

        if (target.Date > today)
            throw new DomainException("Nao e possivel acessar uma Daily futura.", "daily_futura");

        if (target.Date == today)
        {
            if (target.Status == DailyStatus.Completed)
                return DailyAccessMode.Replay;

            if (target.Status == DailyStatus.InProgress)
                return DailyAccessMode.Resume;

            var otherInProgressToday = _dailies.Any(d =>
                d.Id != target.Id && d.Date == today && d.Status == DailyStatus.InProgress);
            if (otherInProgressToday)
            {
                throw new DomainException(
                    "Ja existe uma Daily em andamento hoje. Conclua-a antes de iniciar outra.",
                    "daily_em_andamento");
            }

            return DailyAccessMode.Start;
        }

        // target.Date < today: dia anterior.
        var hasAnyInProgress = _dailies.Any(d => d.Status == DailyStatus.InProgress);
        if (!hasAnyInProgress && target.Status == DailyStatus.Completed)
            return DailyAccessMode.Replay;

        return DailyAccessMode.ReadOnly;
    }

    /// <summary>Inicia, retoma ou reabre (replay) uma Daily desta Weekly, respeitando EvaluateDailyAccess.</summary>
    public Daily StartOrResumeDaily(Guid dailyId, DateOnly today)
    {
        var mode = EvaluateDailyAccess(dailyId, today);
        var daily = _dailies.First(d => d.Id == dailyId);

        switch (mode)
        {
            case DailyAccessMode.Start:
            case DailyAccessMode.Resume:
                daily.Start();
                return daily;
            case DailyAccessMode.Replay:
                return daily;
            default:
                throw new DomainException(
                    "Esta Daily e de um dia anterior e so pode ser acessada em modo leitura (resumo/gabarito).",
                    "daily_somente_leitura");
        }
    }
}
