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
/// Fase 71: item com arte em pixel art so se compra se estiver na vitrine desta semana do usuario
/// (ShopShowcase) e com o agente ja criado; peca do kit basico nunca e vendida.
/// </summary>
public class PurchaseCosmeticItemUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly GamificationCreditor _gamificationCreditor;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public PurchaseCosmeticItemUseCase(
        ICosmeticItemRepository cosmeticItemRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        IUserEquippedCosmeticsRepository equippedRepository,
        GamificationCreditor gamificationCreditor,
        GetMarketplaceCatalogUseCase getCatalog,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _inventoryRepository = inventoryRepository;
        _equippedRepository = equippedRepository;
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

        if (item.IsStarter)
            throw new ConflictException("item_do_kit_basico", "Esta peca faz parte do kit basico - ela vem de graca na criacao do agente.");

        if (item.Code is not null)
        {
            var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
            if (equipped is not { HasAgent: true })
                throw new ConflictException("agente_nao_criado", "Crie seu agente antes de comprar roupas.");

            var inventory = await _inventoryRepository.GetByUserIdAsync(userId, cancellationToken);
            var catalog = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
            var today = _clock.Today();
            var showcase = ShopShowcase.Draw(catalog, ShopShowcase.OwnedBeforeWeek(inventory, today), userId, today);
            if (showcase.All(i => i.Id != itemId))
                throw new ConflictException("item_fora_da_vitrine", "Este item nao esta na sua vitrine desta semana.");
        }

        var gemBalance = await _gamificationCreditor.GetOrCreateGemBalanceAsync(userId, _clock.Today(), cancellationToken);
        if (!gemBalance.TrySpend(item.PriceGems))
            throw new ConflictException("gems_insuficientes", "Voce nao tem Gems suficientes pra comprar este item.");

        await _inventoryRepository.AddAsync(new UserCosmeticInventory(userId, itemId), cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
