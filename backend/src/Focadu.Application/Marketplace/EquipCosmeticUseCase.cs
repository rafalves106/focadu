using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>
/// Caso de uso: equipa um CosmeticItem ja comprado (Fase 17) - exige posse (inventario), nunca
/// deixa equipar algo nao comprado. Equipar um item novo no mesmo slot desequipa o anterior
/// automaticamente (UserEquippedCosmetics.Equip so sobrescreve o campo daquele slot).
/// </summary>
public class EquipCosmeticUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;

    public EquipCosmeticUseCase(
        ICosmeticItemRepository cosmeticItemRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        IUserEquippedCosmeticsRepository equippedRepository,
        GetMarketplaceCatalogUseCase getCatalog,
        IUnitOfWork unitOfWork)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _inventoryRepository = inventoryRepository;
        _equippedRepository = equippedRepository;
        _getCatalog = getCatalog;
        _unitOfWork = unitOfWork;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, Guid itemId, CancellationToken cancellationToken = default)
    {
        var item = await _cosmeticItemRepository.GetByIdAsync(itemId, cancellationToken)
            ?? throw new NotFoundException("item_nao_encontrado", "Item cosmetico nao encontrado.");

        var owned = await _inventoryRepository.GetByUserAndItemAsync(userId, itemId, cancellationToken);
        if (owned is null)
            throw new ConflictException("item_nao_possuido", "Voce precisa comprar este item antes de equipar.");

        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        if (equipped is null)
        {
            equipped = new UserEquippedCosmetics(userId);
            await _equippedRepository.AddAsync(equipped, cancellationToken);
        }

        equipped.Equip(item.Slot, itemId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
