import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { BadgeDto, GamificationSummaryDto, MarketplaceCatalogDto, ReferralInfoDto, UserDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ScrollArea } from '../components/ScrollArea';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { FocadaSays } from '../components/session/FocadaSays';
import { AgentSheet } from '../components/profile/AgentSheet';
import { equippedLook } from '../lib/profileLook';
import { ProfileTabs, type ProfileTab } from '../components/profile/ProfileTabs';
import { InformationTab } from '../components/profile/InformationTab';
import { CustomizationTab } from '../components/profile/CustomizationTab';
import { ConquestsTab } from '../components/profile/ConquestsTab';
import { SquadTab, type FocadaLine } from '../components/profile/SquadTab';
import { ReferralPanel } from '../components/profile/ReferralPanel';
import { knownBadges } from '../lib/badgeInfo';
import { useAuth } from '../contexts/useAuth';
import backArrow from '../assets/pixel/voltar.png';
import gemIcon from '../assets/pixel/gema.png';
import fireIcon from '../assets/pixel/chama-streak.png';

const VALID_TABS: ProfileTab[] = ['info', 'customizacao', 'conquistas', 'squad'];

interface ProfileData {
  gamification: GamificationSummaryDto;
  catalog: MarketplaceCatalogDto;
  badges: BadgeDto[];
  referral: ReferralInfoDto;
}

/**
 * `/perfil` (Fase 18; pixel art na Fase 70, Figma "Perfil — redesign proposto", node 85:4502) - abas
 * via `?tab=` (mesmo padrao de `/start?weekly=`). Casca igual a da sessao diaria: a partir de `lg`,
 * 3 colunas sem rolagem externa (ficha do agente | aba | Focada + indicacao), cada uma rolando por
 * dentro; abaixo de `lg`, tudo empilhado com rolagem normal. Sem endpoint consolidado: compoe
 * gamificacao, catalogo (moldura/cor do nome), badges e indicacao, todos existentes desde as Fases 14/17.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = VALID_TABS.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : 'info';
  const [squadLine, setSquadLine] = useState<FocadaLine | null>(null);
  const onSquadSay = useCallback((line: FocadaLine) => setSquadLine(line), []);

  const { data, error, loading, retry } = useApiResource<ProfileData>(
    () =>
      Promise.all([api.getGamification(), api.getMarketplaceCatalog(), api.getUserBadges(), api.getReferralInfo()]).then(
        ([gamification, catalog, badges, referral]) => ({ gamification, catalog, badges: badges.badges, referral }),
      ),
    [],
  );

  if (!user) return null;
  if (loading) return <Centered text="Carregando perfil..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  function setTab(next: ProfileTab) {
    setSearchParams(next === 'info' ? {} : { tab: next });
  }

  const { frameRarity, nameColor } = equippedLook(data.catalog);
  const line = tab === 'squad' ? (squadLine ?? SQUAD_LOADING_LINE) : focadaLine(tab, user, data.badges);

  return (
    <div className="flex flex-col gap-5 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:gap-6 lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link to="/start" className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
            <img src={backArrow} alt="" className="size-4 pixelated" />
            Voltar pro start
          </Link>
          <h1 className="font-pixel text-3xl leading-none text-primary uppercase lg:text-4xl">Perfil do agente</h1>
          <p className="font-pixel-label text-[8px] text-muted lg:text-[9px]">Sua ficha, suas conquistas e seu squad</p>
        </div>
        <BalanceHud gamification={data.gamification} />
      </header>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6">
        <aside className="flex lg:w-[304px] lg:shrink-0 lg:min-h-0">
          <ScrollArea className="min-w-0 flex-1 lg:min-h-0" contentClassName="flex min-h-full min-w-0 flex-col gap-3">
            <AgentSheet
              displayName={user.displayName}
              email={user.email}
              gamification={data.gamification}
              catalog={data.catalog}
              badges={data.badges}
              onSeeBadges={() => setTab('conquistas')}
            />
          </ScrollArea>
        </aside>

        <section className="flex min-w-0 flex-col gap-[18px] border-2 border-accent bg-base px-4 py-4 lg:min-h-0 lg:flex-1 lg:px-7 lg:py-[22px]">
          <div className="lg:shrink-0">
            <ProfileTabs tab={tab} onChange={setTab} />
          </div>
          <span className="h-0.5 shrink-0 bg-stroke" aria-hidden="true" />
          <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-5">
            {tab === 'info' && <InformationTab user={user} />}
            {tab === 'conquistas' && <ConquestsTab badges={data.badges} />}
            {/* EM BREVE (Fase 25) - ver CustomizationTab.tsx. */}
            {tab === 'customizacao' && <CustomizationTab displayName={user.displayName} frameRarity={frameRarity} nameColor={nameColor} />}
            {tab === 'squad' && <SquadTab onSay={onSquadSay} />}
          </ScrollArea>
        </section>

        <aside className="flex lg:w-64 lg:shrink-0 lg:min-h-0">
          <ScrollArea className="min-w-0 flex-1 lg:min-h-0" contentClassName="flex min-h-full min-w-0 flex-col gap-6">
            <div className="flex shrink-0 flex-col gap-3 border-2 border-secondary bg-base p-[18px]">
              <p className="font-pixel-label text-[9px] text-accent">// Focada</p>
              <FocadaSays expression={line.expression} size="md" stacked>
                {line.text}
              </FocadaSays>
            </div>
            <ReferralPanel info={data.referral} />
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

/** Saldo no topo (Fase 70) - gems e streak, no lugar do conta-giros da Daily. */
function BalanceHud({ gamification }: { gamification: GamificationSummaryDto }) {
  const { totalGems, currentStreak, longestStreak } = gamification;
  return (
    <div className="flex items-center gap-4 border-2 border-secondary bg-base px-4 py-3">
      <span className="hidden font-pixel-label text-[9px] text-secondary sm:inline">Saldo</span>
      <Link to="/loja" className="flex items-center gap-2 hover:brightness-110" aria-label={`${totalGems} gemas - abrir a loja`}>
        <img src={gemIcon} alt="" className="size-4 pixelated" />
        <span className="font-pixel text-[26px] leading-none text-accent">{totalGems}</span>
      </Link>
      <span className="flex items-center gap-2" aria-label={`Streak de ${currentStreak} dias`}>
        <img src={fireIcon} alt="" className="size-4 pixelated" />
        <span className="font-pixel text-[26px] leading-none text-project uppercase">
          {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
        </span>
      </span>
      <span className="font-pixel-label text-[8px] text-muted">Recorde {longestStreak}</span>
    </div>
  );
}

const SQUAD_LOADING_LINE: FocadaLine = { expression: 'neutra', text: 'Deixa eu ver como tá o seu squad...' };

const COUNT_WORDS = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco'];

/** Fala da Focada pra aba aberta (a do Squad vem do proprio SquadTab, depende do squad). */
function focadaLine(tab: Exclude<ProfileTab, 'squad'>, user: UserDto, badges: BadgeDto[]): FocadaLine {
  if (tab === 'customizacao') {
    return { expression: 'neutra', text: 'Tô costurando as molduras e os kits de roupa em pixel art. Quando a Loja abrir, você equipa tudo por aqui.' };
  }
  if (tab === 'info') {
    return user.interests.length === 0
      ? { expression: 'acolhedora', text: 'Me conta do que você gosta: eu uso isso nas analogias da Leitura.' }
      : { expression: 'acolhedora', text: 'Esses interesses moldam as analogias da Leitura. Mudou de ideia? Edita aí que eu ajusto.' };
  }
  const shown = knownBadges(badges);
  const achieved = shown.filter((b) => b.badge.achieved).length;
  const next = shown.find((b) => !b.badge.achieved && b.info.goal !== null);
  if (achieved === shown.length) return { expression: 'comemorando', text: 'Todas conquistadas. Não sobrou nada pra desbloquear, por enquanto.' };
  const count = `${COUNT_WORDS[achieved] ?? achieved} de ${COUNT_WORDS[shown.length]?.toLowerCase() ?? shown.length}`;
  if (!next) return { expression: achieved > 0 ? 'comemorando' : 'neutra', text: `${count}. As que faltam não dependem de você.` };
  const missing = next.info.missing(next.badge.progress);
  return achieved > 0
    ? { expression: 'comemorando', text: `${count}! ${next.info.label} é a próxima: ${missing}.` }
    : { expression: 'acolhedora', text: `Nenhuma ainda. A primeira é ${next.info.label}: ${missing}.` };
}
