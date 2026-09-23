import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { MonthlyOverviewDto } from '../api/types';
import { PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { EmptyStateError } from '../components/errors/EmptyStateError';
import { isMonthlyComplete } from '../lib/certifications';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';

/**
 * Tela dedicada de certificações (Fase 45) - matriz módulo × certificação completa do curso,
 * roteada via `/start?course=&certifications=1` (mesmo padrão de RankingPage, ancorada num
 * courseId). Reaproveita GET /api/courses/{courseId} (CourseDetailDto já tem tudo, sem endpoint
 * novo). Puramente informativo - a Focadu não emite certificação nenhuma.
 */
export function CertificationsPage({ courseId }: { courseId: string }) {
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);
  const certCodes = course ? uniqueCertificationCodes(course.monthlies) : [];

  return (
    <PageShell title="Certificações" backTo={`/start?course=${courseId}`}>
      <div className="flex flex-col gap-6">
        {loading && <p className="text-sm text-secondary">Carregando certificações...</p>}
        {error && <ApiErrorScreen error={error} onRetry={retry} />}
        {course && (
          <>
            <p className="text-sm text-secondary">
              Conteúdo informativo: a Focadu não emite certificação nenhuma, só mostra quais certificações de mercado
              o currículo de {course.name} já cobre ou se aproxima de cobrir, módulo a módulo.
            </p>

            {certCodes.length === 0 ? (
              <EmptyStateError
                title="Nenhuma certificação mapeada ainda"
                description="Este curso ainda não tem certificações de mercado mapeadas por módulo."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-surface-alt">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-alt bg-surface-alt/40">
                      <th className="p-4 font-semibold text-secondary">Módulo</th>
                      {certCodes.map((code) => (
                        <th key={code} className="p-4 font-semibold text-secondary">
                          {code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {course.monthlies.map((monthly) => (
                      <ModuleRow key={monthly.id} monthly={monthly} certCodes={certCodes} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function ModuleRow({ monthly, certCodes }: { monthly: MonthlyOverviewDto; certCodes: string[] }) {
  const unlocked = isMonthlyComplete(monthly);
  const coverageByCode = new Map(monthly.certifications.map((c) => [c.certificationCode, c]));

  return (
    <tr className={`border-b border-surface-alt last:border-b-0 ${unlocked ? '' : 'opacity-60'}`}>
      <td className="p-4 align-top">
        <p className="font-bold text-primary">
          Módulo {monthly.number}: {monthly.title}
        </p>
        {!unlocked && <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-project"><img src={lockIcon} alt="" className="size-4 pixelated" aria-hidden="true" />Ainda não estudado</p>}
      </td>
      {certCodes.map((code) => {
        const coverage = coverageByCode.get(code);
        return (
          <td key={code} className="p-4 align-top text-secondary">
            {coverage ? (unlocked ? coverage.coveredDomains : '✓') : '—'}
          </td>
        );
      })}
    </tr>
  );
}

function uniqueCertificationCodes(monthlies: MonthlyOverviewDto[]): string[] {
  const codes = new Set<string>();
  for (const monthly of monthlies) {
    for (const cert of monthly.certifications) codes.add(cert.certificationCode);
  }
  return [...codes].sort();
}
