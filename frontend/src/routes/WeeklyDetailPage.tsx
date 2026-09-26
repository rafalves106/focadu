import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { DailyStatus, WeeklyProjectStatus, type WeeklyDetailDto } from '../api/types';
import { Centered } from '../components/Layout';
import { PixelPageHeader, PixelPanel } from '../components/PixelPage';
import { ScrollArea } from '../components/ScrollArea';
import { SegmentedBar } from '../components/SegmentedBar';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { PublicationModal } from '../components/publication/PublicationModal';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton } from '../components/session/PixelButton';
import { WeekTrail } from '../components/week/WeekTrail';
import { buildFocadaWeekLine } from '../lib/focadaMapLines';
import flagIcon from '../assets/pixel/bandeira.png';
import shieldIcon from '../assets/pixel/escudo.png';
import badgeReforco from '../assets/pixel/mapa/badge-reforco.png';

/**
 * Visao da semana (Fase 8; pixel art na Fase 74, Figma "Visao da semana — v2", nodes 137:5237/138:6537/
 * 138:8081) - a semana como um trecho da trilha em pe: os 6 dias com os pontos do mapa e o castelo do
 * Projeto Semanal no fim (WeekTrail). A direita, a Focada comentando a semana, o resumo, as
 * certificacoes do modulo e as regras de fechamento. Publicacao do modulo pendente vira uma faixa
 * ambar acima da lista. Nenhum endpoint novo: GET /api/weeklies/{id} + GET /api/courses/{id} (nome do
 * modulo, navegacao entre semanas, reforco por dia e trava da semana).
 *
 * A partir de `lg`, sem rolagem externa: so a trilha e a coluna lateral rolam por dentro se nao
 * couberem. No celular empilha. O cartao de regras so aparece em tela alta (`tall:`) e com a semana
 * ainda aberta.
 */
export function WeeklyDetailPage({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);
  // Opcional: sem courseId na URL, modulo/navegacao/reforco por dia somem sem quebrar a tela.
  const { data: course } = useApiResource(() => (courseId ? api.getCourse(courseId) : Promise.resolve(null)), [courseId]);
  const [showPublicationModal, setShowPublicationModal] = useState(false);

  if (loading) return <Centered text="Carregando semana..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const allWeeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const weekIndex = allWeeks.findIndex((w) => w.id === weeklyId);
  const overview = weekIndex >= 0 ? allWeeks[weekIndex] : null;
  const prevWeek = weekIndex > 0 ? allWeeks[weekIndex - 1] : null;
  const nextWeek = weekIndex >= 0 && weekIndex < allWeeks.length - 1 ? allWeeks[weekIndex + 1] : null;
  const monthly = course?.monthlies.find((m) => m.weeklies.some((w) => w.id === weeklyId)) ?? null;
  const weekLocked = overview?.isLocked ?? false;
  const focada = buildFocadaWeekLine(weekly, overview);
  // Regras de fechamento so importam enquanto a semana nao fechou.
  const weekClosed = weekly.requiresPublicationToUnlock || weekly.project?.status === WeeklyProjectStatus.Evaluated;
  const weekLink = (id: string) => `/start?course=${courseId}&weekly=${id}`;

  const label = [`Semana ${String(weekly.number).padStart(2, '0')}`, monthly && `Módulo ${monthly.number}`, monthly?.title].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pt-8 lg:pb-10 xl:px-16 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6 lg:tight:pt-4 lg:tight:pb-4">
      <PixelPageHeader
        backTo={courseId ? `/start?course=${courseId}` : '/start'}
        crumb={`Semana ${weekly.number}${allWeeks.length > 0 ? ` de ${allWeeks.length}` : ''}${course ? ` · ${course.name}` : ''}`}
      />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <section className="flex min-w-0 flex-col gap-4 border-2 border-accent/60 bg-base p-4 shadow-[6px_6px_0_0_#1c9e3e] sm:px-6 sm:pt-5 lg:min-h-0 lg:flex-1 lg:short:gap-3 lg:short:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:shrink-0">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="font-pixel-label text-[10px] text-accent">// {label.join(' · ')}</p>
              <h1 className="font-pixel text-[32px] leading-none text-primary sm:text-[40px] lg:short:text-[34px]">{weekly.theme ?? weekly.title}</h1>
            </div>
            {(prevWeek || nextWeek) && (
              <nav className="grid shrink-0 grid-cols-2 gap-2" aria-label="Outras semanas">
                <WeekNavLink to={prevWeek ? weekLink(prevWeek.id) : null}>‹ Semana {prevWeek?.number ?? weekly.number - 1}</WeekNavLink>
                <WeekNavLink to={nextWeek ? weekLink(nextWeek.id) : null} dim={!nextWeek || nextWeek.isLocked}>
                  Semana {nextWeek?.number ?? weekly.number + 1} ›
                </WeekNavLink>
              </nav>
            )}
          </div>

          {/* Celular: a Focada vem antes da lista (Figma 138:8081); no desktop ela fica na coluna lateral. */}
          <FocadaSays expression={focada.expression} size="sm" className="lg:hidden">
            {focada.text}
          </FocadaSays>

          {weekly.requiresPublicationToUnlock && (
            <PublicationBanner nextWeek={weekly.number + 1} onPublish={() => setShowPublicationModal(true)} />
          )}

          <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-3">
            <WeekTrail weekly={weekly} overview={overview} courseId={courseId} weekLocked={weekLocked} compact={weekly.requiresPublicationToUnlock} />
          </ScrollArea>
        </section>

        <ScrollArea className="w-full shrink-0 lg:h-full lg:min-h-0 lg:w-[320px] xl:w-[352px]" contentClassName="flex flex-col gap-4 lg:pr-2 lg:short:gap-3">
          <FocadaSays expression={focada.expression} size="md" className="hidden lg:flex">
            {focada.text}
          </FocadaSays>
          <WeekSummary weekly={weekly} />
          {weekly.moduleCertifications.length > 0 && (
            <PixelPanel label="Este módulo te aproxima de">
              <ul className="flex flex-col gap-2">
                {weekly.moduleCertifications.map((cert) => (
                  <li key={cert.certificationCode} className="flex items-center gap-2.5">
                    <img src={shieldIcon} alt="" className="size-8 pixelated" aria-hidden="true" />
                    <span className="font-pixel text-[22px] leading-tight text-primary">
                      {cert.certificationName} <span className="text-secondary">({cert.certifier})</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="font-pixel-label text-[7px] text-muted">Cobre tópicos do exame, não é equivalência.</p>
            </PixelPanel>
          )}
          {!weekClosed && (
          <div className="hidden lg:tall:block">
            <PixelPanel label="Como a semana fecha">
              <ul className="flex flex-col gap-1.5 font-pixel text-[19px] leading-tight text-secondary">
                <li>· 1 Daily por dia. Reforço não gasta a cota.</li>
                <li>· O 6º dia é a ponte: prática, na sua linguagem.</li>
                <li>· O castelo abre depois da ponte. A Semana {weekly.number + 1} só abre com ele avaliado.</li>
              </ul>
            </PixelPanel>
          </div>
          )}
        </ScrollArea>
      </div>

      {showPublicationModal && (
        <PublicationModal
          weeklyId={weeklyId}
          courseId={courseId}
          // retry() so ao fechar (nao durante o fluxo): useApiResource.retry() dispara
          // "Carregando semana..." (early return acima), que desmontaria o modal no meio do
          // passo a passo e resetaria o step de volta pra 'intro' antes do usuario ver a tela de
          // sucesso. Ver doc comment de PublicationModal.
          onClose={() => {
            setShowPublicationModal(false);
            retry();
          }}
        />
      )}
    </div>
  );
}

function WeekNavLink({ to, dim = false, children }: { to: string | null; dim?: boolean; children: ReactNode }) {
  const cls = `flex items-center justify-center border-2 px-4 py-3 font-pixel-label text-[10px] leading-none lg:short:py-2.5 ${
    dim ? 'border-stroke text-muted' : 'border-secondary text-secondary hover:text-primary'
  }`;
  if (!to) return <span className={`${cls} invisible`} aria-hidden="true">{children}</span>;
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

function PublicationBanner({ nextWeek, onPublish }: { nextWeek: number; onPublish: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-2 border-project bg-project/[0.08] p-4 sm:flex-row sm:items-center sm:gap-4 lg:shrink-0 lg:short:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <img src={flagIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-pixel-label text-[9px] text-project">Próxima semana trancada</p>
          <p className="font-pixel text-[21px] leading-tight text-primary">
            Publique a prova do módulo no LinkedIn ou no GitHub pra liberar a Semana {nextWeek}.
          </p>
        </div>
      </div>
      <PixelButton tone="project" onClick={onPublish} className="shrink-0">
        Publicar agora
      </PixelButton>
    </div>
  );
}

function WeekSummary({ weekly }: { weekly: WeeklyDetailDto }) {
  const days = weekly.dailies.filter((d) => !d.isReinforcement);
  const done = days.filter((d) => d.status === DailyStatus.Completed).length;
  const errors = days.reduce((sum, d) => sum + d.penaltyPoints, 0);
  // Aprovacao so sobre o que ja foi respondido - dia ainda nao feito nao derruba a taxa.
  const answered = days.reduce((sum, d) => sum + d.completedActivities, 0);
  const passed = days.reduce((sum, d) => sum + d.passedActivities, 0);
  const approval = answered > 0 ? Math.min(100, Math.round((100 * passed) / answered)) : null;
  const weakDays = days.filter((d) => d.isWeakDay).length;
  const project = weekly.project;
  return (
    <PixelPanel label="Resumo da semana">
      <Stat label="Dias" value={`${done}/${days.length}`} />
      <SegmentedBar percentage={days.length ? (100 * done) / days.length : 0} segments={Math.max(days.length, 1)} heightClass="h-3" label="Dias concluídos da semana" />
      {approval !== null && <Stat label="Aprovação" value={`${approval}%`} tone="text-accent" />}
      <Stat label="Erros na semana" value={`${errors}`} tone={errors > 0 ? 'text-alert' : 'text-primary'} />
      {project?.status === WeeklyProjectStatus.Evaluated && project.score !== null && <Stat label="Projeto" value={`${project.score}/100`} tone="text-project" />}
      {weekly.hasPendingWeeklyReinforcement && (
        <div className="flex items-center gap-2.5 border-2 border-alert px-3 py-2.5">
          <img src={badgeReforco} alt="" className="size-4 shrink-0 pixelated" aria-hidden="true" />
          <p className="font-pixel text-[19px] leading-tight text-primary">
            Revisão semanal disponível{weakDays > 0 ? `: ${weakDays} ${weakDays === 1 ? 'dia fraco' : 'dias fracos'}` : ''}.
          </p>
        </div>
      )}
    </PixelPanel>
  );
}

function Stat({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-pixel-label text-[9px] text-secondary">{label}</span>
      <span className={`font-pixel text-[28px] leading-none lg:short:text-2xl ${tone}`}>{value}</span>
    </div>
  );
}
