namespace Focadu.Api.Contracts;

public record PurchaseCosmeticItemRequest(Guid? ItemId);

public record EquipCosmeticRequest(Guid? ItemId);

/// <summary>Slot e string ("AvatarFrame"/"NameColor"/"ProfileBanner", case-insensitive) - mesmo padrao ja usado pro "type" de CuratedContent (Fase 4) e "platform" de publicacao (Fase 11).</summary>
public record UnequipCosmeticRequest(string? Slot);
