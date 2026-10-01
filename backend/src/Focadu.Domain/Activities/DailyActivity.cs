using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Uma atividade dentro de um DailyTemplate (Quiz, WordMatch, Cloze, Roleplay, Reading, Video ou
/// VoiceSummary), na posição OrderIndex da sequência do dia. Curriculo (template) - Fase 13:
/// nunca mais dono de ActivityResponse nem de Status "Pending/Completed" (isso é progresso por
/// usuário, agora vive em `Daily` - instância - que referencia esta atividade por Id). Ainda dono
/// das opções de quiz/roleplay, que são definição, não progresso.
/// </summary>
public class DailyActivity : Entity
{
    public Guid DailyTemplateId { get; private set; }
    public ActivityType Type { get; private set; }

    /// <summary>Define a sequência da atividade dentro do dia.</summary>
    public int OrderIndex { get; private set; }

    /// <summary>Referência ao CuratedContent de origem. Nulo quando a atividade não deriva de um conteúdo (ex: leitura/vídeo em si).</summary>
    public Guid? ContentId { get; private set; }

    /// <summary>
    /// Enunciado da atividade (pergunta do Quiz, contexto do Cloze/Roleplay). Sempre visível ao
    /// cliente, nunca redigido - é o que o usuário responde. WordMatch (Fase 23) normalmente não
    /// usa este campo - o "enunciado" é o proprio conjunto de WordMatchPairs.
    /// </summary>
    public string? Prompt { get; private set; }

    /// <summary>Usado no Cloze em modo texto livre/código, para conferência da resposta esperada.</summary>
    public string? ExpectedAnswer { get; private set; }

    public AnswerMode AnswerMode { get; private set; }

    /// <summary>
    /// CodeStep (Fase 79): a solucao de referencia do passo - so o trecho que o passo acrescenta ao
    /// script, nao o arquivo inteiro. So vai pro cliente depois que o passo acaba (ver
    /// CodeStepProgress) e e o codigo de que o passo seguinte parte quando o aluno nao passou.
    /// </summary>
    public string? CodeSolution { get; private set; }

    /// <summary>CodeStep: o que o trecho imprime rodando contra o arquivo do dia (conferido rodando de verdade na curadoria).</summary>
    public string? CodeExpectedOutput { get; private set; }

    /// <summary>CodeStep: o conceito que a IA cobra no passo. Nunca vai pro cliente.</summary>
    public string? CodeRubric { get; private set; }

    /// <summary>
    /// CodeStep (Fase 86): codigo com que o editor do laboratorio abre neste passo (esqueleto com TODO,
    /// util no 1o passo do dia ou em passo independente). Nulo = editor vazio; nas pontes o editor abre
    /// com o codigo acumulado dos passos anteriores. Nao e segredo.
    /// </summary>
    public string? CodeStarter { get; private set; }

    /// <summary>
    /// CodeStep (Fase 86): o passo sai do laboratorio mesmo que o dia tenha um (<c>"lab": false</c> no
    /// JSON) e cai no fluxo antigo - rodar na maquina do aluno e colar a saida.
    /// </summary>
    public bool LabDisabled { get; private set; }

    /// <summary>
    /// TerminalMission: a lista de missoes (<see cref="TerminalMissions"/>) em JSON. Nao e segredo - o
    /// navegador do aluno precisa dos enunciados e das regras de conferencia pra rodar a missao.
    /// </summary>
    public string? TerminalMissionsJson { get; private set; }

    public IReadOnlyList<TerminalMission> TerminalMissionList => TerminalMissions.Parse(TerminalMissionsJson);

    /// <summary>Terminal v3: a cola "Comandos de hoje" da atividade (vazia em missao curada antes dela).</summary>
    public IReadOnlyList<TerminalCommand> TerminalCommandList => TerminalMissions.ParseCommands(TerminalMissionsJson);

    private readonly List<QuizOption> _quizOptions = new();
    public IReadOnlyCollection<QuizOption> QuizOptions => _quizOptions.AsReadOnly();

    private readonly List<RoleplayNode> _roleplayNodes = new();
    public IReadOnlyCollection<RoleplayNode> RoleplayNodes => _roleplayNodes.AsReadOnly();

    private readonly List<WordMatchPair> _wordMatchPairs = new();

    /// <summary>Pares termo-definição, só pra Type == WordMatch (Fase 23) - ver WordMatchPair.</summary>
    public IReadOnlyCollection<WordMatchPair> WordMatchPairs => _wordMatchPairs.AsReadOnly();

    private DailyActivity()
    {
    }

    internal DailyActivity(
        Guid dailyTemplateId,
        ActivityType type,
        int orderIndex,
        AnswerMode answerMode,
        string? prompt,
        Guid? contentId,
        string? expectedAnswer)
    {
        if (orderIndex < 0)
            throw new DomainException("OrderIndex não pode ser negativo.");
        var requiresContent = type is ActivityType.VoiceSummary or ActivityType.Reading or ActivityType.Video;
        if (requiresContent && contentId is null)
        {
            throw new DomainException(
                $"DailyActivity do tipo {type} precisa de um ContentId (o CuratedContent associado).");
        }

        DailyTemplateId = dailyTemplateId;
        Type = type;
        OrderIndex = orderIndex;
        AnswerMode = answerMode;
        Prompt = prompt;
        ContentId = contentId;
        ExpectedAnswer = expectedAnswer;
    }

    /// <summary>
    /// Clona a definição desta atividade (tipo, ordem, modo de resposta, conteúdo de origem,
    /// opções de quiz e pares de WordMatch) para uso num DailyTemplate sintético de reforço (ver
    /// DailyTemplate). Não copia roleplay nodes - reforco so acontece hoje pra Quiz/WordMatch/
    /// Cloze (ver Daily.GetFailedActivities + o tipo das atividades do seed); se um Roleplay
    /// reprovado precisar de reforco no futuro, RoleplayNode/Options tambem precisam ser clonados
    /// aqui. WordMatch (Fase 23): a atividade inteira é 1 unico grupo de pares - reprovar (nao
    /// bater o PassingScore) clona TODOS os pares de volta pro reforco, mesmo os que o usuario
    /// acertou individualmente; nao ha granularidade menor que "a atividade toda", pelo mesmo
    /// motivo que o reforco de Quiz nao clona "so a alternativa errada".
    /// </summary>
    internal DailyActivity CloneForReinforcement(Guid newDailyTemplateId, int orderIndex)
    {
        var clone = new DailyActivity(newDailyTemplateId, Type, orderIndex, AnswerMode, Prompt, ContentId, ExpectedAnswer);
        foreach (var option in _quizOptions)
        {
            clone.AddQuizOption(option.Text, option.IsCorrect);
        }
        foreach (var pair in _wordMatchPairs)
        {
            clone.AddWordMatchPair(pair.Term, pair.Definition);
        }

        clone.TerminalMissionsJson = TerminalMissionsJson;
        return clone;
    }

    /// <summary>
    /// CodeStep (Fase 79): solucao de referencia, saida esperada e rubrica do passo - as tres
    /// obrigatorias, sem elas a IA nao tem contra o que conferir.
    /// </summary>
    public void ConfigureCodeStep(string solution, string expectedOutput, string rubric, string? starter = null, bool labDisabled = false)
    {
        if (Type != ActivityType.CodeStep)
            throw new DomainException("Solucao/saida/rubrica de codigo so valem pra atividades do tipo CodeStep.");
        if (string.IsNullOrWhiteSpace(solution) || string.IsNullOrWhiteSpace(expectedOutput) || string.IsNullOrWhiteSpace(rubric))
            throw new DomainException("Um CodeStep precisa de solucao, saida esperada e rubrica.");

        CodeSolution = solution;
        CodeExpectedOutput = expectedOutput;
        CodeRubric = rubric;
        SetLabOptions(starter, labDisabled);
    }

    /// <summary>Missao no terminal: define as missoes do bloco (validadas por <see cref="TerminalMissions.Create"/>).</summary>
    public void ConfigureTerminalMissions(IEnumerable<TerminalMission> missions, string? prompt = null, IEnumerable<TerminalCommand>? commands = null)
    {
        if (Type != ActivityType.TerminalMission)
            throw new DomainException("Missoes so valem pra atividades do tipo TerminalMission.");

        TerminalMissionsJson = TerminalMissions.Serialize(TerminalMissions.Create(missions), TerminalMissions.CreateCommands(commands));
        if (prompt is not null) Prompt = prompt;
    }

    /// <summary>Abre espaco pra uma atividade nova no meio do dia (ver <see cref="Dailies.DailyTemplate.InsertActivity"/>).</summary>
    internal void ShiftOrder(int by) => OrderIndex += by;

    /// <summary>
    /// CodeStep (Fase 86): codigo inicial do editor e opt-out do laboratorio. Separado de
    /// <see cref="ConfigureCodeStep"/> pra o sync poder atualizar um passo ja no banco sem tocar na
    /// solucao, na saida esperada nem na rubrica.
    /// </summary>
    public void SetLabOptions(string? starter, bool labDisabled)
    {
        if (Type != ActivityType.CodeStep)
            throw new DomainException("Codigo inicial e opt-out do laboratorio so valem pra atividades do tipo CodeStep.");

        CodeStarter = string.IsNullOrWhiteSpace(starter) ? null : starter;
        LabDisabled = labDisabled;
    }

    /// <summary>
    /// Quiz: as opções da pergunta. Cloze com AnswerMode = MultipleChoice (Fase 4): as opções pra
    /// preencher a lacuna - mesmo mecanismo, só reaproveitado. WordMatch usa AddWordMatchPair
    /// desde a Fase 23, não isto.
    /// </summary>
    public QuizOption AddQuizOption(string text, bool isCorrect)
    {
        var allowed = Type == ActivityType.Quiz
            || (Type == ActivityType.Cloze && AnswerMode == AnswerMode.MultipleChoice);
        if (!allowed)
        {
            throw new DomainException(
                "QuizOption só pode ser adicionada a atividades do tipo Quiz, ou Cloze com AnswerMode MultipleChoice.");
        }

        var option = new QuizOption(Id, text, isCorrect);
        _quizOptions.Add(option);
        return option;
    }

    /// <summary>
    /// Um par termo-definição do grupo de WordMatch que esta DailyActivity representa (Fase 23) -
    /// ver WordMatchPair pra por que Term/Definition tem ids separados.
    /// </summary>
    public WordMatchPair AddWordMatchPair(string term, string definition)
    {
        if (Type != ActivityType.WordMatch)
            throw new DomainException("WordMatchPair só pode ser adicionado a atividades do tipo WordMatch.");

        var pair = new WordMatchPair(Id, term, definition);
        _wordMatchPairs.Add(pair);
        return pair;
    }

    public RoleplayNode AddRoleplayNode(string nodeKey, string text, bool isTerminal = false, TerminalQuality? terminalQuality = null)
    {
        if (Type != ActivityType.Roleplay)
            throw new DomainException("RoleplayNode só pode ser adicionado a atividades do tipo Roleplay.");
        if (_roleplayNodes.Any(n => n.NodeKey == nodeKey))
            throw new DomainException($"Já existe um RoleplayNode com a chave '{nodeKey}' nesta atividade.");

        var node = new RoleplayNode(Id, nodeKey, text, isTerminal, terminalQuality);
        _roleplayNodes.Add(node);
        return node;
    }
}
