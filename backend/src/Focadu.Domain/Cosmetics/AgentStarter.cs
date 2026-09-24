namespace Focadu.Domain.Cosmetics;

/// <summary>
/// O que todo agente ganha de graca na criacao (Fase 71, decidido pelo dono em 24/09/2026, ver
/// secret/rascunhos/loja-raridade-e-vitrine.md): o kit basico (moletom, calca, tenis) e 1 dos cabelos
/// naturais a escolha. Os cabelos naturais tambem sao vendidos na loja (Comum) - so a 1a escolha e gratis.
/// </summary>
public static class AgentStarter
{
    public static readonly IReadOnlyList<string> KitCodes = ["parte-de-cima/moletom", "parte-de-baixo/calca", "tenis/tenis"];

    public static readonly IReadOnlyList<string> NaturalHairCodes = ["cabelo/curto", "cabelo/longo", "cabelo/black-power"];
}
