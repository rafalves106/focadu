using Focadu.Domain.Common;
using Focadu.Domain.Content;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Uma semana de estudo dentro de um Monthly. E o aggregate root que enxerga todas as Dailies
/// da semana ao mesmo tempo, por isso concentra as regras de negocio que precisam comparar
/// Dailies entre si: acesso a Daily passada/futura, reforco diario e reforco semanal.
/// </summary>
public class Weekly : Entity
{
    public Guid MonthlyId { get; private set; }
    public int Number { get; private set; }
    public string Title { get; private set; }
    public string? Theme { get; private set; }

    private readonly List<Daily> _dailies = new();
    public IReadOnlyCollection<Daily> Dailies => _dailies.AsReadOnly();

    private readonly List<CuratedContent> _curatedContents = new();
    public IReadOnlyCollection<CuratedContent> CuratedContents => _curatedContents.AsReadOnly();

    private WeeklyProject? _project;
    public WeeklyProject? Project => _project;

    private readonly List<WeeklyReinforcement> _reinforcements = new();
    public IReadOnlyCollection<WeeklyReinforcement> Reinforcements => _reinforcements.AsReadOnly();

    private Weekly()
    {
        Title = string.Empty;
    }

    public Weekly(Guid monthlyId, int number, string title, string? theme = null)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Titulo da semana e obrigatorio.");
        if (number < 1)
            throw new DomainException("Number deve ser maior que zero.");

        MonthlyId = monthlyId;
        Number = number;
        Title = title;
        Theme = theme;
    }

    public Daily AddDaily(int dayNumber, DateOnly date)
    {
        if (_dailies.Any(d => d.DayNumber == dayNumber))
            throw new DomainException("Ja existe uma Daily com esse DayNumber nesta Weekly.");

        var daily = new Daily(Id, dayNumber, date);
        _dailies.Add(daily);
        return daily;
    }

    public CuratedContent AddCuratedContent(CuratedContentType type, string title, string? externalUrl = null, string? bodyText = null)
    {
        var content = new CuratedContent(Id, type, title, externalUrl, bodyText);
        _curatedContents.Add(content);
        return content;
    }

    public WeeklyProject DefineProject(string specText)
    {
        if (_project is not null)
            throw new DomainException("Esta Weekly ja tem um projeto definido.");

        _project = new WeeklyProject(Id, specText);
        return _project;
    }

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
    /// mesma Weekly), copiando apenas as atividades onde houve falha na Daily de origem.
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
        var reinforcementDaily = new Daily(Id, nextDayNumber, date, isReinforcement: true);

        var orderIndex = 0;
        foreach (var activity in source.GetFailedActivities())
        {
            reinforcementDaily.AddClonedActivity(activity, orderIndex++);
        }

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
