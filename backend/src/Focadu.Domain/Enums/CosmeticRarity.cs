namespace Focadu.Domain.Enums;

/// <summary>
/// Raridade de um CosmeticItem. Common/Rare/Epic desde a Fase 17; Legendary (Fase 71) fica
/// reservada pra pets, auras e itens animados - pesa 1% no sorteio da vitrine (ver ShopShowcase).
/// </summary>
public enum CosmeticRarity
{
    Common,
    Rare,
    Epic,
    Legendary
}
