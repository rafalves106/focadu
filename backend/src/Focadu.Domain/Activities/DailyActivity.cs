using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Uma atividade dentro de uma Daily (Quiz, WordMatch, Cloze ou Roleplay), na posição OrderIndex
/// da sequência do dia. Concentra as tentativas de resposta (ActivityResponse) e, quando aplicável,
/// as opções de quiz/roleplay que a compõem.
/// </summary>
public class DailyActivity : Entity
{
    public Guid DailyId { get; private set; }
    public ActivityType Type { get; private set; }

    /// <summary>Define a sequência da atividade dentro da Daily.</summary>
    public int OrderIndex { get; private set; }

    /// <summary>Referência ao CuratedContent de origem. Nulo quando a atividade não deriva de um conteúdo (ex: leitura/vídeo em si).</summary>
    public Guid? ContentId { get; private set; }

    /// <summary>Enunciado da atividade (pergunta do Quiz, termo do WordMatch, contexto do Cloze/Roleplay). Sempre visível ao cliente, nunca redigido - é o que o usuário responde.</summary>
    public string? Prompt { get; private set; }

    public ActivityStatus Status { get; private set; }

    /// <summary>Usado no Cloze em modo texto livre/código, para conferência da resposta esperada.</summary>
    public string? ExpectedAnswer { get; private set; }

    public AnswerMode AnswerMode { get; private set; }

    private readonly List<ActivityResponse> _responses = new();

    /// <summary>Histórico completo de tentativas, da mais antiga para a mais recente. Nunca sobrescrito.</summary>
    public IReadOnlyCollection<ActivityResponse> Responses => _responses.AsReadOnly();

    private readonly List<QuizOption> _quizOptions = new();
    public IReadOnlyCollection<QuizOption> QuizOptions => _quizOptions.AsReadOnly();

    private readonly List<RoleplayNode> _roleplayNodes = new();
    public IReadOnlyCollection<RoleplayNode> RoleplayNodes => _roleplayNodes.AsReadOnly();

    private DailyActivity()
    {
    }

    internal DailyActivity(
        Guid dailyId,
        ActivityType type,
        int orderIndex,
        AnswerMode answerMode,
        string? prompt,
        Guid? contentId,
        string? expectedAnswer)
    {
        if (orderIndex < 0)
            throw new DomainException("OrderIndex não pode ser negativo.");

        DailyId = dailyId;
        Type = type;
        OrderIndex = orderIndex;
        AnswerMode = answerMode;
        Prompt = prompt;
        ContentId = contentId;
        ExpectedAnswer = expectedAnswer;
        Status = ActivityStatus.Pending;
    }

    /// <summary>
    /// Clona a definição desta atividade (tipo, ordem, modo de resposta, conteúdo de origem e
    /// opções de quiz) para uso em uma Daily de reforço. Não copia respostas nem roleplay nodes
    /// já percorridos — a atividade de reforço começa do zero (Pending).
    /// </summary>
    internal DailyActivity CloneForReinforcement(Guid newDailyId, int orderIndex)
    {
        var clone = new DailyActivity(newDailyId, Type, orderIndex, AnswerMode, Prompt, ContentId, ExpectedAnswer);
        foreach (var option in _quizOptions)
        {
            clone.AddQuizOption(option.Text, option.IsCorrect);
        }

        return clone;
    }

    public QuizOption AddQuizOption(string text, bool isCorrect)
    {
        if (Type is not (ActivityType.Quiz or ActivityType.WordMatch))
            throw new DomainException("QuizOption só pode ser adicionada a atividades do tipo Quiz ou WordMatch.");

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

    /// <summary>
    /// Registra uma nova tentativa de resposta. Só pode ser chamado pela Daily dona da atividade
    /// (via Daily.SubmitActivityResponse), que é quem decide se a tentativa conta para penalidade
    /// (primeira rodada) ou é uma repetição (replay, sem efeito em PenaltyPoints).
    /// </summary>
    internal ActivityResponse RecordResponse(int score, string? transcript, string? aiFeedback)
    {
        var attemptNumber = _responses.Count + 1;
        var response = new ActivityResponse(Id, attemptNumber, score, transcript, aiFeedback);
        _responses.Add(response);
        Status = ActivityStatus.Completed;
        return response;
    }

    /// <summary>True se ao menos uma tentativa registrada para esta atividade não atingiu o critério de aprovação.</summary>
    public bool HasFailedAtLeastOnce => _responses.Any(r => !r.Passed);
}
