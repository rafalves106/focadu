import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { useAuth } from '../contexts/useAuth';
import { CourseStatus, type CourseDetailDto, type DailyStateDto, type GamificationSummaryDto, type WeeklyDetailDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { StreakLostModal } from '../components/gamification/StreakLostModal';
import { ScrollArea } from '../components/ScrollArea';
import { DialogueBox } from '../components/DialogueBox';
import { CourseSlots } from '../components/start/CourseSlots';
import { AgentCard } from '../components/start/AgentCard';
import { DailyMissionCard } from '../components/start/DailyMissionCard';
import { WeekPathCard } from '../components/start/WeekPathCard';
import { EmptyStateStartPage } from './EmptyStateStartPage';
import { findCourseMap } from '../lib/courseMaps';
import { buildFocadaMapLine } from '../lib/focadaMapLines';
import { studiedToday } from '../lib/startScreen';

interface HubData {
  /** Todos os cursos matriculados, com o detalhe (progresso, semanas, dias). */
  courses: CourseDetailDto[];
  gamification: GamificationSummaryDto;
}

interface SelectedData {
  courseId: string;
  /** null = curso sem Daily pendente (concluido) - GET /api/today devolve daily_hoje_nao_encontrada. */
  daily: DailyStateDto | null;
  weekly: WeeklyDetailDto | null;
}

/**
 * Hub de entrada (`/start` sem params). Historico: Fase 8 (hub de cards), Fase 14 (gemas/streak
 * reais), Fase 10 retomada (StreakLostModal), Fase 38c (carrossel de cursos), Fase 45 (certificacoes),
 * Fase 56 (reforco pendente).
 *
 * Redesign de 23/09/2026 (Figma "Focadu — Pixel Art", pagina "Start — redesign proposto", node
 * 55:4502, aprovado pelo dono): 3 colunas como a trilha e o Projeto Semanal, pixel art.
 * - Esquerda, global: cursos como "save slots" (escolher um troca o centro e a direita, guardado em
 *   `?curso=`) e o cartao do agente (gemas, streak e a semana do streak).
 * - Centro, do curso escolhido: a Missao do dia (unica acao principal), "Rumo ao
 *   castelo" (a semana atual como pedaco do mapa, com o Projeto Semanal de BOSS) e a fala da Focada
 *   (as falas aprovadas do mapa, no lugar do "Ola, fulano").
 * A coluna direita do desenho (missoes extras, numeros, certificacoes, atalhos) saiu a pedido do
 * dono - o resto ja esta na trilha, e a tela nao deve rolar. Pelo mesmo motivo saiu o HUD do curso no
 * topo do centro (repetia o slot escolhido: nome e %) - o nome foi pra linha de contexto da missao. O reforco pendente (Fase 56: sempre
 * alcancavel) ficou no selo do caminho da semana, que leva direto a sessao, e na fala da Focada.
 * A Daily do curso escolhido vem de GET /api/today?courseId= - a cota de 1 Daily por dia e por curso.
 * Conquistas e a versao de celular ficaram pra depois (decisao do dono); abaixo de `lg` as colunas so
 * empilham.
 */
export function StartDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const hub = useApiResource<HubData>(async () => {
    const [summaries, gamification] = await Promise.all([api.getCourses(), api.getGamification()]);
    // Detalhe de todos os cursos (N+1 aceitavel - poucos cursos por usuario, ver docs/ARQUITETURA.md).
    const courses = await Promise.all(summaries.map((c) => api.getCourse(c.id)));
    return { courses, gamification };
  }, []);

  const courses = useMemo(() => hub.data?.courses ?? [], [hub.data]);
  const requestedId = searchParams.get('curso');
  const selectedCourse =
    courses.find((c) => c.id === requestedId) ?? courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
  const selectedId = selectedCourse?.id ?? null;

  const selected = useApiResource<SelectedData | null>(async () => {
    if (!selectedId) return null;
    try {
      const daily = await api.getToday(selectedId);
      const weekly = await api.getWeekly(daily.weeklyId);
      return { courseId: selectedId, daily, weekly };
    } catch (err) {
      if (err instanceof ApiError && err.code === 'daily_hoje_nao_encontrada') return { courseId: selectedId, daily: null, weekly: null };
      throw err;
    }
  }, [selectedId]);

  const monthTitles = useMemo(() => {
    const regions = selectedCourse ? findCourseMap(selectedCourse.name) : null;
    return new Map([...(regions?.values() ?? [])].map((r) => [r.monthlyNumber, r.titulo]));
  }, [selectedCourse]);
  const focadaLine = useMemo(() => (selectedCourse ? buildFocadaMapLine(selectedCourse, monthTitles) : null), [selectedCourse, monthTitles]);

  // Derivado direto do fetch (nao um effect) - so precisa "lembrar" um dismiss local pra nao
  // reaparecer no mesmo carregamento depois que StreakLostModal ja chamou acknowledgeStreakBreak.
  const [dismissed, setDismissed] = useState(false);

  if (hub.loading) return <Centered text="Carregando..." />;
  if (hub.error) return <ApiErrorScreen error={hub.error} onRetry={hub.retry} />;
  if (!hub.data) return null;
  // Guarda de seguranca (Fase 13b) - perfil completo mas sem matricula (SplashPage evita a maioria
  // desses casos, mas /start continua acessivel direto pela URL/back-button).
  if (!selectedCourse) return <EmptyStateStartPage />;

  const { gamification } = hub.data;
  const todayDone = studiedToday(courses);
  // Dados do "hoje" so valem se forem do curso escolhido (na troca de slot, o anterior fica ate chegar o novo).
  const current = selected.data?.courseId === selectedCourse.id ? selected.data : null;
  const currentWeekId = current?.weekly?.id;
  const currentWeek = currentWeekId
    ? (selectedCourse.monthlies.flatMap((m) => m.weeklies).find((w) => w.id === currentWeekId) ?? null)
    : null;

  function selectCourse(courseId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('curso', courseId);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-base px-4 pt-6 pb-8 lg:h-[calc(100dvh-var(--nav-height))] lg:flex-row lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12 lg:[@media(max-height:820px)]:py-6">
      {!dismissed && gamification.streakJustBroken && (
        <StreakLostModal longestStreak={gamification.longestStreak} onClose={() => setDismissed(true)} />
      )}

      <ScrollArea className="w-full shrink-0 lg:min-h-0 lg:w-[272px]" contentClassName="flex flex-col gap-5 lg:pr-3">
        <CourseSlots courses={courses} selectedId={selectedCourse.id} onSelect={selectCourse} />
        <AgentCard displayName={user?.displayName ?? 'agente'} gamification={gamification} todayDone={todayDone} />
      </ScrollArea>

      <ScrollArea className="min-h-0 min-w-0 flex-1" contentClassName="flex flex-col gap-5 lg:pr-3">
        {/* Sem HUD visivel no centro (o slot escolhido ja mostra nome e %) - o titulo da pagina fica pro leitor de tela. */}
        <h1 className="sr-only">Início: {selectedCourse.name}</h1>
        {selected.error && !current ? (
          <ApiErrorScreen error={selected.error} onRetry={selected.retry} />
        ) : !current ? (
          <div className="pixel-box flex h-40 shrink-0 items-center justify-center bg-base">
            <p className="font-pixel text-xl text-secondary">Carregando o curso...</p>
          </div>
        ) : (
          <>
            <DailyMissionCard
              course={selectedCourse}
              daily={current.daily}
              weekly={current.weekly}
              studiedToday={todayDone}
              currentStreak={gamification.currentStreak}
            />
            {currentWeek && <WeekPathCard week={currentWeek} courseId={selectedCourse.id} />}
          </>
        )}
        {focadaLine && (
          <DialogueBox key={selectedCourse.id} projectId={`start-${selectedCourse.id}`} lines={[focadaLine]} readmeUrl={null} compact />
        )}
      </ScrollArea>
    </div>
  );
}

