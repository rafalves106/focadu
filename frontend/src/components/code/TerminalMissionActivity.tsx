import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { DailyActivityDto, DailyStateDto, LabConfigDto, TerminalMissionDto } from '../../api/types';
import checkIcon from '../../assets/pixel/check.png';
import playIcon from '../../assets/pixel/play-ativo.png';
import { isFirstOfActivityGroup } from '../../lib/activityGroup';
import { useSession } from '../../lib/sessionContext';
import { useIsDesktop } from '../../lib/useIsDesktop';
import { useLab } from '../../lab/labContext';
import { displayOutput, toRecord } from '../../lab/labOutput';
import { evaluateMission, isCommandNotFound } from '../../lab/terminalMission';
import { updateMissionProgress, useMissionProgress, type MissionProgress, type MissionStrip } from '../../lab/terminalMissionStore';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { BlockIntro } from '../session/BlockIntro';
import { PixelButton } from '../session/PixelButton';
import { OutputBox } from './codeParts';
import { LabError } from './LabCodeStepActivity';
import { LabProgressBar, TerminalPanel, type TerminalEntry } from './labParts';

/**
 * Missao no terminal (dias normais do Linux; Figma "Laboratório de código — v2", quadros 08 a 10). So o terminal do
 * Linux embutido (o mesmo v86 da ponte, ja logado como o usuario do `lab.user`), sem editor: o aluno cumpre
 * missoes de comando e o proprio navegador confere depois de cada um (ver `lab/terminalMission.ts`). Sem IA, sem
 * nota, sem tentativa gasta; a dica e um texto fixo da curadoria, em dois niveis. Concluir so registra a atividade
 * (Score fixo 100 no backend, como a Leitura).
 *
 * So desktop: no celular o aluno le o aviso e pode seguir - as missoes ficam pra quando ele estiver no computador.
 */
export function TerminalMissionActivity({
  dailyId,
  daily,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const { weekly } = useSession();
  const { session, snapshot } = useLab();
  const isDesktop = useIsDesktop();
  const lab = daily.lab ?? null;
  const missions = activity.missions ?? [];
  const alreadyDone = activity.responses.length > 0;
  const progress = useMissionProgress(activity.id, missions.length, alreadyDone);

  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || alreadyDone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sobe o Linux do dia ja na tela de entrada do bloco, pra o download terminar enquanto o aluno le. Nunca no celular.
  useEffect(() => {
    if (!isDesktop || !lab || !weekly) return;
    session.ensure(lab, weekly.curatedContents).catch(() => undefined);
  }, [session, lab, weekly, isDesktop]);

  if (!lab || missions.length === 0) return null;
  const currentLab: LabConfigDto = lab;

  const viewing = progress.viewing;
  const mission: TerminalMissionDto = missions[viewing];
  const doneCount = progress.passedWith.filter((c) => c !== null).length;
  const allDone = doneCount === missions.length;
  const viewingDone = progress.passedWith[viewing] !== null;
  const ready = snapshot.status === 'ready';
  const loading = snapshot.status === 'loading' || snapshot.status === 'idle';
  const running = snapshot.status === 'running';
  const user = currentLab.user ?? 'root';
  const prompt = `${user}@srv:~$`;
  const hintsTotal = mission.hints.length;
  const hintsShown = progress.hintsShown[viewing];

  function patch(change: (p: MissionProgress) => MissionProgress) {
    updateMissionProgress(activity.id, change);
  }

  async function handleCommand(command: string) {
    if (!ready) return;
    setError(null);
    const at = viewing;
    try {
      const result = await session.exec(command);
      const output = displayOutput(toRecord(result), currentLab.timeoutSeconds);
      const entry: TerminalEntry = { command, output, exitCode: result.exitCode };
      const pending = progress.passedWith[at] === null;
      const passed =
        pending && (await evaluateMission(missions[at], command, result.output, async (probe) => (await session.exec(probe)).output));
      const strip: MissionStrip = passed || !pending
        ? { kind: 'ok' }
        : isCommandNotFound(result.output, result.exitCode)
          ? { kind: 'notfound' }
          : { kind: 'miss' };
      patch((p) => ({
        ...p,
        entries: [...p.entries, entry],
        passedWith: passed ? p.passedWith.map((c, i) => (i === at ? command : c)) : p.passedWith,
        strip,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O terminal do laboratório não respondeu.');
    }
  }

  function showHint() {
    if (hintsTotal === 0) return;
    const level = Math.min(hintsShown, hintsTotal - 1);
    patch((p) => ({
      ...p,
      hintsShown: p.hintsShown.map((n, i) => (i === viewing ? Math.min(n + 1, hintsTotal) : n)),
      strip: { kind: 'hint', text: mission.hints[level] },
    }));
  }

  async function finish() {
    if (alreadyDone) {
      onContinue();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitActivityResponse(dailyId, activity.id, {});
      onDailyRefetched(await api.getDaily(dailyId));
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a missão. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (alreadyDone || allDone) {
      void finish();
      return;
    }
    const after = progress.passedWith.findIndex((c, i) => i > viewing && c === null);
    const following = after >= 0 ? after : progress.passedWith.findIndex((c) => c === null);
    patch((p) => ({ ...p, viewing: following, strip: { kind: 'idle' } }));
  }

  function retryLab() {
    if (!weekly) return;
    session.reset();
    session.ensure(currentLab, weekly.curatedContents).catch(() => undefined);
  }

  if (!started) return <BlockIntro activity={activity} onStart={() => setStarted(true)} />;

  // ---- celular: o aviso; segue sem as missoes (Figma, quadro 07) ----
  if (!isDesktop) {
    return (
      <SessionLayout sub={`${missions.length} ${missions.length === 1 ? 'missão' : 'missões'}`}>
        <p className="font-sans text-lg font-semibold leading-snug text-primary">Missão no terminal</p>
        <section className="flex flex-col gap-3 border-2 border-accent bg-base px-4 py-5" data-testid="lab-celular">
          <p className="font-pixel-label text-[8px] text-accent">// Terminal do laboratório</p>
          <p className="font-pixel text-3xl leading-none text-primary">Continue no computador</p>
          <p className="font-sans text-sm text-secondary">
            O terminal precisa de teclado e de mais memória do que o celular costuma ter. Dá pra seguir o dia daqui e fazer as missões depois, no computador.
          </p>
        </section>
        {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}
        <SessionFooter>
          <p className="font-pixel-label text-[8px] text-muted">Sem nota · sem tentativa</p>
          <PixelButton onClick={() => void finish()} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Seguir sem as missões ›'}
          </PixelButton>
        </SessionFooter>
      </SessionLayout>
    );
  }

  const nextLabel = alreadyDone ? 'Próxima etapa ›' : allDone ? 'Concluir missões ›' : 'Próxima missão ›';
  const canNext = alreadyDone || viewingDone;

  return (
    <SessionLayout sub={`Missão ${viewing + 1} de ${missions.length}`}>
      <div className="flex flex-col gap-1.5">
        <p className="font-sans text-lg font-semibold leading-snug text-primary" data-testid="mission-title">
          Missão {viewing + 1}: {mission.prompt}
        </p>
        <p className="font-sans text-sm text-secondary">Digite o comando no terminal. O laboratório confere sozinho: sem nota, sem tentativa.</p>
      </div>

      <div className="flex min-h-0 flex-col gap-3 lg:flex-row lg:gap-3.5">
        <ol className="flex shrink-0 flex-col gap-2 border-2 border-stroke bg-base px-3.5 py-3.5 lg:w-52" aria-label="Missões" data-testid="mission-list">
          <li className="font-pixel-label text-[9px] text-accent">// Missões</li>
          {missions.map((m, i) => {
            const passedWith = progress.passedWith[i];
            const isDone = passedWith !== null;
            const isCurrent = i === viewing && !isDone;
            return (
              <li
                key={m.title}
                className={`flex items-start gap-2.5 border-2 px-2.5 py-2.5 ${isCurrent ? 'border-accent' : 'border-stroke'}`}
                data-state={isDone ? 'feita' : isCurrent ? 'atual' : 'por-fazer'}
              >
                {isDone ? (
                  <img src={checkIcon} alt="Cumprida" className="mt-0.5 size-4 shrink-0 pixelated" />
                ) : isCurrent ? (
                  <img src={playIcon} alt="Em curso" className="mt-0.5 size-4 shrink-0 pixelated" />
                ) : (
                  <span className="mt-[7px] ml-[5px] size-1.5 shrink-0 bg-muted" aria-hidden="true" />
                )}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={`font-sans text-[13px] font-semibold leading-snug ${isDone || isCurrent ? 'text-primary' : 'text-muted'}`}>
                    {i + 1}. {m.title}
                  </span>
                  {isDone && passedWith && <span className="truncate font-mono text-[11px] text-secondary">{passedWith}</span>}
                  {isCurrent && <span className="font-mono text-[11px] text-accent">missão em curso</span>}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {snapshot.status === 'error' ? (
            <LabError message={snapshot.error} onRetry={retryLab} />
          ) : loading ? (
            <OutputBox value="">
              <LabProgressBar snapshot={snapshot} />
            </OutputBox>
          ) : (
            <TerminalPanel
              entries={progress.entries}
              onRun={handleCommand}
              busy={running}
              disabled={!ready}
              serviceLabel={`${user}@srv · pronto`}
              placeholder="digite o comando da missão"
              prompt={prompt}
              title="Terminal · Linux do laboratório"
              logClassName="min-h-40 max-h-72"
              className="flex-1"
            />
          )}
          <ConferenceStrip strip={progress.strip} mission={mission} number={viewing + 1} hintsShown={hintsShown} hintsTotal={hintsTotal} />
        </div>
      </div>

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      <SessionFooter>
        <p className="font-pixel-label text-[8px] text-muted">Erre à vontade</p>
        <div className="flex items-center gap-3">
          <PixelButton tone="project" ghost onClick={showHint} disabled={hintsTotal === 0 || alreadyDone}>
            {hintsShown < hintsTotal ? `Dica · ${hintsShown + 1} de ${hintsTotal}` : 'Rever a dica'}
          </PixelButton>
          <PixelButton onClick={next} disabled={!canNext || submitting} data-testid="mission-next">
            {submitting ? 'Enviando...' : nextLabel}
          </PixelButton>
        </div>
      </SessionFooter>
    </SessionLayout>
  );
}

/** Faixa abaixo do terminal: aguardando, cumprida (com o que reparar), comando inexistente, ainda nao ou dica. */
function ConferenceStrip({
  strip,
  mission,
  number,
  hintsShown,
  hintsTotal,
}: {
  strip: MissionStrip;
  mission: TerminalMissionDto;
  number: number;
  hintsShown: number;
  hintsTotal: number;
}) {
  const base = 'flex flex-col gap-1.5 border-2 bg-base px-3.5 py-3';
  if (strip.kind === 'ok') {
    return (
      <div className={`${base} border-accent`} role="status" data-testid="mission-strip" data-kind="ok">
        <p className="flex items-center gap-2 font-pixel-label text-[8px] text-accent">
          <img src={checkIcon} alt="" className="size-4 pixelated" />
          Missão cumprida
        </p>
        <p className="font-sans text-[13px] leading-snug text-primary">{mission.note}</p>
      </div>
    );
  }
  if (strip.kind === 'hint') {
    return (
      <div className={`${base} border-project`} role="status" data-testid="mission-strip" data-kind="hint">
        <p className="font-pixel-label text-[8px] text-project">
          // Dica {Math.min(hintsShown, hintsTotal)} de {hintsTotal} · não gasta nada
        </p>
        <p className="font-sans text-[13px] leading-snug text-primary">{strip.text}</p>
      </div>
    );
  }
  if (strip.kind === 'notfound') {
    return (
      <div className={`${base} border-project`} role="status" data-testid="mission-strip" data-kind="notfound">
        <p className="font-pixel-label text-[8px] text-project">// Conferindo: esse comando não existe</p>
        <p className="font-sans text-[13px] leading-snug text-primary">O terminal não achou esse comando. Confira a grafia e tente de novo: não gasta tentativa.</p>
      </div>
    );
  }
  if (strip.kind === 'miss') {
    return (
      <div className={`${base} border-stroke`} role="status" data-testid="mission-strip" data-kind="miss">
        <p className="font-pixel-label text-[8px] text-secondary">// Conferindo: ainda não é o que a missão pede</p>
        <p className="font-sans text-[13px] leading-snug text-primary">O comando rodou, mas a missão ainda não foi cumprida. Releia o enunciado ou abra uma dica: não gasta tentativa.</p>
      </div>
    );
  }
  return (
    <div className={`${base} border-stroke`} role="status" data-testid="mission-strip" data-kind="idle">
      <p className="font-pixel-label text-[8px] text-secondary">// Conferindo: aguardando o comando da missão {number}</p>
    </div>
  );
}
