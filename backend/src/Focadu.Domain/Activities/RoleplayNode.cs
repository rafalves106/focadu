using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>Um nó de diálogo dentro de uma atividade Roleplay (grafo de decisão).</summary>
public class RoleplayNode : Entity
{
    public Guid ActivityId { get; private set; }

    /// <summary>Identificador único dentro da atividade (ex: "start", "node_2a"). Não é o Id técnico.</summary>
    public string NodeKey { get; private set; }

    public string Text { get; private set; }
    public bool IsTerminal { get; private set; }

    /// <summary>Só preenchido quando IsTerminal = true.</summary>
    public TerminalQuality? TerminalQuality { get; private set; }

    private readonly List<RoleplayOption> _options = new();
    public IReadOnlyCollection<RoleplayOption> Options => _options.AsReadOnly();

    private RoleplayNode()
    {
        NodeKey = string.Empty;
        Text = string.Empty;
    }

    internal RoleplayNode(Guid activityId, string nodeKey, string text, bool isTerminal, TerminalQuality? terminalQuality)
    {
        if (string.IsNullOrWhiteSpace(nodeKey))
            throw new DomainException("NodeKey é obrigatório.");
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Texto do node é obrigatório.");
        if (isTerminal && terminalQuality is null)
            throw new DomainException("Um RoleplayNode terminal precisa informar TerminalQuality.");
        if (!isTerminal && terminalQuality is not null)
            throw new DomainException("TerminalQuality só é aplicável a um RoleplayNode terminal.");

        ActivityId = activityId;
        NodeKey = nodeKey;
        Text = text;
        IsTerminal = isTerminal;
        TerminalQuality = terminalQuality;
    }

    public RoleplayOption AddOption(string text, Guid? nextNodeId)
    {
        if (IsTerminal)
            throw new DomainException("Um RoleplayNode terminal não pode ter opções de continuação.");

        var option = new RoleplayOption(Id, text, nextNodeId);
        _options.Add(option);
        return option;
    }
}
