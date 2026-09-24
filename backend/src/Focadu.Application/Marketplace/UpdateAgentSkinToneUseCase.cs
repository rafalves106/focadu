using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>Caso de uso: troca o tom de pele do agente (Fase 71) - livre e sem custo, pele nunca e item de loja.</summary>
public class UpdateAgentSkinToneUseCase
{
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateAgentSkinToneUseCase(IUserEquippedCosmeticsRepository equippedRepository, GetMarketplaceCatalogUseCase getCatalog, IUnitOfWork unitOfWork)
    {
        _equippedRepository = equippedRepository;
        _getCatalog = getCatalog;
        _unitOfWork = unitOfWork;
    }

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, int skinTone, CancellationToken cancellationToken = default)
    {
        if (skinTone < 1 || skinTone > UserEquippedCosmetics.SkinToneCount)
            throw new ValidationException("pele_invalida", $"O tom de pele precisa estar entre 1 e {UserEquippedCosmetics.SkinToneCount}.");

        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        if (equipped is not { HasAgent: true })
            throw new ConflictException("agente_nao_criado", "Crie seu agente primeiro.");

        equipped.SetSkinTone(skinTone);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
