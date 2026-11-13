import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ActivityType, type CompleteDailyResult, type DailyStateDto } from '../api/types';
import { completionLine } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { bridgeScript, isCodeBridge } from '../lib/sessionSteps';
import { SessionFooter, SessionLayout } from './SessionShell';
import { FocadaLine } from './ui/FocadaLine';

import { Button, ButtonLink } from './ui/Button';

/**
 * Fim de sessao (POST .../complete) - redesign v1, Fase 109 etapa 4 (sistema.md §6, Figma `28:569`): Fala
 * Acerto, tres numeros (gems, dias seguidos, acertos) e um Primario so; o resto vira texto. Reforco diario/semanal,
 * quando existe, ja foi disparado antes (durante alguma resposta) - aqui so aparece o caminho ate ele.
 * `wasReinforcementBonus` troca o rotulo das gemas por "Bonus de Superacao" (Fase 15).
 */
export function CompletionSummary({ result }: { result: CompleteDailyResult }) {
  const { weekly } = useSession();
  const lastResponses = result.daily.activities.flatMap((a) => (a.responses.length > 0 ? [a.responses.at(-1)!] : []));
  const total = lastResponses.length;
  const passedCount = lastResponses.filter((r) => r.passed).length;
  const homeHref = weekly ? `/start?curso=${weekly.courseId}` : '/start';
  const weekHref = weekly ? `/start?course=${weekly.courseId}&weekly=${weekly.id}` : `/start?weekly=${result.daily.weeklyId}`;
  // Fase 79 (Figma "Ponte — 05"): na ponte "code comigo" a conclusao conta passos, oferece o
  // repositorio opcional e leva direto pro projeto.
  const bridge = isCodeBridge(result.daily);
  const codeSteps = result.daily.activities.filter((a) => a.type === ActivityType.CodeStep);
  const stepsPassed = codeSteps.filter((a) => a.responses.some((r) => r.passed)).length;
  const solutionsSeen = codeSteps.length - stepsPassed;
  const reinforcement = result.dailyReinforcementTriggered && result.reinforcementDailyId ? result.reinforcementDailyId : null;
  const day = result.daily.dayNumber;
  const heading = {
    title: result.daily.isReinforcement ? `Reforço do Dia ${day} fechado` : `Dia ${day} fechado`,
    meta: `${passedCount} de ${total} ${total === 1 ? 'etapa certa' : 'etapas certas'}`,
  };

  // Um Primário só (sistema.md §6): o reforço recém-criado > o projeto (ponte) > voltar pro Início.
  const primary = reinforcement
    ? { to: `/hoje?daily=${reinforcement}`, label: 'Fazer o reforço' }
    : bridge
      ? { to: `${weekHref}&project=1`, label: 'Ir pro projeto' }
      : { to: homeHref, label: 'Voltar pro Início' };
  const after = reinforcement ? 'Depois: voltar pro Início.' : bridge ? 'Depois: o Projeto da semana é com você.' : 'Amanhã tem o próximo Dia.';

  return (
    <SessionLayout label="Fim" heading={heading} chain="done">
      <FocadaLine tone="acerto" label={result.daily.isReinforcement ? 'Focada · reforço fechado' : 'Focada · dia fechado'}>
        {result.wasReinforcementBonus && result.gemsEarned > 0
          ? `O que escapou no Dia ${day} agora ficou. Isso vale mais que acertar de primeira.`
          : bridge
            ? 'Ponte atravessada! Seu script está pronto e cada achado passou pela sua mão. No projeto é você sozinho, e agora você sabe por onde começar.'
            : completionLine(passedCount, total)}
      </FocadaLine>

      <div className="flex flex-wrap gap-x-12 gap-y-4">
        <Stat
          value={result.gemsEarned > 0 ? `+${result.gemsEarned}` : '0'}
          label={result.wasReinforcementBonus ? 'gems · bônus de superação' : result.gemsEarned > 0 ? (result.gemsEarned === 1 ? 'gem' : 'gems') : 'gems · limite do mês'}
          accent={result.gemsEarned > 0}
        />
        <Stat value={`${result.streakAfterCompletion}`} label={result.streakAfterCompletion === 1 ? 'dia seguido' : 'dias seguidos'} />
        {bridge ? <Stat value={`${stepsPassed}/${codeSteps.length}`} label="passos de código" /> : <Stat value={`${passedCount}/${total}`} label="acertos" />}
      </div>

      {bridge && solutionsSeen > 0 && (
        <p className="text-pequeno text-secondary">
          {solutionsSeen === 1 ? 'Uma solução você viu pronta' : `${solutionsSeen} soluções você viu prontas`}: vale reler antes do projeto.
        </p>
      )}
      {reinforcement && (
        <p className="text-pequeno text-project">
          Reforço do Dia {day} criado: uma sessão curta só com o que escapou. Não gasta o Dia de amanhã e fica no Início até você fazer.
        </p>
      )}
      {result.weeklyReinforcementTriggered && (
        <p className="text-pequeno text-project">Revisão semanal registrada: você acumulou dias fracos nesta semana. Ela aparece na Visão da semana.</p>
      )}
      {result.daily.isReinforcement && <p className="text-pequeno text-secondary">O ponto âmbar do Dia {day} some da Trilha e do Início.</p>}

      {bridge && <BridgeRepositoryCard daily={result.daily} />}

      <SessionFooter>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-rotulo-sm">
          <span className="text-pequeno text-muted normal-case tracking-normal">{after}</span>
          <Link to={weekHref} className="text-secondary hover:text-primary">
            Ver a semana
          </Link>
          <Link to={`/hoje?daily=${result.daily.id}`} className="text-secondary hover:text-primary">
            Refazer este dia
          </Link>
        </span>
        <ButtonLink to={primary.to}>{primary.label}</ButtonLink>
      </SessionFooter>
    </SessionLayout>
  );
}

/** Um dos três números do fim (Figma `28:569`): valor em Lead, rótulo pequeno embaixo. */
function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`text-lead ${accent ? 'text-accent' : 'text-primary'}`}>{value}</p>
      <p className="text-rotulo-sm text-muted">{label}</p>
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
    <div className="flex flex-col gap-2 border-2 border-stroke bg-base px-4 py-3">
      <p className="text-rotulo-sm text-secondary">Seu código num repositório · opcional</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/voce/auditor ou o link do seu Forgejo"
          aria-label="Link do repositório"
          className="h-12 min-w-0 flex-1 basis-60 border-2 border-stroke-strong bg-base px-3 text-pequeno text-primary outline-none placeholder:text-muted focus:border-accent"
        />
        <Button kind="secundario" onClick={handleLink} disabled={saving || url.trim() === (saved ?? '')}>
          {saving ? 'Salvando...' : saved && url.trim() === '' ? 'Tirar' : 'Linkar'}
        </Button>
      </div>
      {error && <p className="text-pequeno text-alert">{error}</p>}
      <p className="text-pequeno text-secondary">
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
          <summary className="cursor-pointer text-rotulo-sm text-accent">Ver meu código</summary>
          <div className="mt-3 flex flex-col gap-2">
            <pre className="max-h-80 overflow-auto whitespace-pre text-codigo text-primary">{script}</pre>
            <Button kind="secundario" onClick={handleCopy} className="self-start">
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}
