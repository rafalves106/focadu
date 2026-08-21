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

    /// <summary>Enunciado da atividade (pergunta do Quiz, termo do WordMatch, contexto do Cloze/Roleplay). Sempre visível ao cliente, nunca redigido - é o que o usuário responde.</summary>
    public string? Prompt { get; private set; }

    /// <summary>Usado no Cloze em modo texto livre/código, para conferência da resposta esperada.</summary>
    public string? ExpectedAnswer { get; private set; }

    public AnswerMode AnswerMode { get; private set; }

    private readonly List<QuizOption> _quizOptions = new();
    public IReadOnlyCollection<QuizOption> QuizOptions => _quizOptions.AsReadOnly();

    private readonly List<RoleplayNode> _roleplayNodes = new();
    public IReadOnlyCollection<RoleplayNode> RoleplayNodes => _roleplayNodes.AsReadOnly();

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
    /// Clona a definição desta atividade (tipo, ordem, modo de resposta, conteúdo de origem e
    /// opções de quiz) para uso num DailyTemplate sintético de reforço (ver DailyTemplate). Não
    /// copia roleplay nodes - reforco so acontece hoje pra Quiz/WordMatch/Cloze (ver
    /// Daily.GetFailedActivities + o tipo das atividades do seed); se um Roleplay reprovado
    /// precisar de reforco no futuro, RoleplayNode/Options tambem precisam ser clonados aqui.
    /// </summary>
    internal DailyActivity CloneForReinforcement(Guid newDailyTemplateId, int orderIndex)
    {
        var clone = new DailyActivity(newDailyTemplateId, Type, orderIndex, AnswerMode, Prompt, ContentId, ExpectedAnswer);
        foreach (var option in _quizOptions)
        {
            clone.AddQuizOption(option.Text, option.IsCorrect);
        }

        return clone;
    }

    /// <summary>
    /// Quiz/WordMatch: as opções da pergunta/termo. Cloze com AnswerMode = MultipleChoice
    /// (Fase 4): as opções pra preencher a lacuna - mesmo mecanismo, só reaproveitado.
    /// </summary>
    public QuizOption AddQuizOption(string text, bool isCorrect)
    {
        var allowed = Type is ActivityType.Quiz or ActivityType.WordMatch
            || (Type == ActivityType.Cloze && AnswerMode == AnswerMode.MultipleChoice);
        if (!allowed)
        {
            throw new DomainException(
                "QuizOption só pode ser adicionada a atividades do tipo Quiz, WordMatch, ou Cloze com AnswerMode MultipleChoice.");
        }

        var option = new QuizOption(Id, text, isCorrect);
        _quizOptions.Add(option);
        return option;
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
