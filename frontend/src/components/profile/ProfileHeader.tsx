import { CosmeticSlot, type GamificationSummaryDto, type MarketplaceCatalogDto } from '../../api/types';
import { EquippedFramePreview } from '../EquippedFramePreview';
import { GemBadge } from '../gamification/GemBadge';
import { StreakIndicator } from '../gamification/StreakIndicator';
import { nameColorClass } from '../../lib/cosmeticStyle';

/** Cabeçalho do `/perfil` (Fase 18) - moldura+iniciais, nome colorido pela Cor do Nome equipada, Gems/Streak reaproveitados do StartDashboard. */
export function ProfileHeader({
  displayName,
  gamification,
  catalog,
}: {
  displayName: string;
  gamification: GamificationSummaryDto;
  catalog: MarketplaceCatalogDto;
}) {
  const equippedFrame = catalog.items.find((i) => i.slot === CosmeticSlot.AvatarFrame && i.equipped) ?? null;
  const equippedNameColor = catalog.items.find((i) => i.slot === CosmeticSlot.NameColor && i.equipped)?.name ?? null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-stroke bg-surface p-6">
      <div className="flex items-center gap-4">
        <EquippedFramePreview displayName={displayName} frameRarity={equippedFrame?.rarity ?? null} size="lg" />
        <h1 className={`text-2xl font-bold ${nameColorClass(equippedNameColor)}`}>{displayName}</h1>
      </div>
      <div className="flex items-center gap-2">
        <GemBadge totalGems={catalog.totalGems} />
        <StreakIndicator currentStreak={gamification.currentStreak} />
      </div>
    </div>
  );
}
