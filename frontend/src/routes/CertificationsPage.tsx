import { useState } from 'react';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { CertificationCoverageDto, MonthlyOverviewDto } from '../api/types';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { EmptyStateError } from '../components/errors/EmptyStateError';
import { PixelPageHeader, PixelPanel } from '../components/PixelPage';
import { ScrollArea } from '../components/ScrollArea';
import { SegmentedBar } from '../components/SegmentedBar';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelChip } from '../components/session/PixelButton';
import { isMonthlyComplete } from '../lib/certifications';
import checkIcon from '../assets/pixel/check.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import capeloIcon from '../assets/pixel/capelo.png';
import shieldIcon from '../assets/pixel/escudo.png';

type ModuleState = 'done' | 'now' | 'lock';

interface CertColumn {
  code: string;
  name: string;
  certifier: string;
}

/**
 * Certificacoes (Fase 45; pixel art na Fase 74, Figma "Certificacoes + Caderninho — v2", node 142:5237)
 * - matriz modulo × certificacao: check verde quando o modulo cobre o exame e ja foi estudado, escudo
 * cinza quando cobre e ainda esta pela frente, "—" quando nao cobre. Clicar numa celula mostra embaixo
 * o que aquele modulo cobre daquele exame (curadoria estatica, `certificacoes.json`). A esquerda, "Ao seu
 * alcance": por certificacao, quantos dos modulos que a cobrem ja foram estudados. Puramente
 * informativo - "cobre topicos", nunca "equivalente". Mesmo GET /api/courses/{id} de antes.
 */
export function CertificationsPage({ courseId }: { courseId: string }) {
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);
  const [selected, setSelected] = useState<{ monthlyId: string; code: string } | null>(null);

  const columns = course ? certificationColumns(course.monthlies) : [];
  const states = new Map((course?.monthlies ?? []).map((m, i, all) => [m.id, moduleState(m, all.slice(0, i))]));
  const cell = (monthly: MonthlyOverviewDto, code: string) => monthly.certifications.find((c) => c.certificationCode === code) ?? null;

  // Celula mostrada no detalhe: a escolhida, ou a 1a coberta de um modulo ja estudado (senao a 1a coberta).
  const covered = (course?.monthlies ?? []).flatMap((m) => m.certifications.map((c) => ({ monthly: m, coverage: c })));
  const current =
    (selected && covered.find((c) => c.monthly.id === selected.monthlyId && c.coverage.certificationCode === selected.code)) ??
    covered.find((c) => states.get(c.monthly.id) === 'done') ??
    covered[0] ??
    null;

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pt-8 lg:pb-10 xl:px-16 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6">
      <PixelPageHeader backTo={`/start?course=${courseId}`} crumb={`Certificações${course ? ` · ${course.name}` : ''}`} />

      {error ? (
        <ApiErrorScreen error={error} onRetry={retry} />
      ) : !course ? (
        <p className="font-pixel-label text-[9px] text-secondary">{loading ? 'Carregando certificações...' : ''}</p>
      ) : columns.length === 0 ? (
        <EmptyStateError title="Nenhuma certificação mapeada ainda" description="Este curso ainda não tem certificações de mercado mapeadas por módulo." />
      ) : (
        <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
          <ScrollArea className="w-full shrink-0 lg:h-full lg:min-h-0 lg:w-[300px] xl:w-[340px]" contentClassName="flex flex-col gap-4 lg:pr-2">
            <PixelPanel label="Ao seu alcance">
              <ul className="flex flex-col gap-4">
                {columns.map((col) => {
                  const covering = course.monthlies.filter((m) => cell(m, col.code));
                  const studied = covering.filter((m) => states.get(m.id) === 'done').length;
                  return (
                    <li key={col.code} className="flex items-center gap-3">
                      <img src={shieldIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="font-pixel text-[22px] leading-none text-primary">{col.name}</span>
                        <span className="font-pixel-label text-[8px] text-secondary">{col.certifier}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <SegmentedBar percentage={covering.length ? (100 * studied) / covering.length : 0} segments={Math.max(covering.length, 1)} heightClass="h-2" label={`${col.name}: ${studied} de ${covering.length} módulos estudados`} />
                          </div>
                          <span className={`font-pixel-label text-[7px] ${studied ? 'text-accent' : 'text-muted'}`}>
                            {studied} de {covering.length} {covering.length === 1 ? 'módulo estudado' : 'módulos estudados'}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </PixelPanel>
            <FocadaSays size="md">
              Isso aqui é mapa, não diploma, agente. A Focadu não emite certificação: mostra quanto de cada exame o curso já cobriu.
            </FocadaSays>
          </ScrollArea>

          <ScrollArea className="min-w-0 flex-1 lg:h-full lg:min-h-0" contentClassName="flex flex-col gap-4 pb-2 lg:pr-3">
            <section className="border-2 border-accent/60 bg-base p-4 shadow-[6px_6px_0_0_#1c9e3e] sm:px-6 sm:py-5">
              <h1 className="font-pixel-label text-[10px] text-accent">// Módulo × certificação</h1>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="pb-2.5 font-pixel-label text-[8px] font-normal text-muted">Módulo</th>
                      {columns.map((col) => (
                        <th key={col.code} className="pb-2.5 text-center font-pixel-label text-[10px] font-normal text-secondary" title={col.name}>
                          {col.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {course.monthlies.map((monthly) => {
                      const state = states.get(monthly.id) ?? 'lock';
                      return (
                        <tr key={monthly.id} className="border-t-2 border-stroke">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <img src={state === 'done' ? checkIcon : state === 'now' ? capeloIcon : lockIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className={`font-pixel-label text-[8px] ${state === 'lock' ? 'text-muted' : 'text-secondary'}`}>Módulo {monthly.number}</span>
                                <span className={`font-pixel text-2xl leading-none ${state === 'lock' ? 'text-muted' : 'text-primary'}`}>{monthly.title}</span>
                              </div>
                              {state !== 'lock' && (
                                <span className="hidden xl:inline-flex">
                                  <PixelChip tone="accent">{state === 'done' ? 'Estudado' : 'Estudando'}</PixelChip>
                                </span>
                              )}
                            </div>
                          </td>
                          {columns.map((col) => {
                            const coverage = cell(monthly, col.code);
                            const isCurrent = current?.monthly.id === monthly.id && current.coverage.certificationCode === col.code;
                            return (
                              <td key={col.code} className="py-2 text-center">
                                {coverage ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelected({ monthlyId: monthly.id, code: col.code })}
                                    aria-pressed={isCurrent}
                                    aria-label={`${col.name} no Módulo ${monthly.number}`}
                                    className={`inline-flex border-2 px-2.5 py-1.5 hover:border-secondary ${isCurrent ? 'border-accent bg-accent/10 hover:border-accent' : 'border-transparent'} ${state === 'lock' ? 'opacity-50' : ''}`}
                                  >
                                    <img src={state === 'done' ? checkIcon : shieldIcon} alt="" className="size-8 pixelated" />
                                  </button>
                                ) : (
                                  <span className="font-pixel text-2xl text-muted" aria-label="Não cobre">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-pixel-label text-[8px] text-secondary">
                <span className="flex items-center gap-1.5">
                  <img src={checkIcon} alt="" className="size-4 pixelated" />
                  Cobre, e você já estudou
                </span>
                <span className="flex items-center gap-1.5">
                  <img src={shieldIcon} alt="" className="size-4 pixelated" />
                  Cobre, ainda pela frente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-pixel text-lg leading-none text-muted">—</span>
                  Não cobre
                </span>
              </div>
            </section>

            {current && <CoverageDetail monthly={current.monthly} coverage={current.coverage} />}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function CoverageDetail({ monthly, coverage }: { monthly: MonthlyOverviewDto; coverage: CertificationCoverageDto }) {
  return (
    <PixelPanel label={`${coverage.certificationCode} · Módulo ${monthly.number} — ${monthly.title}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <img src={shieldIcon} alt="" className="size-8 pixelated" aria-hidden="true" />
        <span className="font-pixel text-[28px] leading-none text-primary">{coverage.certificationName}</span>
        <span className="font-pixel-label text-[8px] text-secondary">{coverage.certifier}</span>
      </div>
      <p className="font-pixel text-[22px] leading-snug text-primary">{coverage.coveredDomains}</p>
      <p className="font-pixel-label text-[8px] text-muted">Cobre tópicos do exame, não é equivalência nem vínculo com a certificadora.</p>
    </PixelPanel>
  );
}

function certificationColumns(monthlies: MonthlyOverviewDto[]): CertColumn[] {
  const byCode = new Map<string, CertColumn>();
  for (const monthly of monthlies) {
    for (const cert of monthly.certifications) {
      if (!byCode.has(cert.certificationCode)) {
        byCode.set(cert.certificationCode, { code: cert.certificationCode, name: cert.certificationName, certifier: cert.certifier });
      }
    }
  }
  return [...byCode.values()];
}

/** Estudado = todas as Dailies concluidas; estudando = o 1o modulo ainda nao estudado que ja tem Daily feita ou vem logo depois de um estudado. */
function moduleState(monthly: MonthlyOverviewDto, before: MonthlyOverviewDto[]): ModuleState {
  if (isMonthlyComplete(monthly)) return 'done';
  const started = monthly.weeklies.some((w) => w.completedDailies > 0);
  const previousDone = before.every((m) => isMonthlyComplete(m));
  return started || previousDone ? 'now' : 'lock';
}
