import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { agentLook } from '../lib/agentSprites';
import { useAuth } from '../contexts/useAuth';
import { Centered } from '../components/Layout';
import { ScrollArea } from '../components/ScrollArea';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { SquadHero } from '../components/squad/SquadHero';
import { SquadFeed } from '../components/squad/SquadFeed';
import { SquadRanking } from '../components/squad/SquadRanking';
import { InviteModal } from '../components/squad/InviteModal';
import { NoSquadView } from '../components/squad/NoSquadView';
import backArrow from '../assets/pixel/voltar.png';

/**
 * `/squad` - QG do Squad (Fase 72, Figma "Perfil + Squad — v2", nodes 121:6971, 125:9441, 125:12224 e
 * 126:14410). Era a aba Squad do Perfil (Fases 24 e 70); virou tela propria, destino do botao Squad
 * do menu. A partir de `lg`: cabecalho largo (nome/convite | escalacao | meta da semana) e, embaixo,
 * feed + ranking sem rolagem externa, cada um rolando por dentro. Abaixo de `lg`, tudo empilhado.
 * 404 "squad_nao_encontrado" do GET /squads/me/hq e o estado "sem squad", nao erro.
 */
export function SquadPage() {
  const { user } = useAuth();
  const [inviting, setInviting] = useState(false);
  const { data: hq, error, loading, retry } = useApiResource(() => api.getSquadHq(), []);
  const noSquad = error?.code === 'squad_nao_encontrado';
  // O agente de quem ainda nao tem squad (sozinho no palco) - so nesse estado.
  const { data: catalog } = useApiResource(() => (noSquad ? api.getMarketplaceCatalog() : Promise.resolve(null)), [noSquad]);

  if (!user) return null;
  if (loading && !hq) return <Centered text="Abrindo o QG..." />;
  if (error && !noSquad) return <ApiErrorScreen error={error} onRetry={retry} />;

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pt-8 lg:pb-10 xl:px-16 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6 lg:tight:pt-4 lg:tight:pb-4">
      <header className="flex items-center justify-between gap-3 lg:shrink-0">
        <Link to="/start" className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
          <img src={backArrow} alt="" className="size-4 pixelated" />
          Voltar pro start
        </Link>
        <p className="font-pixel-label text-[9px] text-muted">Squad</p>
      </header>

      {noSquad || !hq ? (
        <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-4">
          <NoSquadView look={catalog ? agentLook(catalog) : null} onDone={retry} />
        </ScrollArea>
      ) : (
        <>
          <div className="lg:shrink-0">
            <SquadHero hq={hq} userId={user.id} onInvite={() => setInviting(true)} />
          </div>
          <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:short:gap-3">
            <SquadFeed feed={hq.feed} members={hq.members} userId={user.id} />
            <SquadRanking members={hq.members} ownerUserId={hq.ownerUserId} coLeaderUserId={hq.coLeaderUserId} userId={user.id} onChanged={retry} />
          </div>
          {inviting && <InviteModal squadName={hq.name} joinCode={hq.joinCode} onClose={() => setInviting(false)} />}
        </>
      )}
    </div>
  );
}
