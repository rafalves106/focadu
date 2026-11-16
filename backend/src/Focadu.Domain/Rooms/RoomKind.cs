namespace Focadu.Domain.Rooms;

/// <summary>Tipo de Sala prática (Fase 110, rascunho secret/produto/rascunhos/salas-praticas.md).</summary>
public enum RoomKind
{
    /// <summary>Presa a uma semana do curso: quebra um alvo do tema da semana.</summary>
    Week = 0,

    /// <summary>"Domine o nmap", "Domine o Burp Suite": uma ferramenta a fundo.</summary>
    Tool = 1,

    /// <summary>Cadeia de ataque sem passo a passo; cada tarefa é um elo (reconhecimento, falha, acesso, escalada...).</summary>
    Challenge = 2
}
