import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { CourseStatus, type GamificationSummaryDto } from '../../api/types';
import { Centered } from '../../components/Layout';
import { ApiErrorScreen } from '../../components/errors/ApiErrorScreen';
import { GemBadge } from '../../components/gamification/GemBadge';
import { StreakIndicator } from '../../components/gamification/StreakIndicator';
import { HouseLabel } from '../../components/world/HouseLabel';
import { PlayerSprite } from '../../components/world/PlayerSprite';
import { EmptyStateStartPage } from '../EmptyStateStartPage';
import mapImage from '../../assets/world/mapa-vilarejo.png';
import { START_POSITION, WORLD_HEIGHT, WORLD_TRIGGER_ZONES, WORLD_WIDTH, type WorldTriggerZone } from './worldConfig';
import { useWorldMovement } from './useWorldMovement';

interface WorldData {
  courseId: string | null;
  gamification: GamificationSummaryDto;
}

/**
 * Fase 25 - novo hub de entrada, substitui o antigo StartDashboard (cards) em `/start` sem query
 * string. Personagem anda livre pelo mapa (sem colisao contra predio, decisao da fase) e 5 "casas"
 * levam pras telas reais que ja existiam antes (Hoje/Trilha/Perfil/Loja/Squad) - ver worldConfig.ts
 * pra coordenadas das zonas e docs/fase-25 pro racional completo.
 *
 * Guarda de "sem matricula ainda" preservada identica ao StartDashboard (mesmo erro
 * `nenhuma_matricula_ativa` de `api.getToday()`) - EmptyStateStartPage continua sendo a tela real
 * pra quem ainda nao tem progresso nenhum pra navegar no mapa.
 */
export function WorldMapPage() {
  const navigate = useNavigate();
  const [debugZones, setDebugZones] = useState(false);

  const { data, error, loading, retry } = useApiResource<WorldData>(
    () =>
      api.getToday().then(async () => {
        const [courses, gamification] = await Promise.all([api.getCourses(), api.getGamification()]);
        const activeSummary = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
        return { courseId: activeSummary?.id ?? null, gamification };
      }),
    [],
  );

  const courseId = data?.courseId ?? null;
  const handleEnterZone = useCallback((zone: WorldTriggerZone) => navigate(zone.to(courseId)), [navigate, courseId]);

  const { position, facing } = useWorldMovement({
    start: START_POSITION,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    zones: WORLD_TRIGGER_ZONES,
    onEnterZone: handleEnterZone,
  });

  if (loading) return <Centered text="Carregando o mapa..." />;
  if (error?.code === 'nenhuma_matricula_ativa') return <EmptyStateStartPage />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const leftPercent = (position.x / WORLD_WIDTH) * 100;
  const topPercent = (position.y / WORLD_HEIGHT) * 100;

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      {/* Truque de "contain" via CSS puro: width/height nascem em 100% (preenchem a tela toda),
          mas os max-width/max-height cruzados (um derivado do outro eixo * proporcao do mundo)
          garantem que so o eixo que sobra de fato encolhe - a imagem nunca estica nem corta,
          sempre preenche o maximo da tela respeitando a proporcao real do mapa (2304x1296). */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: `${WORLD_WIDTH} / ${WORLD_HEIGHT}`,
          width: '100%',
          height: '100%',
          maxWidth: `calc(100vh * ${WORLD_WIDTH} / ${WORLD_HEIGHT})`,
          maxHeight: `calc(100vw * ${WORLD_HEIGHT} / ${WORLD_WIDTH})`,
        }}
      >
        <img
          src={mapImage}
          alt="Mapa da Focadu"
          draggable={false}
          className="h-full w-full select-none"
          style={{ imageRendering: 'pixelated' }}
        />

        {WORLD_TRIGGER_ZONES.map((zone) => (
          <HouseLabel key={zone.id} zone={zone} />
        ))}

        {debugZones &&
          WORLD_TRIGGER_ZONES.map((zone) => <DebugZoneMarker key={zone.id} zone={zone} />)}

        <PlayerSprite leftPercent={leftPercent} topPercent={topPercent} facing={facing} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
            {/* Fase 17: clicavel de proposito, mesmo padrao do antigo StartDashboard. */}
            <Link to="/loja">
              <GemBadge totalGems={data.gamification.totalGems} />
            </Link>
            <StreakIndicator currentStreak={data.gamification.currentStreak} />
          </div>
          <button
            type="button"
            onClick={() => setDebugZones((v) => !v)}
            className="pointer-events-auto rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-secondary hover:text-primary"
          >
            {debugZones ? 'Ocultar zonas' : '🛠️ Ajustar zonas'}
          </button>
        </div>

        {debugZones && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-xs text-accent">
            x: {Math.round(position.x)} · y: {Math.round(position.y)}
          </div>
        )}

        <p className="pointer-events-none absolute bottom-3 right-3 text-[11px] text-secondary">
          Use as setas ou WASD pra andar
        </p>
      </div>
    </div>
  );
}

/** So visivel com "Ajustar zonas" ligado - circulo tracejado + rotulo em cima de cada porta, pra calibrar worldConfig.ts olhando o mapa de verdade. */
function DebugZoneMarker({ zone }: { zone: WorldTriggerZone }) {
  return (
    <div
      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-project bg-project/15"
      style={{
        left: `${(zone.x / WORLD_WIDTH) * 100}%`,
        top: `${(zone.y / WORLD_HEIGHT) * 100}%`,
        width: `${((zone.radius * 2) / WORLD_WIDTH) * 100}%`,
        height: `${((zone.radius * 2) / WORLD_HEIGHT) * 100}%`,
      }}
    >
      <span className="absolute -top-5 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-project">
        {zone.label}
      </span>
    </div>
  );
}
