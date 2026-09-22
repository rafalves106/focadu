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
    /// Verdadeiro quando todas as Dailies originais (nao-reforco) desta Weekly ja foram
    /// concluidas - reforco fica de fora de proposito, mesmo criterio de IsModuleComplete()
    /// (nao e conteudo planejado, uma Daily de reforco pendente nunca deveria travar nada aqui).
    /// Usado tanto por IsModuleComplete() quanto por SubmitProject() (o projeto so faz sentido
    /// depois do conteudo da semana inteira).
    /// </summary>
    public bool AreDailiesComplete()
    {
        var originalDailies = _dailies.Where(d => !d.IsReinforcement).ToList();
        return originalDailies.Count > 0 && originalDailies.All(d => d.Status == DailyStatus.Completed);
    }

    /// <summary>
    /// "Modulo completo" (Fase 11): todas as Dailies originais concluidas e o WeeklyProject
    /// avaliado.
    /// </summary>
    public bool IsModuleComplete() =>
        AreDailiesComplete() && _project is { Status: WeeklyProjectStatus.Evaluated };

    /// <summary>
    /// Envia o projeto pratico desta Weekly (Fase 38) - so permitido depois que todas as Dailies
    /// originais ja foram concluidas: nao faz sentido pular direto pro projeto sem ver o
    /// conteudo da semana ("chefe de fase" so deveria aparecer no fim dela). Antes desta fase
    /// SubmitWeeklyProjectUseCase chamava WeeklyProject.Submit direto, sem nenhuma checagem -
    /// bug reportado ao vivo (14/09/2026): o card do projeto sempre mostrava "PENDENTE" desde o
    /// dia 1 da semana, dando a entender que dava pra enviar a qualquer momento.
    /// </summary>
    public WeeklyProject SubmitProject(string submissionUrl)
    {
        if (_project is null)
            throw new DomainException("Esta Weekly nao tem projeto definido.", "projeto_nao_encontrado");

        if (!AreDailiesComplete())
        {
            throw new DomainException(
                "Termine todas as dailies desta semana antes de enviar o projeto.",
                "projeto_semana_bloqueado");
        }

        _project.Submit(submissionUrl);
        return _project;
    }

    /// <summary>
    /// Falha (DomainException) se o aluno nao pode escolher agora a linguagem do projeto (Fase 59):
    /// semana sem variantes de linguagem, projeto ainda bloqueado (mesma regra de SubmitProject -
    /// so com as Dailies originais concluidas, decisao do dono), projeto que nao esta mais Pending
    /// ou que ja tem linguagem. Separado de ChooseProjectLanguage porque o caso de uso precisa
    /// checar isso ANTES de chamar o Forgejo (o fork e o passo caro e externo) - a escolha em si
    /// so e gravada depois que o fork deu certo, com a URL dele.
    /// </summary>
    public void EnsureProjectLanguageCanBeChosen()
    {
        if (_project is null)
            throw new DomainException("Esta Weekly nao tem projeto definido.", "projeto_nao_encontrado");

        if (!Template.HasLanguageVariants)
            throw new DomainException("Esta semana nao tem escolha de linguagem no projeto.", "semana_sem_variantes_de_linguagem");

        if (_project.Language is not null)
            throw new DomainException("A linguagem deste projeto ja foi escolhida e nao pode ser trocada.", "linguagem_ja_escolhida");

        if (_project.Status != WeeklyProjectStatus.Pending)
            throw new DomainException("So e possivel escolher a linguagem de um projeto ainda pendente.", "projeto_nao_pendente");

        if (!AreDailiesComplete())
        {
            throw new DomainException(
                "Termine todas as dailies desta semana antes de escolher a linguagem do projeto.",
                "projeto_semana_bloqueado");
        }
    }

    /// <summary>Grava a linguagem escolhida e o repositorio dela (Fase 59) - repete as checagens de EnsureProjectLanguageCanBeChosen, que o caso de uso ja chamou antes do fork.</summary>
    public WeeklyProject ChooseProjectLanguage(ProjectLanguage language, string repositoryUrl)
    {
        EnsureProjectLanguageCanBeChosen();

        if (Template.FindLanguageVariant(language) is null)
            throw new DomainException("Esta semana nao tem o projeto nessa linguagem.", "linguagem_indisponivel");

        _project!.ChooseLanguage(language, repositoryUrl);
        return _project;
    }

    /// <summary>Verdadeiro quando o modulo esta completo mas ainda nao tem uma publicacao Validated - trava o proximo modulo (ver StartOrResumeDailyUseCase).</summary>
    public bool RequiresPublicationToUnlock() =>
        IsModuleComplete() && _publication?.Status != PublicationStatus.Validated;

    /// <summary>
    /// Verdadeiro quando as Dailies originais ja foram todas concluidas mas o projeto semanal ainda
    /// nao foi avaliado (Pending ou Submitted) - trava a proxima Weekly, como
    /// RequiresPublicationToUnlock trava depois dele (ver MESTRE.md 2.3: a Weekly so "fecha" com
    /// todas as Dailies + projeto avaliado + publicacao validada).
    ///
    /// Fase 54 (bug real, 21/09/2026): a unica trava entre semanas era RequiresPublicationToUnlock,
    /// que so liga com o modulo JA completo (projeto Evaluated) - com o projeto ainda Pending
    /// nada segurava a proxima Weekly e a Daily 6 (Semana 2) abriu sem o projeto da Semana 1.
    /// Enquanto as Dailies nao estiverem todas concluidas isto e false de proposito: ai quem
    /// segura a proxima Weekly e a sequencia (daily_bloqueada), nao o projeto. Sem projeto
    /// definido tambem e false (a matricula sempre inicializa um; travar o curso pra sempre por
    /// um dado ausente seria pior que deixar passar).
    /// </summary>
    public bool RequiresProjectToUnlock() =>
        AreDailiesComplete() && _project is { Status: not WeeklyProjectStatus.Evaluated };

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

    /// <summary>
    /// Score de Estudo desta Weekly (Fase 16) - 0.7 * média(Daily.CalculateScore() das Dailies
    /// originais) + 0.3 * WeeklyProject.Score. Null enquanto o módulo não está completo (mesmo
    /// critério de IsModuleComplete - todas as Dailies originais Completed E o projeto avaliado):
    /// nunca calcula um score parcial de semana em andamento, pra não rankear alguém no meio da
    /// semana como se já tivesse terminado (ver GetCourseRankingUseCase).
    /// </summary>
    public double? CalculateScore()
    {
        if (!IsModuleComplete()) return null;

        var dailyScores = _dailies
            .Where(d => !d.IsReinforcement)
            .Select(d => d.CalculateScore())
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .ToList();

        // Defensivo - IsModuleComplete() ja garante todas Completed, mas uma Weekly feita so de
        // Reading/Video (sem nenhuma atividade avaliavel) nunca teria Daily.CalculateScore() != null.
        if (dailyScores.Count == 0) return null;

        // IsModuleComplete() ja garante Project.Status == Evaluated, e Evaluate(score, ...) sempre
        // seta Status e Score juntos - Score nunca fica null aqui.
        var projectScore = _project!.Score!.Value;

        return EvaluationPolicy.WeeklyDailyAverageWeight * dailyScores.Average()
            + EvaluationPolicy.WeeklyProjectScoreWeight * projectScore;
    }

    public IReadOnlyCollection<Daily> GetWeakDailies() =>
        _dailies.Where(d => d.IsWeakDay).ToList();

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
    ///
    /// Todo VoiceSummary reforcado ganha o Reading/Video original (mesmo ContentId) na frente -
    /// sem isso, o reforco pedia pra explicar de novo um material que a atividade fracassada
    /// nunca mostrou (VoiceSummary nao tem corpo de texto/video proprio), sem jeito de reler/
    /// reassistir antes de tentar de novo (reportado ao vivo). Quiz/Cloze/WordMatch/Roleplay
    /// reforcados continuam direto, sem material na frente - so fazem sentido sozinhos.
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
            if (activity.Type == ActivityType.VoiceSummary && activity.ContentId is Guid contentId)
            {
                var material = source.Activities.FirstOrDefault(a =>
                    (a.Type == ActivityType.Reading || a.Type == ActivityType.Video) && a.ContentId == contentId);
                if (material is not null)
                {
                    reinforcementTemplate.AddActivity(material.Type, orderIndex++, material.AnswerMode, contentId: material.ContentId);
                }
            }

            reinforcementTemplate.AddClonedActivity(activity, orderIndex++);
        }

        var reinforcementDaily = new Daily(Id, reinforcementTemplate, nextDayNumber, date, isReinforcement: true);

        source.MarkReinforcementTriggered(reinforcementDaily.Id);
        _dailies.Add(reinforcementDaily);
        return reinforcementDaily;
    }

    /// <summary>
    /// Fase 57: a Daily "base" (de origem) de uma Daily de reforco desta Weekly - a que gerou o
    /// reforco, ou seja, a que tem <see cref="Daily.ReinforcementDailyId"/> apontando pra ele. O
    /// reforco sempre nasce na mesma Weekly da origem (ver CreateDailyReinforcement). Null quando
    /// <paramref name="reinforcementDailyId"/> nao e um reforco desta Weekly.
    /// </summary>
    public Daily? FindReinforcementSource(Guid reinforcementDailyId) =>
        _dailies.FirstOrDefault(d => d.ReinforcementDailyId == reinforcementDailyId);

    /// <summary>
    /// Avalia o que pode ser feito com uma Daily desta Weekly, dado "hoje" e se ela e a
    /// "isNextInSequence" (a Daily nao-reforco de menor DayNumber ainda nao concluida em TODA a
    /// matricula - calculado fora daqui, ver DailySequencing na Application, ja que uma Weekly
    /// sozinha nao enxerga as irmas):
    /// - Daily InProgress (de hoje OU abandonada ha mais tempo): Resume - retomar de onde parou
    ///   sempre vale, ja que so pode existir uma InProgress por vez (ver guard abaixo). Concluir
    ///   essa "Daily atrasada" hoje conta como a Daily de hoje: ver proxima regra.
    /// - Daily de hoje concluida: Replay (repeticao livre, sem limite).
    /// - Daily concluida em um dia anterior: Replay quando nao ha nenhuma Daily InProgress no
    ///   momento (repeticao deliberada, sempre dentro da mesma Weekly).
    /// - Daily ainda nao iniciada: Start, mas so se (a) for a isNextInSequence OU uma Daily de
    ///   reforco (reforco nunca disputa a sequencia principal, acesso sempre por link explicito),
    ///   (b) nao houver nenhuma outra Daily InProgress nesta Weekly e (c) o usuario ainda nao
    ///   concluiu nenhuma Daily hoje (limite de uma conclusao por dia corrido, mesmo quando essa
    ///   conclusao veio de retomar um atraso).
    /// - Daily ainda nao iniciada e que NAO e a isNextInSequence: bloqueada - ainda nao chegou a
    ///   vez dela.
    ///
    /// Fase 54 (bug real, 21/09/2026): (b) e (c) acima valem pra MATRICULA inteira, nao so pra esta
    /// Weekly - concluir a Daily 5 (Semana 1) e clicar em "Hoje" abria a Daily 6 (Semana 2) no
    /// mesmo dia, porque esta Weekly sozinha nao enxergava a conclusao de hoje na outra. Quem
    /// chama passa as Dailies das OUTRAS Weeklies em <paramref name="otherWeekliesDailies"/>
    /// (a Application e quem enxerga todas - ver DailySequencing.DailiesOfOtherWeeklies); null =
    /// so esta Weekly conta (comportamento de antes, usado por testes de dominio isolados).
    /// Tambem nessa fase: a Daily de REFORCO fica de fora de (c) - e uma sessao extra gerada pela
    /// propria conclusao de hoje (a tela de conclusao ate oferece o botao na hora), entao a cota
    /// diaria que aquela conclusao acabou de gastar nao pode barra-la; (b) continua valendo
    /// (uma Daily em andamento por vez).
    /// Fase 55 (decisao do dono, 21/09/2026): o reforco tambem nao CONSOME a cota - so conclusoes
    /// de Dailies originais (nao-reforco) contam pra "uma por dia". Sem isso, fazer o reforco de
    /// um dia fraco antes da Daily do dia adiaria a Daily do dia pra amanha.
    ///
    /// Fase 38b (corrige bug real, 14->15/09/2026): antes, essa barreira comparava Daily.Date
    /// (fixado de uma vez so na matricula, 1 dia util por Daily - ver EnrollUserInCourseUseCase)
    /// com "hoje". Qualquer folga entre esse ritmo hipotetico e o ritmo real do aluno pulava
    /// Dailies inteiras (relatado ao vivo: concluir a Daily 1 num dia so liberou calendarmente a
    /// Daily 4, deixando 2 e 3 presas em Locked pra sempre, sem nunca virar "a vez delas"). Agora
    /// a barreira e sempre sequencial (isNextInSequence), nunca mais calendario.
    /// </summary>
    public DailyAccessMode EvaluateDailyAccess(
        Guid dailyId, DateOnly today, bool isNextInSequence, IEnumerable<Daily>? otherWeekliesDailies = null)
    {
        var target = _dailies.FirstOrDefault(d => d.Id == dailyId)
            ?? throw new DomainException("Daily nao encontrada nesta Weekly.", "daily_nao_encontrada");

        // InProgress retoma de onde parou independente da posicao na sequencia - e o que permite
        // "recuperar" uma Daily abandonada, mesmo que uma mais antiga ainda esteja pendente.
        if (target.Status == DailyStatus.InProgress)
            return DailyAccessMode.Resume;

        if (target.Status == DailyStatus.Completed)
        {
            if (target.Date == today)
                return DailyAccessMode.Replay;

            var hasAnyInProgress = _dailies.Any(d => d.Status == DailyStatus.InProgress);
            return hasAnyInProgress ? DailyAccessMode.ReadOnly : DailyAccessMode.Replay;
        }

        // Ainda nao iniciada (Locked/Available).
        if (!target.IsReinforcement && !isNextInSequence)
            throw new DomainException("Esta Daily ainda nao foi liberada - conclua as anteriores primeiro.", "daily_bloqueada");

        // Matricula inteira (Fase 54), nao so esta Weekly - ver o comentario do metodo.
        var enrollmentDailies = otherWeekliesDailies is null ? _dailies : _dailies.Concat(otherWeekliesDailies).ToList();

        var otherInProgress = enrollmentDailies.Any(d => d.Id != target.Id && d.Status == DailyStatus.InProgress);
        if (otherInProgress)
        {
            throw new DomainException(
                "Ja existe uma Daily em andamento. Conclua-a (ou retome-a) antes de iniciar outra.",
                "daily_em_andamento");
        }

        // Reforco fica de fora da cota diaria nos dois sentidos (Fase 54: nao e barrado por ela;
        // Fase 55: a conclusao dele tambem nao a consome) - ver o comentario do metodo.
        if (!target.IsReinforcement)
        {
            // CompletedAt e gravado em UTC (Daily.Complete), mas "today" chega em hora local (mesma
            // convencao de IClock.Today - ver SystemClock) - sem ToLocalTime aqui, a comparacao falha
            // sempre que UTC e hora local caem em datas diferentes (qualquer horario da noite no
            // fuso do Brasil, por exemplo).
            var completedToday = enrollmentDailies.Any(d =>
                !d.IsReinforcement
                && d.CompletedAt.HasValue && DateOnly.FromDateTime(d.CompletedAt.Value.ToLocalTime()) == today);
            if (completedToday)
            {
                throw new DomainException(
                    "Voce ja concluiu uma Daily hoje (inclusive se foi recuperando um dia atrasado). Volte amanha para continuar.",
                    "daily_limite_diario_atingido");
            }
        }

        return DailyAccessMode.Start;
    }

    /// <summary>Inicia, retoma ou reabre (replay) uma Daily desta Weekly, respeitando EvaluateDailyAccess.</summary>
    public Daily StartOrResumeDaily(
        Guid dailyId, DateOnly today, bool isNextInSequence, IEnumerable<Daily>? otherWeekliesDailies = null)
    {
        var mode = EvaluateDailyAccess(dailyId, today, isNextInSequence, otherWeekliesDailies);
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
