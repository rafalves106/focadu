using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Marketplace;

/// <summary>
/// Caso de uso: cria o agente em pixel art (Fase 71) - tom de pele escolhido, kit basico (moletom,
/// calca, tenis) e 1 cabelo natural opcional, tudo de graca: entram no inventario e ja saem equipados.
/// Uma vez so por usuario (409 se o agente ja existe); depois disso a pele se troca por
/// UpdateAgentSkinToneUseCase e as pecas pela Loja/guarda-roupa.
/// </summary>
public class CreateAgentUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedRepository;
    private readonly GetMarketplaceCatalogUseCase _getCatalog;
    private readonly IUnitOfWork _unitOfWork;

    public CreateAgentUseCase(
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

    public async Task<MarketplaceCatalogDto> ExecuteAsync(Guid userId, int skinTone, string? hairCode, CancellationToken cancellationToken = default)
    {
        if (skinTone < 1 || skinTone > UserEquippedCosmetics.SkinToneCount)
            throw new ValidationException("pele_invalida", $"O tom de pele precisa estar entre 1 e {UserEquippedCosmetics.SkinToneCount}.");
        if (hairCode is not null && !AgentStarter.NaturalHairCodes.Contains(hairCode))
            throw new ValidationException("cabelo_invalido", "O cabelo gratis precisa ser um dos cabelos naturais.");

        var equipped = await _equippedRepository.GetByUserIdAsync(userId, cancellationToken);
        if (equipped is { HasAgent: true })
            throw new ConflictException("agente_ja_criado", "Seu agente ja foi criado.");

        var catalog = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
        var codes = hairCode is null ? AgentStarter.KitCodes : [.. AgentStarter.KitCodes, hairCode];
        var pieces = codes.Select(code => catalog.FirstOrDefault(i => i.Code == code)
            ?? throw new NotFoundException("item_nao_encontrado", $"Peca '{code}' nao existe no catalogo - rode o seed.")).ToList();

        if (equipped is null)
        {
            equipped = new UserEquippedCosmetics(userId);
            await _equippedRepository.AddAsync(equipped, cancellationToken);
        }

        equipped.CreateAgent(skinTone);
        foreach (var piece in pieces)
        {
            if (await _inventoryRepository.GetByUserAndItemAsync(userId, piece.Id, cancellationToken) is null)
                await _inventoryRepository.AddAsync(new UserCosmeticInventory(userId, piece.Id), cancellationToken);
            equipped.Equip(piece.Slot, piece.Id);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await _getCatalog.ExecuteAsync(userId, cancellationToken);
    }
}
