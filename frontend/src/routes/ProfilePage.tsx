import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus, type BadgeDto, type GamificationSummaryDto, type MarketplaceCatalogDto } from '../api/types';
import { agentLook } from '../lib/agentSprites';
import { useAuth } from '../contexts/useAuth';
import { useSettings } from '../contexts/useSettings';
import { Centered } from '../components/Layout';
import { ScrollArea } from '../components/ScrollArea';
import { PixelModal } from '../components/PixelModal';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { AgentStage, type CourseLine } from '../components/profile/AgentStage';
import { DossierCard, ProfileStats, SquadShortcut, StudyCalendarCard, TrophyShelf } from '../components/profile/ProfileCards';
import { CustomizationTab } from '../components/profile/CustomizationTab';
import { ConquestsTab } from '../components/profile/ConquestsTab';
import backArrow from '../assets/pixel/voltar.png';

interface ProfileData {
  gamification: GamificationSummaryDto;
  catalog: MarketplaceCatalogDto;
  badges: BadgeDto[];
  course: CourseLine | null;
  courseId: string | null;
  score: number | null;
  position: number | null;
}

type Overlay = 'guarda-roupa' | 'conquistas' | null;

/** `?abrir=` (Fase 72) e os `?tab=` antigos (Fase 70) - quem linkava pra uma aba cai no modal equivalente. */
function overlayFromParams(params: URLSearchParams): Overlay {
  const value = params.get('abrir') ?? params.get('tab');
  if (value === 'guarda-roupa' || value === 'customizacao') return 'guarda-roupa';
  if (value === 'conquistas') return 'conquistas';
  return null;
}

/**
 * `/perfil` - "tela do agente" (Fase 72, Figma "Perfil + Squad — v2", nodes 120:4503 e 127:15096). O
 * dono nao gostou do Perfil em abas da Fase 70 (mesma casca da Daily); agora e uma tela so, sem abas: o
 * agente num palco a esquerda e, a direita, os numeros (ofensiva, score, posicao, gems), a estante de
 * trofeus, o atalho do squad, os ultimos 14 dias e o dossie. O guarda-roupa (era a aba Customizacao) e
 * a lista completa de conquistas abrem em modal; o Squad virou o QG em `/squad`; o "Indique um amigo"
 * foi pro QG. A partir de `lg`, sem rolagem externa (a coluna direita rola por dentro).
 */
export function ProfilePage() {
  const { user } = useAuth();
  const settings = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const overlay = overlayFromParams(searchParams);
  // Catalogo recalculado pelas acoes do guarda-roupa (Fase 71) - vale por cima do que veio no load.
  const [catalogOverride, setCatalogOverride] = useState<MarketplaceCatalogDto | null>(null);

  const { data, error, loading, retry } = useApiResource<ProfileData>(async () => {
    const [gamification, catalog, badges, courses] = await Promise.all([api.getGamification(), api.getMarketplaceCatalog(), api.getUserBadges(), api.getCourses()]);
    const active = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
    const [detail, ranking] = active ? await Promise.all([api.getCourse(active.id), api.getCourseRanking(active.id, 'course')]) : [null, null];
    const currentMonthly = detail?.monthlies.find((m) => m.weeklies.some((w) => w.completedDailies < w.totalDailies)) ?? null;
    return {
      gamification,
      catalog,
      badges: badges.badges,
      courseId: active?.id ?? null,
      course: detail ? { name: detail.name, region: currentMonthly?.number ?? null, completed: detail.progress.completedDailies, total: detail.progress.totalDailies } : null,
      score: ranking?.currentUserEntry?.score ?? null,
      position: ranking?.currentUserEntry?.position ?? null,
    };
  }, []);

  if (searchParams.get('tab') === 'squad') return <Navigate to="/squad" replace />;
  if (!user) return null;
  if (loading) return <Centered text="Carregando perfil..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const catalog = catalogOverride ?? data.catalog;
  const open = (next: Overlay) => setSearchParams(next ? { abrir: next } : {});

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-16 lg:pt-8 lg:pb-10 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6 lg:tight:pt-4 lg:tight:pb-4">
      <header className="flex items-center justify-between gap-3 lg:shrink-0">
        <Link to="/start" className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
          <img src={backArrow} alt="" className="size-4 pixelated" />
          Voltar pro start
        </Link>
        <h1 className="font-pixel-label text-[9px] text-muted">Perfil do agente</h1>
      </header>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 xl:gap-8">
        <AgentStage
          displayName={user.displayName}
          since={user.createdAt}
          look={agentLook(catalog)}
          course={data.course}
          onWardrobe={() => open('guarda-roupa')}
          onSettings={settings.open}
        />

        <ScrollArea className="min-w-0 lg:min-h-0 lg:flex-1" contentClassName="flex flex-col gap-4 lg:pr-4 lg:short:gap-3">
          <ProfileStats
            gamification={{ ...data.gamification, totalGems: catalog.totalGems }}
            score={data.score}
            position={data.position}
            rankingHref={data.courseId ? `/start?course=${data.courseId}&ranking=1` : '/start'}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,472fr)_minmax(0,272fr)] lg:short:gap-3">
            <TrophyShelf badges={data.badges} onSeeAll={() => open('conquistas')} />
            <SquadShortcut />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 lg:short:gap-3">
            <StudyCalendarCard />
            <DossierCard user={user} />
          </div>
        </ScrollArea>
      </div>

      {overlay === 'guarda-roupa' && (
        <PixelModal label="Guarda-roupa" title="Guarda-roupa" onClose={() => open(null)} widthClass="max-w-4xl">
          <CustomizationTab catalog={catalog} onCatalog={setCatalogOverride} />
        </PixelModal>
      )}
      {overlay === 'conquistas' && (
        <PixelModal label="Conquistas" title="Conquistas" onClose={() => open(null)} widthClass="max-w-3xl">
          <ConquestsTab badges={data.badges} />
        </PixelModal>
      )}
    </div>
  );
}
