using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>Uma opção de continuação de diálogo dentro de um RoleplayNode.</summary>
public class RoleplayOption : Entity
{
    public Guid NodeId { get; private set; }
    public string Text { get; private set; }

    /// <summary>Próximo RoleplayNode ao escolher esta opção. Nulo só é válido se o node de origem for terminal.</summary>
    public Guid? NextNodeId { get; private set; }

    private RoleplayOption()
    {
        Text = string.Empty;
    }

    internal RoleplayOption(Guid nodeId, string text, Guid? nextNodeId)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Texto da opção é obrigatório.");

        NodeId = nodeId;
        Text = text;
        NextNodeId = nextNodeId;
    }
}
