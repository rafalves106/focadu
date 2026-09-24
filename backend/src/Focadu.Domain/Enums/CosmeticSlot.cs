namespace Focadu.Domain.Enums;

/// <summary>
/// Onde um CosmeticItem pode ser equipado - no maximo 1 item equipado por slot por vez. Os 3
/// primeiros vem da Fase 17 (perfil); Top/Bottom/Hair/Shoes (Fase 71) sao as camadas do agente em
/// pixel art, empilhadas nesta ordem por cima do corpo: Bottom, Shoes, Top, Hair.
/// </summary>
public enum CosmeticSlot
{
    AvatarFrame,
    NameColor,
    ProfileBanner,
    Top,
    Bottom,
    Hair,
    Shoes
}
