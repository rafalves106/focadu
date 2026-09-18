import type { MonthlyOverviewDto } from '../api/types';

/**
 * Fase 45: um Monthly conta como "ja estudado" pro informativo de certificacoes quando todas as
 * suas Weeklies tem todas as Dailies concluidas - reaproveita dados que MonthlyOverviewDto ja tem
 * (via WeeklyOverviewDto), sem precisar de campo novo no backend so pra isso.
 */
export function isMonthlyComplete(monthly: MonthlyOverviewDto): boolean {
  if (monthly.weeklies.length === 0) return false;
  return monthly.weeklies.every((weekly) => weekly.totalDailies > 0 && weekly.completedDailies === weekly.totalDailies);
}
