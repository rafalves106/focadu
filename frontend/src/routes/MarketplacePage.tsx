import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CosmeticRarity, type CosmeticItemDto, type MarketplaceCatalogDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ScrollArea } from '../components/ScrollArea';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { FocadaSays } from '../components/session/FocadaSays';
import type { FocadaExpression } from '../lib/focadaLines';
import { PixelButton } from '../components/session/PixelButton';
import { AgentCreator } from '../components/agent/AgentCreator';
import { AgentSprite, WalkingAgent } from '../components/agent/AgentSprite';
import { agentLook, type AgentView } from '../lib/agentSprites';
import { RARITY_CHANCE, RARITY_STYLE, SLOT_LABEL } from '../lib/cosmeticStyle';
import backArrow from '../assets/pixel/voltar.png';
import gemIcon from '../assets/pixel/gema.png';

const VIEWS: { view: AgentView; label: string }[] = [
  { view: 'frente', label: 'Frente' },
  { view: 'costas', label: 'Costas' },
  { view: 'lado-esq', label: 'Lado' },
];

/**
 * Loja (Fase 17; reaberta em pixel art na Fase 71, regras em secret/rascunhos/loja-raridade-e-vitrine.md).
 * Mesma casca do Perfil: a partir de `lg`, 3 colunas sem rolagem externa. Esquerda: o agente, com
 * previa da peca escolhida na vitrine ("provar" nao compra nada). Centro: a vitrine pessoal da semana
 * (ate 6 itens sorteados pelo backend, renovada toda segunda, sem rerolar). Direita: Focada + como a
 * vitrine funciona. Sem agente criado, o centro vira o criador de agente (kit basico + pele + cabelo gratis).
 */
export function MarketplacePage() {
  const { data, error, loading, retry } = useApiResource(() => api.getMarketplaceCatalog(), []);
  const [updated, setUpdated] = useState<MarketplaceCatalogDto | null>(null);
  const [tryOnId, setTryOnId] = useState<string | null>(null);
  const [view, setView] = useState<AgentView>('frente');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  if (loading) return <Centered text="Carregando loja..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  const catalog = updated ?? data;
  if (!catalog) return null;

  const showcase = catalog.showcaseItemIds
    .map((id) => catalog.items.find((i) => i.id === id))
    .filter((i): i is CosmeticItemDto => i !== undefined);
  const tryOn = showcase.find((i) => i.id === tryOnId) ?? null;
  const look = agentLook(catalog, tryOn);
  const days = daysUntil(catalog.showcaseRenewsOn);

  async function buy(item: CosmeticItemDto) {
    setBuyingId(item.id);
    setBuyError(null);
    try {
      setUpdated(await api.purchaseCosmeticItem(item.id));
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'Não deu pra comprar agora.');
    } finally {
      setBuyingId(null);
    }
  }

  async function wear(item: CosmeticItemDto) {
    setBuyingId(item.id);
    try {
      setUpdated(await api.equipCosmetic(item.id));
      setTryOnId(null);
    } finally {
      setBuyingId(null);
    }
  }

  const line = focadaLine(catalog, showcase);

  return (
    <div className="flex flex-col gap-5 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:gap-6 lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link to="/start" className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
            <img src={backArrow} alt="" className="size-4 pixelated" />
            Voltar pro start
          </Link>
          <h1 className="font-pixel text-3xl leading-none text-primary uppercase lg:text-4xl">Loja</h1>
          <p className="font-pixel-label text-[8px] text-muted lg:text-[9px]">Roupas pro seu agente, pagas com as gemas do estudo</p>
        </div>
        <div className="flex items-center gap-4 border-2 border-secondary bg-base px-4 py-3">
          <span className="hidden font-pixel-label text-[9px] text-secondary sm:inline">Saldo</span>
          <span className="flex items-center gap-2" aria-label={`${catalog.totalGems} gemas`}>
            <img src={gemIcon} alt="" className="size-4 pixelated" />
            <span className="font-pixel text-[26px] leading-none text-accent">{catalog.totalGems}</span>
          </span>
          {catalog.agent && (
            <span className="font-pixel-label text-[8px] text-muted">
              Vitrine nova {days <= 1 ? 'amanhã' : `em ${days} dias`}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6">
        {look && (
          <aside className="flex lg:w-[304px] lg:shrink-0 lg:min-h-0">
            <ScrollArea className="min-w-0 flex-1 lg:min-h-0" contentClassName="flex min-h-full min-w-0 flex-col gap-3">
              <div className="flex shrink-0 flex-col gap-3.5 border-2 border-secondary bg-base p-[18px]">
                <p className="font-pixel-label text-[9px] text-accent">// Seu agente</p>
                <div className="flex items-end justify-center gap-5 border-2 border-stroke bg-surface py-5">
                  <AgentSprite look={look} frame={{ view }} scale={5} />
                  <WalkingAgent look={look} direction={view === 'costas' ? 'cima' : view === 'lado-esq' ? 'esquerda' : 'baixo'} scale={3} />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {VIEWS.map((v) => (
                    <button
                      key={v.view}
                      type="button"
                      onClick={() => setView(v.view)}
                      aria-pressed={view === v.view}
                      className={`border-2 py-2 font-pixel-label text-[8px] ${view === v.view ? 'border-accent text-accent' : 'border-stroke text-secondary hover:text-primary'}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {tryOn ? (
                  <div className="flex items-center justify-between gap-2 border-2 border-project px-3 py-2.5">
                    <span className="min-w-0 truncate font-pixel-label text-[8px] text-project">Provando: {tryOn.name}</span>
                    <button type="button" onClick={() => setTryOnId(null)} className="shrink-0 font-pixel-label text-[8px] text-secondary hover:text-primary">
                      Tirar ✕
                    </button>
                  </div>
                ) : (
                  <p className="font-pixel-label text-[8px] text-muted">Clique numa peça da vitrine pra provar.</p>
                )}
              </div>
              <Link
                to="/perfil?tab=customizacao"
                className="flex items-center justify-center border-2 border-secondary bg-base px-4 py-3.5 font-pixel-label text-[11px] text-primary hover:border-accent lg:mt-auto"
              >
                Guarda-roupa ›
              </Link>
            </ScrollArea>
          </aside>
        )}

        <section className="flex min-w-0 flex-col gap-[18px] border-2 border-accent bg-base px-4 py-4 lg:min-h-0 lg:flex-1 lg:px-7 lg:py-[22px]">
          <div className="flex items-center justify-between gap-3 lg:shrink-0">
            <p className="font-pixel-label text-[10px] text-accent">{catalog.agent ? '// Vitrine da semana' : '// Crie seu agente'}</p>
            {catalog.agent && <p className="font-pixel-label text-[8px] text-muted">Só sua · troca toda segunda</p>}
          </div>
          <span className="h-0.5 shrink-0 bg-stroke" aria-hidden="true" />
          <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-5">
            {!catalog.agent ? (
              <AgentCreator onCreated={setUpdated} />
            ) : showcase.length === 0 ? (
              <p className="font-pixel text-xl text-secondary">Você já tem tudo o que a loja vende. Novas peças chegam em breve.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {buyError && <p className="font-pixel-label text-[9px] text-alert">{buyError}</p>}
                <ul className="grid grid-cols-1 gap-3 p-0.5 sm:grid-cols-2 xl:grid-cols-3">
                  {showcase.map((item) => (
                    <ShowcaseCard
                      key={item.id}
                      item={item}
                      preview={agentLook(catalog, item)}
                      selected={item.id === tryOnId}
                      gems={catalog.totalGems}
                      busy={buyingId === item.id}
                      onTry={() => setTryOnId(item.id === tryOnId ? null : item.id)}
                      onBuy={() => buy(item)}
                      onWear={() => wear(item)}
                    />
                  ))}
                </ul>
              </div>
            )}
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
            <div className="flex shrink-0 flex-col gap-3 border-2 border-secondary bg-base p-[18px]">
              <p className="font-pixel-label text-[9px] text-accent">// Como funciona</p>
              <p className="text-[13px] text-secondary">
                A vitrine é sorteada só pra você e troca toda segunda. Peça que saiu volta num sorteio futuro. Pagou, é sua pra sempre.
              </p>
              <ul className="flex flex-col gap-2">
                {Object.values(CosmeticRarity).map((rarity) => (
                  <li key={rarity} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className={`size-3 ${RARITY_STYLE[rarity].swatch}`} aria-hidden="true" />
                      <span className={`font-pixel-label text-[9px] ${RARITY_STYLE[rarity].text}`}>{RARITY_STYLE[rarity].label}</span>
                    </span>
                    <span className="font-pixel text-lg leading-none text-secondary">{RARITY_CHANCE[rarity]}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

/** Cartao de uma peca da vitrine (Fase 71): o agente vestindo a peca, raridade, preco e a acao. */
function ShowcaseCard({
  item,
  preview,
  selected,
  gems,
  busy,
  onTry,
  onBuy,
  onWear,
}: {
  item: CosmeticItemDto;
  preview: ReturnType<typeof agentLook>;
  selected: boolean;
  gems: number;
  busy: boolean;
  onTry: () => void;
  onBuy: () => void;
  onWear: () => void;
}) {
  const rarity = RARITY_STYLE[item.rarity];
  const missing = item.priceGems - gems;
  return (
    <li className={`flex flex-col gap-3 border-2 p-3.5 ${selected ? 'border-project' : rarity.border}`}>
      <button type="button" onClick={onTry} aria-pressed={selected} aria-label={`Provar ${item.name}`} className="flex justify-center border-2 border-stroke bg-surface py-3 hover:border-secondary">
        {preview && <AgentSprite look={preview} scale={3} />}
      </button>
      <div className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`font-pixel-label text-[8px] ${rarity.text}`}>{rarity.label}</span>
          <span className="font-pixel-label text-[8px] text-muted">{SLOT_LABEL[item.slot]}</span>
        </span>
        <p className="font-pixel text-xl leading-tight text-primary">{item.name}</p>
      </div>
      {item.owned ? (
        item.equipped ? (
          <span className="border-2 border-stroke py-3 text-center font-pixel-label text-[10px] text-secondary">Já é sua · vestindo</span>
        ) : (
          <PixelButton ghost onClick={onWear} disabled={busy}>
            Já é sua · vestir
          </PixelButton>
        )
      ) : (
        <PixelButton onClick={onBuy} disabled={busy || missing > 0}>
          <img src={gemIcon} alt="" className="size-4 pixelated" />
          {missing > 0 ? `Faltam ${missing}` : `Comprar · ${item.priceGems}`}
        </PixelButton>
      )}
    </li>
  );
}

/** Dias corridos ate a proxima segunda (yyyy-MM-dd, data local do servidor). */
function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

function focadaLine(catalog: MarketplaceCatalogDto, showcase: CosmeticItemDto[]): { expression: FocadaExpression; text: string } {
  if (!catalog.agent) {
    return { expression: 'acolhedora', text: 'Antes de gastar gema, monta o seu agente. O kit básico é por minha conta.' };
  }
  const forSale = showcase.filter((i) => !i.owned);
  if (forSale.length === 0) return { expression: 'comemorando', text: 'Levou a vitrine inteira. Segunda tem mais, agente.' };
  const cheapest = Math.min(...forSale.map((i) => i.priceGems));
  if (catalog.totalGems >= cheapest) {
    return { expression: 'comemorando', text: 'Tem gema pra gastar. Prova antes, a vitrine não troca por arrependimento.' };
  }
  return {
    expression: 'neutra',
    text: `Faltam ${cheapest - catalog.totalGems} gemas pra peça mais barata. Uma daily por dia resolve isso, agente.`,
  };
}
