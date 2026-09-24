namespace Focadu.Api.Contracts;

public record PurchaseCosmeticItemRequest(Guid? ItemId);

public record EquipCosmeticRequest(Guid? ItemId);

/// <summary>Slot e string ("AvatarFrame"/"NameColor"/"ProfileBanner"/"Hair", case-insensitive; Top/Bottom/Shoes dao 409, Fase 71) - mesmo padrao ja usado pro "type" de CuratedContent (Fase 4) e "platform" de publicacao (Fase 11).</summary>
public record UnequipCosmeticRequest(string? Slot);

/// <summary>Criacao do agente (Fase 71): SkinTone de 1 a 5; HairCode opcional, um dos cabelos naturais (AgentStarter.NaturalHairCodes).</summary>
public record CreateAgentRequest(int? SkinTone, string? HairCode);

public record UpdateAgentSkinToneRequest(int? SkinTone);
