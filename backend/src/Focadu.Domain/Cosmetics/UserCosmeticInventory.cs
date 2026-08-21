using Focadu.Domain.Common;

namespace Focadu.Domain.Cosmetics;

/// <summary>
/// Registro de posse: este User comprou este CosmeticItem, permanentemente (Fase 17 - "sem usar
/// e perder", ver docs/fase-17). Comprar nao equipa automaticamente - acoes separadas
/// (PurchaseCosmeticItemUseCase/EquipCosmeticUseCase). Duplicidade (mesmo User+Item 2x) e
/// rejeitada na Application (ConflictException) - o indice unico no banco (UserId, CosmeticItemId)
/// e so a segunda garantia, mesmo padrao ja usado em Enrollment/Referral.
/// </summary>
public class UserCosmeticInventory : Entity
{
    public Guid UserId { get; private set; }
    public Guid CosmeticItemId { get; private set; }
    public DateTime AcquiredAt { get; private set; }

    private UserCosmeticInventory()
    {
    }

    public UserCosmeticInventory(Guid userId, Guid cosmeticItemId)
    {
        UserId = userId;
        CosmeticItemId = cosmeticItemId;
        AcquiredAt = DateTime.UtcNow;
    }
}
