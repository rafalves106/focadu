import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { CourseStatus, type BadgeDto, type CosmeticRarity, type GamificationSummaryDto, type MarketplaceCatalogDto } from '../../api/types';
import { useSettings } from '../../contexts/useSettings';
import { knownBadges } from '../../lib/badgeInfo';
import { nameColorClass, RARITY_STYLE } from '../../lib/cosmeticStyle';
import { equippedLook, MEDALS } from '../../lib/profileLook';
import fireIcon from '../../assets/pixel/chama-streak.png';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';
import rankingIcon from '../../assets/pixel/nav-ranking.png';

/**
 * Avatar quadrado do perfil (Fase 70) - iniciais em VT323 dentro de uma caixa reta; a moldura equipada
 * e a borda grossa na cor da raridade (mesma fonte de verdade da loja, `RARITY_STYLE`). Sem moldura,
 * borda neutra. Ainda nao e sprite: os itens de verdade chegam com a sessao de arte da Loja.
 */
export function AgentAvatar({ displayName, frameRarity, size = 'lg' }: { displayName: string; frameRarity: CosmeticRarity | null; size?: 'md' | 'lg' }) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter((part) => /\p{L}/u.test(part[0] ?? ''))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const border = frameRarity !== null ? RARITY_STYLE[frameRarity].border : 'border-stroke';
  const box = size === 'lg' ? 'size-20 text-6xl' : 'size-14 text-4xl';
  return (
    <div className={`flex shrink-0 items-center justify-center border-4 bg-surface font-pixel leading-none text-accent ${box} ${border}`} aria-hidden="true">
      {initials || '?'}
    </div>
  );
}

/**
 * Ficha do agente (Fase 70, Figma "Perfil — redesign proposto", node 85:4503) - coluna esquerda do
 * perfil, a mesma em todas as abas: avatar, nome na cor equipada, cursos, recorde, score e posicao no
 * curso ativo, vitrine das conquistas e atalhos. Score/posicao vem do ranking do curso ativo (era a
 * aba Informacoes que buscava isso desde a Fase 18).
 */
export function AgentSheet({
  displayName,
  email,
  gamification,
  catalog,
  badges,
  onSeeBadges,
}: {
  displayName: string;
  email: string;
  gamification: GamificationSummaryDto;
  catalog: MarketplaceCatalogDto;
  badges: BadgeDto[];
  onSeeBadges: () => void;
}) {
  const { open: openSettings } = useSettings();
  const { frameRarity, nameColor } = equippedLook(catalog);
  const { data } = useApiResource(async () => {
    const courses = await api.getCourses();
    const active = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
    const ranking = active ? await api.getCourseRanking(active.id, 'course') : null;
    return { coursesCount: courses.length, course: active, entry: ranking?.currentUserEntry ?? null };
  }, []);

  const shown = knownBadges(badges);
  const achieved = shown.filter((b) => b.badge.achieved).length;
  const position = data?.entry?.position ?? null;

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3.5 border-2 border-secondary bg-base p-[18px]">
        <p className="font-pixel-label text-[9px] text-accent">// Ficha do agente</p>

        <div className="flex min-w-0 items-center gap-3.5">
          <AgentAvatar displayName={displayName} frameRarity={frameRarity} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className={`truncate font-pixel text-[32px] leading-none ${nameColorClass(nameColor)}`}>{displayName}</p>
            <p className="truncate text-xs text-secondary">{email}</p>
          </div>
        </div>

        <span className="h-0.5 bg-stroke" aria-hidden="true" />

        <div className="grid grid-cols-2 gap-2.5">
          <Stat value={data ? String(data.coursesCount) : '…'} label="Cursos" />
          <Stat value={String(gamification.longestStreak)} label="Recorde (dias)" icon={fireIcon} tone="text-project" />
        </div>

        {data?.course && data.entry && (
          <>
            <p className="truncate font-pixel-label text-[8px] text-muted">No curso ativo · {data.course.name}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat value={data.entry.score.toFixed(1)} label="Score" />
              <Stat value={`${position}º`} label="Posição" icon={position !== null && position <= 3 ? MEDALS[position - 1] : undefined} />
            </div>
          </>
        )}

        <span className="h-0.5 bg-stroke" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2">
          <p className="font-pixel-label text-[9px] text-accent">// Conquistas</p>
          <button type="button" onClick={onSeeBadges} className="font-pixel-label text-[8px] text-secondary hover:text-accent">
            {achieved}/{shown.length} · Ver todas ›
          </button>
        </div>
        <ul className="grid grid-cols-5 gap-1.5">
          {shown.map(({ badge, info }) => (
            <li
              key={badge.code}
              title={`${info.label}${badge.achieved ? '' : ' (trancada)'}`}
              className={`flex aspect-square items-center justify-center border-2 ${badge.achieved ? 'border-accent' : 'border-stroke'}`}
            >
              <img src={badge.achieved ? info.icon : lockIcon} alt={info.label} className="size-8 pixelated" />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 lg:mt-auto">
        {data?.course && (
          <Link
            to={`/start?course=${data.course.id}&ranking=1`}
            className="flex items-center justify-center gap-2.5 border-2 border-secondary bg-base px-4 py-3.5 font-pixel-label text-[11px] text-primary hover:border-accent"
          >
            <img src={rankingIcon} alt="" className="size-4 pixelated" />
            Ranking do curso ›
          </Link>
        )}
        <button
          type="button"
          onClick={openSettings}
          className="border-2 border-secondary bg-base px-4 py-3.5 font-pixel-label text-[11px] text-primary hover:border-accent"
        >
          Configurações ›
        </button>
      </div>
    </>
  );
}

function Stat({ value, label, icon, tone = 'text-primary' }: { value: string; label: string; icon?: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-2 border-stroke px-3.5 py-3">
      <span className="flex items-center gap-2">
        {icon && <img src={icon} alt="" className="size-4 pixelated" />}
        <span className={`font-pixel text-3xl leading-none ${tone}`}>{value}</span>
      </span>
      <span className="truncate font-pixel-label text-[8px] text-secondary">{label}</span>
    </div>
  );
}
