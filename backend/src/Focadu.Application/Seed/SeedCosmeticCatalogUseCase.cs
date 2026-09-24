using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Seed;

/// <summary>
/// Popula o catalogo fixo de cosmeticos da loja - sem autoria via Api, mesmo tratamento que
/// SeedWebSecurityCourseUseCase da ao curriculo. Acionado pelo mesmo `dotnet run -- seed` que ja
/// popula o curso piloto (ver Program.cs).
/// Dois blocos com idempotencia diferente:
/// - os 8 itens da Fase 17 (sem arte, sem Code) so entram num banco sem nenhum cosmetico, como antes;
/// - as pecas em pixel art (Fase 71, com Code) entram por Code: cada rodada insere so as que faltam,
///   entao uma leva nova de roupas chega em producao so acrescentando a linha aqui e rodando o seed.
///   Preco/raridade de uma peca ja inserida NAO sao atualizados (mesma limitacao do seed do curriculo).
/// Arte das pecas: Figma "Focadu — Pixel Art", pagina "Personagens — corpo, roupas e loja";
/// precos e raridades decididos em secret/rascunhos/loja-raridade-e-vitrine.md.
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

    /// <returns>Quantos itens foram inseridos nesta rodada (0 = catalogo ja estava completo).</returns>
    public async Task<int> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var existing = await _cosmeticItemRepository.GetAllAsync(cancellationToken);
        var toInsert = new List<CosmeticItem>();

        if (existing.Count == 0)
            toInsert.AddRange(LegacyCatalog());

        var existingCodes = existing.Where(i => i.Code is not null).Select(i => i.Code!).ToHashSet();
        toInsert.AddRange(PixelCatalog().Where(i => !existingCodes.Contains(i.Code!)));

        foreach (var item in toInsert)
        {
            await _cosmeticItemRepository.AddAsync(item, cancellationToken);
        }

        if (toInsert.Count > 0)
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        return toInsert.Count;
    }

    /// <summary>Precos/raridades conforme a tabela do prompt da Fase 17 - ainda sem arte (entram na vitrine depois do redesenho em pixel art).</summary>
    private static IReadOnlyCollection<CosmeticItem> LegacyCatalog() =>
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

    /// <summary>Kit basico (gratis na criacao do agente) + Leva 1 da loja (Fase 71).</summary>
    internal static IReadOnlyCollection<CosmeticItem> PixelCatalog() =>
    [
        new CosmeticItem("Moletom", CosmeticSlot.Top, CosmeticRarity.Common, 0, "parte-de-cima/moletom", isStarter: true),
        new CosmeticItem("Calça", CosmeticSlot.Bottom, CosmeticRarity.Common, 0, "parte-de-baixo/calca", isStarter: true),
        new CosmeticItem("Tênis", CosmeticSlot.Shoes, CosmeticRarity.Common, 0, "tenis/tenis", isStarter: true),

        new CosmeticItem("Camiseta cinza", CosmeticSlot.Top, CosmeticRarity.Common, 15, "parte-de-cima/camiseta"),
        new CosmeticItem("Camisa social + gravata", CosmeticSlot.Top, CosmeticRarity.Rare, 35, "parte-de-cima/camisa-social"),
        new CosmeticItem("Jaqueta âmbar aberta", CosmeticSlot.Top, CosmeticRarity.Rare, 45, "parte-de-cima/jaqueta"),
        new CosmeticItem("Bermuda âmbar", CosmeticSlot.Bottom, CosmeticRarity.Common, 15, "parte-de-baixo/bermuda"),
        new CosmeticItem("Calça jogger clara", CosmeticSlot.Bottom, CosmeticRarity.Common, 20, "parte-de-baixo/jogger"),
        new CosmeticItem("Saia vermelha", CosmeticSlot.Bottom, CosmeticRarity.Common, 20, "parte-de-baixo/saia"),
        new CosmeticItem("Cabelo curto", CosmeticSlot.Hair, CosmeticRarity.Common, 15, "cabelo/curto"),
        new CosmeticItem("Cabelo longo âmbar", CosmeticSlot.Hair, CosmeticRarity.Common, 15, "cabelo/longo"),
        new CosmeticItem("Black power", CosmeticSlot.Hair, CosmeticRarity.Common, 15, "cabelo/black-power"),
        new CosmeticItem("Boné vermelho", CosmeticSlot.Hair, CosmeticRarity.Rare, 40, "cabelo/bone"),
        new CosmeticItem("Capacete com visor", CosmeticSlot.Hair, CosmeticRarity.Epic, 80, "cabelo/capacete"),
        new CosmeticItem("Tênis preto sola branca", CosmeticSlot.Shoes, CosmeticRarity.Common, 15, "tenis/preto"),
        new CosmeticItem("Bota âmbar", CosmeticSlot.Shoes, CosmeticRarity.Rare, 35, "tenis/bota"),
        new CosmeticItem("Tênis cano alto vermelho", CosmeticSlot.Shoes, CosmeticRarity.Rare, 40, "tenis/cano-alto"),
    ];
}
