using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>
/// Caso de uso: catalogo de cosmeticos (Fase 17) + flags Owned/Equipped pro usuario logado.
/// Reaproveitado por Purchase/Equip/UnequipCosmeticUseCase - cada um so muda o estado e delega a
/// leitura de volta pra este caso de uso, pra nunca duplicar a montagem do DTO em 4 lugares.
/// </summary>
public class GetMarketplaceCatalogUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly IUserGemBalanceRepository _gemBalanceRepository;

    public GetMarketplaceCatalogUseCase(
        ICosmeticItemRepository cosmeticItemRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        IUserEquippedCosmeticsRepository equippedRepository,
        IUserGemBalanceRepository gemBalanceRepository)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _inventoryRepository = inventoryRepository;
        _equippedRepository = equippedRepository;
        _gemBalanceRepository = gemBalanceRepository;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var items = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
        var inventory = await _inventoryRepository.GetByUserIdAsync(userId, cancellationToken);
        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        var gemBalance = await _gemBalanceRepository.GetByUserIdAsync(userId, cancellationToken);

        var ownedItemIds = inventory.Select(e => e.CosmeticItemId).ToHashSet();
        var equippedItemIds = EquippedItemIds(equipped);

        var itemDtos = items
            .OrderBy(i => i.Slot).ThenBy(i => i.PriceGems)
            .Select(i => new CosmeticItemDto(
                i.Id, i.Name, i.Slot, i.Rarity, i.PriceGems, ownedItemIds.Contains(i.Id), equippedItemIds.Contains(i.Id)))
            .ToList();

        return new MarketplaceCatalogDto(gemBalance?.TotalGems ?? 0, itemDtos);
    }

    private static HashSet<Guid> EquippedItemIds(UserEquippedCosmetics? equipped)
    {
        if (equipped is null) return [];

        return new[] { equipped.EquippedFrameId, equipped.EquippedNameColorId, equipped.EquippedBannerId }
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();
    }
}

public record CosmeticItemDto(Guid Id, string Name, CosmeticSlot Slot, CosmeticRarity Rarity, int PriceGems, bool Owned, bool Equipped);

public record MarketplaceCatalogDto(int TotalGems, IReadOnlyCollection<CosmeticItemDto> Items);
