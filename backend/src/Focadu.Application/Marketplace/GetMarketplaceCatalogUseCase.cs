using Focadu.Application.Ports;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>
/// Caso de uso: catalogo de cosmeticos (Fase 17) + flags Owned/Equipped pro usuario logado.
/// Reaproveitado por Purchase/Equip/Unequip e pelos casos de uso do agente - cada um so muda o estado
/// e delega a leitura de volta pra este, pra nunca duplicar a montagem do DTO.
/// Fase 71: devolve tambem o agente em pixel art (tom de pele, nulo = ainda nao criado) e a vitrine da
/// semana (ShopShowcase) - o catalogo inteiro continua indo junto, porque o guarda-roupa e o criador de
/// agente precisam dos itens que nao estao na vitrine.
/// </summary>
public class GetMarketplaceCatalogUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly IUserGemBalanceRepository _gemBalanceRepository;
    private readonly IClock _clock;

    public GetMarketplaceCatalogUseCase(
        ICosmeticItemRepository cosmeticItemRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        IUserEquippedCosmeticsRepository equippedRepository,
        IUserGemBalanceRepository gemBalanceRepository,
        IClock clock)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _inventoryRepository = inventoryRepository;
        _equippedRepository = equippedRepository;
        _gemBalanceRepository = gemBalanceRepository;
        _clock = clock;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var items = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
        var inventory = await _inventoryRepository.GetByUserIdAsync(userId, cancellationToken);
        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        var gemBalance = await _gemBalanceRepository.GetByUserIdAsync(userId, cancellationToken);

        var ownedItemIds = inventory.Select(e => e.CosmeticItemId).ToHashSet();
        var equippedItemIds = EquippedItemIds(equipped);
        var today = _clock.Today();

        var itemDtos = items
            .OrderBy(i => i.Slot).ThenBy(i => i.PriceGems).ThenBy(i => i.Name)
            .Select(i => new CosmeticItemDto(
                i.Id, i.Name, i.Slot, i.Rarity, i.PriceGems, ownedItemIds.Contains(i.Id), equippedItemIds.Contains(i.Id), i.Code, i.IsStarter))
            .ToList();

        var showcase = ShopShowcase.Draw(items, ShopShowcase.OwnedBeforeWeek(inventory, today), userId, today).Select(i => i.Id).ToList();
        var agent = equipped?.SkinTone is { } skinTone ? new AgentDto(skinTone) : null;

        return new MarketplaceCatalogDto(gemBalance?.TotalGems ?? 0, itemDtos, agent, showcase, ShopShowcase.WeekStart(today).AddDays(7));
    }

    private static HashSet<Guid> EquippedItemIds(UserEquippedCosmetics? equipped)
    {
        if (equipped is null) return [];

        return Enum.GetValues<CosmeticSlot>()
            .Select(equipped.EquippedIdFor)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();
    }
}

/// <summary>Code/IsStarter (Fase 71): chave do sprite em pixel art (nulo nos itens sem arte) e se a peca e do kit basico.</summary>
public record CosmeticItemDto(Guid Id, string Name, CosmeticSlot Slot, CosmeticRarity Rarity, int PriceGems, bool Owned, bool Equipped, string? Code, bool IsStarter);

/// <summary>Agente em pixel art do usuario (Fase 71) - por enquanto so o tom de pele; as pecas vem de Equipped nos itens.</summary>
public record AgentDto(int SkinTone);

/// <summary>
/// Agent nulo = agente ainda nao criado. ShowcaseItemIds = vitrine desta semana (ate 6 ids, na ordem
/// do sorteio); ShowcaseRenewsOn = a proxima segunda, quando a vitrine troca.
/// </summary>
public record MarketplaceCatalogDto(
    int TotalGems,
    IReadOnlyCollection<CosmeticItemDto> Items,
    AgentDto? Agent,
    IReadOnlyCollection<Guid> ShowcaseItemIds,
    DateOnly ShowcaseRenewsOn);
