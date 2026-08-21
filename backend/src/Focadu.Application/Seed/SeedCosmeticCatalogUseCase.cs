using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Seed;

/// <summary>
/// Popula o catalogo fixo de cosmeticos da loja (Fase 17, 8 itens) - sem autoria via Api nesta
/// fase, mesmo tratamento que SeedWebSecurityCourseUseCase da ao curriculo. Idempotente: se ja
/// existir qualquer CosmeticItem, nao insere nada de novo. Acionado pelo mesmo
/// `dotnet run -- seed` que ja popula o curso piloto (ver Program.cs).
/// </summary>
public class SeedCosmeticCatalogUseCase
{
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SeedCosmeticCatalogUseCase(ICosmeticItemRepository cosmeticItemRepository, IUnitOfWork unitOfWork)
    {
        _cosmeticItemRepository = cosmeticItemRepository;
        _unitOfWork = unitOfWork;
    }

    /// <returns>true se o catalogo ja existia (nada foi inserido).</returns>
    public async Task<bool> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var existing = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
        if (existing.Count > 0) return true;

        foreach (var item in Catalog())
        {
            await _cosmeticItemRepository.AddAsync(item, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return false;
    }

    /// <summary>Precos/raridades conforme a tabela do prompt da Fase 17 - ajustaveis, mas nao ha sinal de desbalanceamento frente ao volume de Gems observado nas Fases 14-16.</summary>
    private static IReadOnlyCollection<CosmeticItem> Catalog() =>
    [
        new CosmeticItem("Moldura Bronze", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, 15),
        new CosmeticItem("Moldura Prata", CosmeticSlot.AvatarFrame, CosmeticRarity.Rare, 40),
        new CosmeticItem("Moldura Ouro", CosmeticSlot.AvatarFrame, CosmeticRarity.Epic, 90),
        new CosmeticItem("Verde Neon", CosmeticSlot.NameColor, CosmeticRarity.Common, 20),
        new CosmeticItem("Vermelho Turbo", CosmeticSlot.NameColor, CosmeticRarity.Rare, 35),
        new CosmeticItem("Gradiente Cockpit", CosmeticSlot.NameColor, CosmeticRarity.Epic, 70),
        new CosmeticItem("Circuito", CosmeticSlot.ProfileBanner, CosmeticRarity.Common, 25),
        new CosmeticItem("Garagem JDM", CosmeticSlot.ProfileBanner, CosmeticRarity.Rare, 50),
    ];
}
