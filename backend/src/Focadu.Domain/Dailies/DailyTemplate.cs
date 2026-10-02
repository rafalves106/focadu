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

    /// <summary>
    /// Fase 69: linguagem desta variante do dia. Nulo = dia unico, igual pra todo mundo (o normal).
    /// Preenchido so nos dias que existem em uma versao por linguagem - hoje, a ponte pro Projeto
    /// Semanal (6o dia da semana, secret/rascunhos/ponte-teoria-projeto-semanal.md): varios
    /// DailyTemplate com o mesmo DayNumber, um por linguagem, e a Daily do aluno aponta pro da
    /// linguagem que ele escolheu pro projeto (ver Weekly.ChooseProjectLanguage).
    /// </summary>
    public ProjectLanguage? Language { get; private set; }

    /// <summary>Molde do dia no dia-N.json ("v1"). Nulo = dia curado antes do plano de curadoria (02/10/2026).</summary>
    public string? MoldeVersion { get; private set; }

    /// <summary>SHA-256 do dia-N.json que gerou este dia. O importador compara e pula o dia que nao mudou.</summary>
    public string? ContentHash { get; private set; }

    /// <summary>Os 3 alvos de aprendizagem do dia (JSON). Nulo em dia antigo.</summary>
    public string? TargetsJson { get; private set; }

    public IReadOnlyList<LearningTarget> Targets => LearningTarget.Parse(TargetsJson);

    private readonly List<DailyActivity> _activities = new();
    public IReadOnlyCollection<DailyActivity> Activities => _activities.AsReadOnly();

    /// <summary>
    /// Fase 86: laboratorio de codigo do dia (bloco <c>lab</c> do dia-N.json, CURADORIA.md 5.2). Nulo = sem
    /// laboratorio: todo dia ja curado continua valendo e os passos de codigo seguem no fluxo antigo
    /// (rodar na maquina e colar a saida). Vale pra todos os CodeStep do dia, exceto os com
    /// <see cref="DailyActivity.LabDisabled"/>.
    /// </summary>
    public LabConfig? Lab { get; private set; }

    /// <summary>
    /// Fase 82: dia de ponte - uma variante por linguagem (ponte antiga do Web Security) ou um dia com
    /// passos de codigo ("code comigo", Fase 79). A 2a forma cobre a ponte dos cursos sem Projeto Semanal
    /// (Linux), cuja linguagem mora na semana (<c>WeeklyTemplate.PracticeLanguage</c>) e nao no dia. Ponte
    /// nao usa analogia de interesse (Fase 80).
    /// </summary>
    public bool IsBridge => Language is not null || _activities.Any(a => a.Type == ActivityType.CodeStep);

    private DailyTemplate()
    {
    }

    internal DailyTemplate(Guid weeklyTemplateId, int dayNumber, ProjectLanguage? language = null)
        : this(dayNumber)
    {
        if (language is { } lang && !Enum.IsDefined(lang))
            throw new DomainException("Linguagem invalida.", "linguagem_invalida");

        WeeklyTemplateId = weeklyTemplateId;
        Language = language;
    }

    private DailyTemplate(int dayNumber)
    {
        if (dayNumber < 1)
            throw new DomainException("DayNumber deve ser maior que zero.");

        DayNumber = dayNumber;
    }

    /// <summary>Registra de qual arquivo curado este dia veio: molde, hash do conteudo e alvos de aprendizagem.</summary>
    public void SetCurationInfo(string? moldeVersion, string? contentHash, IEnumerable<LearningTarget>? targets)
    {
        var list = targets?.ToList() ?? [];
        if (list.Count != 0 && list.Count != 3)
            throw new DomainException("Um dia tem exatamente 3 alvos de aprendizagem.", "alvos_invalidos");
        if (list.Select(x => x.Id).Distinct().Count() != list.Count)
            throw new DomainException("Os alvos de aprendizagem precisam de ids diferentes.", "alvos_invalidos");

        MoldeVersion = string.IsNullOrWhiteSpace(moldeVersion) ? null : moldeVersion;
        ContentHash = string.IsNullOrWhiteSpace(contentHash) ? null : contentHash;
        TargetsJson = list.Count == 0 ? null : LearningTarget.Serialize(list);
    }

    /// <summary>Fase 86: liga (ou desliga, com nulo) o laboratorio do dia. So faz sentido com passo de codigo ou missao no terminal.</summary>
    public void SetLab(LabConfig? lab)
    {
        if (lab is not null && _activities.All(a => a.Type is not (ActivityType.CodeStep or ActivityType.TerminalMission)))
            throw new DomainException("So um dia com passo de codigo (CodeStep) ou missao no terminal pode ter laboratorio.", "lab_sem_passo_de_codigo");
        if (lab is { NoEditor: true } && _activities.Any(a => a.Type == ActivityType.CodeStep))
            throw new DomainException("Um dia com passo de codigo precisa de lab.entry e lab.command.", "lab_entry_obrigatorio");

        Lab = lab;
    }

    /// <summary>Fase 86: este passo roda no laboratorio do dia (o dia tem lab e o passo nao saiu dele).</summary>
    public bool StepUsesLab(DailyActivity activity) =>
        Lab is not null && activity.Type == ActivityType.CodeStep && !activity.LabDisabled;

    /// <summary>
    /// Insere uma atividade na posicao <paramref name="orderIndex"/> de um dia que ja existe, empurrando uma
    /// posicao as que estavam dali pra frente. Ninguem perde progresso: as respostas guardam o Id da atividade,
    /// nao a posicao.
    /// </summary>
    public DailyActivity InsertActivity(ActivityType type, int orderIndex, AnswerMode answerMode, string? prompt = null)
    {
        foreach (var existing in _activities.Where(a => a.OrderIndex >= orderIndex))
            existing.ShiftOrder(1);
        return AddActivity(type, orderIndex, answerMode, prompt);
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
    /// <summary>
    /// Fase 79: tira todas as atividades pra reimportar o dia com conteudo novo (a ponte virou "code
    /// comigo" - ver SyncBridgeDaysUseCase). As respostas antigas das Dailies deste template ficam
    /// orfas; quem chama decide o que fazer com elas (Daily.ResetAfterTemplateRefresh).
    /// </summary>
    public void ClearActivities() => _activities.Clear();

    internal DailyActivity AddClonedActivity(DailyActivity source, int orderIndex)
    {
        var clone = source.CloneForReinforcement(Id, orderIndex);
        _activities.Add(clone);
        return clone;
    }
}
