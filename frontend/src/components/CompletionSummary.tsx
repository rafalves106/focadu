import { Link } from 'react-router-dom';
import type { CompleteDailyResult } from '../api/types';
import { completionLine } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { SessionFooter, SessionLayout } from './SessionShell';
import { FocadaSays } from './session/FocadaSays';
import { PixelLink } from './session/PixelButton';
import gemIcon from '../assets/pixel/gema.png';
import fireIcon from '../assets/pixel/chama-streak.png';
import reinforcementIcon from '../assets/pixel/mapa/badge-reforco.png';

/**
 * Sessao concluida (POST .../complete) - Fase 68, Figma "Daily — 13": a Focada comemora e a
 * recompensa vira cartoes (gemas desta conclusao, streak, acertos, erros). Reforco diario/semanal,
 * quando existe, ja foi disparado antes (durante alguma resposta) - aqui so aparece o caminho ate ele.
 * `wasReinforcementBonus` troca o rotulo das gemas por "Bonus de Superacao" (Fase 15).
 */
export function CompletionSummary({ result }: { result: CompleteDailyResult }) {
  const { weekly } = useSession();
  const lastResponses = result.daily.activities.flatMap((a) => (a.responses.length > 0 ? [a.responses.at(-1)!] : []));
  const total = lastResponses.length;
  const passedCount = lastResponses.filter((r) => r.passed).length;
  const mapHref = weekly ? `/start?course=${weekly.courseId}` : '/start';
  const weekHref = weekly ? `/start?course=${weekly.courseId}&weekly=${weekly.id}` : `/start?weekly=${result.daily.weeklyId}`;

  return (
    <SessionLayout label="Sessão concluída" sub={`${total} de ${total}`} chain="done">
      <FocadaSays expression="comemorando" size="lg" tone="accent" label="Focada">
        {result.wasReinforcementBonus && result.gemsEarned > 0
          ? 'Reforço gabaritado, agente! Isso é o bônus de superação: errar, voltar e acertar tudo.'
          : completionLine(passedCount, total)}
      </FocadaSays>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          icon={gemIcon}
          value={result.gemsEarned > 0 ? `+${result.gemsEarned}` : '0'}
          label={result.wasReinforcementBonus ? 'Bônus de superação' : result.gemsEarned > 0 ? 'Gemas' : 'Gemas (limite do mês)'}
          tone="accent"
        />
        <Stat icon={fireIcon} value={`${result.streakAfterCompletion} ${result.streakAfterCompletion === 1 ? 'dia' : 'dias'}`} label="Streak" tone="project" />
        <Stat value={`${passedCount}/${total}`} label="Acertos" />
        {!result.daily.isReinforcement && (
          <Stat
            value={`${Math.min(result.daily.penaltyPoints, result.daily.penaltyThreshold)}/${result.daily.penaltyThreshold}`}
            label="Erros"
            tone={result.daily.penaltyPoints > 0 ? 'alert' : undefined}
          />
        )}
      </div>

      {result.dailyReinforcementTriggered && result.reinforcementDailyId && (
        <div className="flex flex-wrap items-center gap-4 border-2 border-alert px-4 py-3">
          <img src={reinforcementIcon} alt="" className="size-8 shrink-0 pixelated" />
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
            <p className="font-pixel-label text-[10px] text-alert">Reforço do dia {result.daily.dayNumber} criado</p>
            <p className="font-pixel text-lg leading-tight text-secondary">Uma sessão curta só com o que escapou. Não gasta a sessão do dia — fica no mapa até você fazer.</p>
          </div>
          <PixelLink to={`/hoje?daily=${result.reinforcementDailyId}`} tone="alert">
            Fazer agora ›
          </PixelLink>
        </div>
      )}

      {result.weeklyReinforcementTriggered && (
        <div className="flex flex-col gap-1 border-2 border-project px-4 py-3">
          <p className="font-pixel-label text-[10px] text-project">Revisão semanal registrada</p>
          <p className="font-pixel text-lg leading-tight text-secondary">Você acumulou dias fracos nesta semana. A revisão aparece na visão da semana.</p>
        </div>
      )}

      <SessionFooter>
        <Link to={`/hoje?daily=${result.daily.id}`} className="font-pixel-label text-[9px] text-secondary hover:text-primary">
          Refazer este dia
        </Link>
        <div className="flex flex-wrap gap-3">
          <PixelLink to={weekHref} tone="muted" ghost>
            Ver a semana
          </PixelLink>
          <PixelLink to={mapHref}>Voltar pro mapa ›</PixelLink>
        </div>
      </SessionFooter>
    </SessionLayout>
  );
}

function Stat({ icon, value, label, tone }: { icon?: string; value: string; label: string; tone?: 'accent' | 'project' | 'alert' }) {
  const color = tone === 'accent' ? 'border-accent text-accent' : tone === 'project' ? 'border-project text-project' : tone === 'alert' ? 'border-alert text-alert' : 'border-secondary text-primary';
  return (
    <div className={`flex flex-col gap-2 border-2 px-4 py-3 ${color}`}>
      <p className="flex items-center gap-2 whitespace-nowrap font-pixel text-3xl leading-none">
        {icon && <img src={icon} alt="" className="size-8 pixelated" />}
        {value}
      </p>
      <p className="font-pixel-label text-[8px] text-secondary">{label}</p>
    </div>
  );
}
