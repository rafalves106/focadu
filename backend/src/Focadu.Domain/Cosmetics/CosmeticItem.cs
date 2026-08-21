using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Cosmetics;

/// <summary>
/// Um item cosmetico compravel na loja (Fase 17) - catalogo fixo via seed, sem autoria via Api
/// nesta fase (mesmo tratamento que a estrutura curricular tem desde a Fase 13, so CuratedContent
/// tem autoria de verdade). AssetUrl/IsAnimated ficam prontos pro dia em que existir arte real -
/// sem Figma validado ainda pra este componente (ver docs/fase-17), a UI usa cor por raridade como
/// placeholder (CosmeticRarity), nao inventa ilustracao nenhuma.
/// </summary>
public class CosmeticItem : Entity
{
    public string Name { get; private set; }
    public CosmeticSlot Slot { get; private set; }
    public CosmeticRarity Rarity { get; private set; }
    public int PriceGems { get; private set; }

    /// <summary>Nulo ate arte real existir - Fase 17 nunca preenche isso, so o seed dos 8 itens iniciais.</summary>
    public string? AssetUrl { get; private set; }

    /// <summary>Sempre false nesta fase - reservado pro dia em que existir arte animada.</summary>
    public bool IsAnimated { get; private set; }

    private CosmeticItem()
    {
        Name = string.Empty;
    }

    public CosmeticItem(string name, CosmeticSlot slot, CosmeticRarity rarity, int priceGems)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nome do item cosmetico e obrigatorio.");
        if (priceGems < 0)
            throw new DomainException("Preco em Gems nao pode ser negativo.");

        Name = name.Trim();
        Slot = slot;
        Rarity = rarity;
        PriceGems = priceGems;
        IsAnimated = false;
    }
}
