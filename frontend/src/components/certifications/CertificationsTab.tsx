import type { MonthlyOverviewDto } from '../../api/types';
import { StatusBadge } from '../StatusBadge';
import { isMonthlyComplete } from '../../lib/certifications';
import { EmptyStateError } from '../errors/EmptyStateError';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';

/**
 * Fase 45: informativo de certificações de mercado que o currículo já cobre (curadoria estática,
 * ver secret/curadoria/CURADORIA.md §6) - a Focadu não emite certificação nenhuma, só informa.
 * Reaproveita `course.monthlies` já carregado por CourseDetailPage (sem endpoint novo).
 */
export function CertificationsTab({ monthlies }: { monthlies: MonthlyOverviewDto[] }) {
  const hasAnyCoverage = monthlies.some((m) => m.certifications.length > 0);

  if (!hasAnyCoverage) {
    return (
      <EmptyStateError
        title="Nenhuma certificação mapeada ainda"
        description="Este curso ainda não tem certificações de mercado mapeadas por módulo."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-secondary">
        Conteúdo informativo: a Focadu não emite certificação nenhuma, só mostra quais certificações de mercado o
        currículo já cobre ou se aproxima de cobrir, módulo a módulo.
      </p>
      {monthlies.map((monthly) => (
        <ModuleCertificationCard key={monthly.id} monthly={monthly} />
      ))}
    </div>
  );
}

function ModuleCertificationCard({ monthly }: { monthly: MonthlyOverviewDto }) {
  const unlocked = isMonthlyComplete(monthly);

  if (monthly.certifications.length === 0) return null;

  return (
    <div className={`rounded-xl border-[1.5px] border-surface-alt bg-surface p-5 ${unlocked ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-primary">
          Módulo {monthly.number}: {monthly.title}
        </p>
        {!unlocked && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-project"><img src={lockIcon} alt="" className="size-4 pixelated" aria-hidden="true" />Ainda não estudado</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {monthly.certifications.map((cert) => (
          <StatusBadge
            key={cert.certificationCode}
            icon="🛡️"
            label={`${cert.certificationName} (${cert.certifier})`}
            tone={unlocked ? 'accent' : 'muted'}
          />
        ))}
      </div>

      {unlocked && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-secondary">
          {monthly.certifications.map((cert) => (
            <li key={cert.certificationCode}>
              <span className="font-semibold text-primary">{cert.certificationCode}:</span> {cert.coveredDomains}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
