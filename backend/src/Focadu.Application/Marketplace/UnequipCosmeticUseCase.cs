using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>Caso de uso: desequipa o slot informado (Fase 17) - no-op (nunca erro) se o usuario nunca equipou nada ainda.</summary>
public class UnequipCosmeticUseCase
{
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;

    public UnequipCosmeticUseCase(
        IUserEquippedCosmeticsRepository equippedRepository, GetMarketplaceCatalogUseCase getCatalog, IUnitOfWork unitOfWork)
    {
        _equippedRepository = equippedRepository;
        _getCatalog = getCatalog;
        _unitOfWork = unitOfWork;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, CosmeticSlot slot, CancellationToken cancellationToken = default)
    {
        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        if (equipped is not null)
        {
            equipped.Unequip(slot);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
