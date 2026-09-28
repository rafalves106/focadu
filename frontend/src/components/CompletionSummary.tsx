import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ActivityType, type CompleteDailyResult, type DailyStateDto } from '../api/types';
import { completionLine } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { bridgeScript, isCodeBridge } from '../lib/sessionSteps';
import { SessionFooter, SessionLayout } from './SessionShell';
import { FocadaSays } from './session/FocadaSays';
import { PixelButton, PixelLink } from './session/PixelButton';
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
  // Fase 79 (Figma "Ponte — 05"): na ponte "code comigo" a conclusao conta passos e solucoes vistas,
  // oferece o repositorio opcional e leva direto pro projeto.
  const bridge = isCodeBridge(result.daily);
  const codeSteps = result.daily.activities.filter((a) => a.type === ActivityType.CodeStep);
  const stepsPassed = codeSteps.filter((a) => a.responses.some((r) => r.passed)).length;
  const solutionsSeen = codeSteps.length - stepsPassed;

  return (
    <SessionLayout label="Sessão concluída" sub={`${total} de ${total}`} chain="done">
      <FocadaSays expression="comemorando" size="lg" tone="accent" label="Focada">
        {result.wasReinforcementBonus && result.gemsEarned > 0
          ? 'Reforço gabaritado, agente! Isso é o bônus de superação: errar, voltar e acertar tudo.'
          : bridge
            ? 'Ponte atravessada! Seu script está pronto e cada achado passou pela sua mão. No projeto é você sozinho, e agora você sabe por onde começar.'
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
        {bridge ? (
          <>
            <Stat value={`${stepsPassed}/${codeSteps.length}`} label="Passos de código" />
            <Stat value={`${solutionsSeen}`} label={solutionsSeen === 1 ? 'Solução vista' : 'Soluções vistas'} />
          </>
        ) : (
          <Stat value={`${passedCount}/${total}`} label="Acertos" />
        )}
        {!bridge && !result.daily.isReinforcement && (
          <Stat
            value={`${Math.min(result.daily.penaltyPoints, result.daily.penaltyThreshold)}/${result.daily.penaltyThreshold}`}
            label="Erros"
            tone={result.daily.penaltyPoints > 0 ? 'alert' : undefined}
          />
        )}
      </div>

      {bridge && <BridgeRepositoryCard daily={result.daily} />}

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
          {bridge ? <PixelLink to={`${weekHref}&project=1`}>Ir pro projeto ›</PixelLink> : <PixelLink to={mapHref}>Voltar pro mapa ›</PixelLink>}
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

/**
 * Repositorio do script da ponte (Fase 79) - opcional por decisao do dono: GitHub ou o Forgejo da
 * Focadu, e o dia ja esta concluido sem ele (o codigo fica guardado nas respostas dos passos).
 */
function BridgeRepositoryCard({ daily }: { daily: DailyStateDto }) {
  const [url, setUrl] = useState(daily.codeRepositoryUrl ?? '');
  const [saved, setSaved] = useState(daily.codeRepositoryUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const script = bridgeScript(daily);

  async function handleLink() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.linkDailyCodeRepository(daily.id, url.trim());
      setSaved(updated.codeRepositoryUrl ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o link. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 border-2 border-stroke bg-surface-alt px-4 py-3.5">
      <p className="font-pixel-label text-[10px] text-primary">Seu código num repositório · opcional</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/voce/auditor ou o link do seu Forgejo"
          aria-label="Link do repositório"
          className="min-w-0 flex-1 basis-60 border-2 border-stroke bg-base px-3 py-2 font-sans text-sm text-primary outline-none placeholder:text-muted focus:border-accent"
        />
        <PixelButton ghost onClick={handleLink} disabled={saving || url.trim() === (saved ?? '')}>
          {saving ? 'Salvando...' : saved && url.trim() === '' ? 'Tirar' : 'Linkar'}
        </PixelButton>
      </div>
      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}
      <p className="font-sans text-xs leading-relaxed text-secondary">
        {saved ? (
          <>
            Linkado:{' '}
            <a href={saved} target="_blank" rel="noreferrer" className="text-accent underline">
              {saved}
            </a>
          </>
        ) : (
          'Não precisa pra concluir o dia: seu código já está guardado aqui. Linkar só aponta pro script no GitHub ou no Forgejo.'
        )}
      </p>
      {script && (
        <details className="border-2 border-stroke bg-base px-3.5 py-2.5">
          <summary className="cursor-pointer font-pixel-label text-[9px] text-accent">Ver meu código</summary>
          <div className="mt-3 flex flex-col gap-2">
            <pre className="max-h-80 overflow-auto whitespace-pre font-mono text-xs leading-5 text-primary">{script}</pre>
            <PixelButton ghost tone="muted" onClick={handleCopy} className="self-start">
              {copied ? 'Copiado' : 'Copiar'}
            </PixelButton>
          </div>
        </details>
      )}
    </div>
  );
}
