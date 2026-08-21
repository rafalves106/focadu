using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ports;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>
/// Caso de uso: compra um CosmeticItem (Fase 17) - deduz Gems (UserGemBalance.TrySpend) e
/// adiciona ao inventario, PERMANENTEMENTE (sem "usar e perder"). Nao equipa automaticamente -
/// acao separada (EquipCosmeticUseCase). Reaproveita GamificationCreditor.
/// GetOrCreateGemBalanceAsync (Fase 14) - mesmo criterio de "so cria a linha quando precisa
/// mexer nela de verdade".
/// </summary>
public class PurchaseCosmeticItemUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly GamificationCreditor _gamificationCreditor;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public PurchaseCosmeticItemUseCase(
        ICosmeticItemRepository cosmeticItemRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        GamificationCreditor gamificationCreditor,
        GetMarketplaceCatalogUseCase getCatalog,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _inventoryRepository = inventoryRepository;
        _gamificationCreditor = gamificationCreditor;
        _getCatalog = getCatalog;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, Guid itemId, CancellationToken cancellationToken = default)
    {
        var item = await _cosmeticItemRepository.GetByIdAsync(itemId, cancellationToken)
            ?? throw new NotFoundException("item_nao_encontrado", "Item cosmetico nao encontrado.");

        var alreadyOwned = await _inventoryRepository.GetByUserAndItemAsync(userId, itemId, cancellationToken);
        if (alreadyOwned is not null)
            throw new ConflictException("item_ja_possuido", "Voce ja possui este item.");

        var gemBalance = await _gamificationCreditor.GetOrCreateGemBalanceAsync(userId, _clock.Today(), cancellationToken);
        if (!gemBalance.TrySpend(item.PriceGems))
            throw new ConflictException("gems_insuficientes", "Voce nao tem Gems suficientes pra comprar este item.");

        await _inventoryRepository.AddAsync(new UserCosmeticInventory(userId, itemId), cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
