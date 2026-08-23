import { Link } from 'react-router-dom';
import { WeeklyProjectStatus, type WeeklyProjectDto } from '../api/types';
import { StatusBadge } from './StatusBadge';
import type { StatusBadgeTone } from '../lib/statusBadge';

const STATUS_BADGE: Record<WeeklyProjectStatus, { icon: string; label: string; tone: StatusBadgeTone }> = {
  [WeeklyProjectStatus.Pending]: { icon: '⭕', label: 'PENDENTE', tone: 'muted' },
  [WeeklyProjectStatus.Submitted]: { icon: '🔄', label: 'AGUARDANDO AVALIAÇÃO', tone: 'project' },
  [WeeklyProjectStatus.Evaluated]: { icon: '✅', label: 'AVALIADO', tone: 'accent' },
};

/**
 * Card do projeto pratico da semana (Fase 8) - usado no StartDashboard ("Projeto desta Semana") e
 * na WeeklyDetailPage ("card destacado"). WeeklyProjectDto so tem SpecText como texto livre (ver
 * Fase 7) - sem titulo separado, o resumo (line-clamp) e o proprio SpecText.
 */
export function WeeklyProjectCard({
  project,
  weeklyId,
  courseId,
}: {
  project: WeeklyProjectDto | null;
  weeklyId: string;
  courseId: string | null;
}) {
  if (!project) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-stroke bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Projeto desta semana</p>
        <p className="text-sm text-secondary">Nenhum projeto definido ainda para esta semana.</p>
      </div>
    );
  }

  const badge = STATUS_BADGE[project.status];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-project/40 bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-project">Projeto desta Semana</p>
          {/* Fase 20 (Figma "visao-semanal"): rotulo decorativo fixo ("chefe de fase", mesma
              linguagem ja usada em WeeklyProjectPage) - nao e dado do usuario, so identifica o
              tipo de card. */}
          <span className="rounded-full border border-project bg-project/25 px-2 py-0.5 text-[10px] font-bold tracking-wide text-project">
            BOSS
          </span>
        </div>
        <StatusBadge {...badge} />
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-secondary">{project.specText}</p>
      <Link
        to={`/start?course=${courseId ?? ''}&weekly=${weeklyId}&project=1`}
        className="self-start rounded-xl bg-project px-5 py-2.5 text-sm font-bold text-base"
      >
        Ver Projeto
      </Link>
    </div>
  );
}
