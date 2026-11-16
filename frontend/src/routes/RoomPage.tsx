import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { roomsApi, type RoomState, type RoomTask } from '../api/rooms';
import { useApiResource } from '../api/useApiResource';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { ChainMap, FlagField, MachinePanel, ProgressCard, Recorder, TaskRow, VoiceFeedback } from '../components/rooms/RoomParts';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FocadaLine } from '../components/ui/FocadaLine';
import { classifyApiError } from '../lib/apiError';
import { doneTasks, lockedText, roomMinutes, roomSubtitle, scoresText, unit } from '../lib/roomText';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';

/**
 * Sala prática (Fase 110; Figma 72:194, 72:466, 72:743, 73:767, 73:905, 84:1078 e 74:978). Tarefas em sequência:
 * teoria curta, flag conferida no servidor, áudio da entrega (trava a próxima; nota baixa deixa seguir) e a
 * devolutiva da Focada. Fechamento com um áudio curto de "como eu corrigiria" e o resumo. No celular, só o
 * progresso e o aviso de abrir no computador.
 */
export function RoomPage() {
  const { roomId = '' } = useParams();
  const { data, error, loading, retry } = useApiResource(() => roomsApi.get(roomId), [roomId]);
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const [updated, setUpdated] = useState<RoomState | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [machineBusy, setMachineBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const room = updated?.id === roomId ? updated : data;
  if (loading && !room) return <Centered text="Carregando sala..." />;
  if (error && !room) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!room) return null;

  const courseName = courses?.find((c) => c.id === room.courseId)?.name;
  const roomsLink = `/salas?course=${room.courseId}`;
  const done = doneTasks(room).length;
  const total = room.tasks.length;
  const active = room.tasks.find((t) => t.state === 'Current' || t.state === 'AwaitingVoice');
  const view = room.final.voice ? 'resumo' : room.final.unlocked && !feedbackFor ? 'fechamento' : 'tarefas';
  const where = view === 'resumo' ? 'Resumo' : view === 'fechamento' ? 'Fechamento' : active ? `${unit(room)} ${active.number} de ${total}` : null;

  const toggleMachine = async (on: boolean) => {
    setMachineBusy(true);
    try {
      setUpdated(await roomsApi.setMachine(room.id, on));
    } catch (err) {
      setNotice(classifyApiError(err).message);
    } finally {
      setMachineBusy(false);
    }
  };
  const download = () => {
    roomsApi.downloadEnvironment(room.id, `${room.environmentFolder}.zip`).catch((err: Error) => setNotice(err.message));
  };

  if (room.locked) {
    return (
      <div className="tela-cheia flex flex-col gap-4 p-4 md:p-6 wide:p-8">
        <Breadcrumb parts={[courseName, { label: 'Salas', to: roomsLink }, room.title]} />
        <h1 className="text-lead text-primary md:text-titulo">{room.title}</h1>
        <Card kind="ambar" eyebrow="Sala trancada">
          <p className="text-corpo text-primary">{lockedText(room)}.</p>
          <ButtonLink to={roomsLink} kind="secundario" className="self-start">
            Voltar pras salas
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const progressText = `${done} de ${total} ${room.kind === 'Challenge' ? 'elos' : 'tarefas'} · ${scoresText(room)}${room.startedAt ? ` · ${roomMinutes(room)} min nesta sala` : ''}`;

  return (
    <div className="tela-cheia flex gap-6 p-4 md:p-6 wide:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Breadcrumb parts={[courseName, { label: 'Salas', to: roomsLink }, room.title, where]} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-lead text-primary md:text-titulo">{view === 'resumo' ? 'Sala concluída' : room.title}</h1>
          <p className="text-pequeno text-muted">
            {view === 'resumo' ? `${room.title} · ${roomMinutes(room)} min · ${total + 1} áudios` : view === 'fechamento' ? `${total} de ${total} tarefas · falta a sua voz` : roomSubtitle(room)}
          </p>
        </div>
        {notice && <p className="text-pequeno text-alert">{notice}</p>}

        {/* Celular (Figma 74:978): a sala roda no computador; aqui só o progresso. */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="flex flex-col gap-4 border-2 border-dashed border-stroke-strong p-6">
            <FocadaLine size="devolutiva" label="Focada">
              Abra no computador. A sala roda no Docker e no Kali do seu computador; aqui no celular você só acompanha o progresso.
            </FocadaLine>
            <Button kind="secundario" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
              Copiar o link da sala
            </Button>
          </div>
          <ProgressCard done={done} total={total}>
            {progressText}
            {active && (
              <>
                <br />
                {unit(room)} {active.number}: {active.title}. Continue no computador.
              </>
            )}
          </ProgressCard>
        </div>

        <div className="hidden flex-col gap-4 md:flex">
          {view === 'resumo' && <SummaryView room={room} roomsLink={roomsLink} />}
          {view === 'fechamento' && <FinalCard room={room} onRoom={setUpdated} />}
          {view === 'tarefas' && (
            <>
              {room.kind === 'Challenge' && <ChainMap room={room} />}
              <ol className="flex flex-col gap-2">
                {room.tasks.map((task) => {
                  const prefix = room.kind === 'Challenge' ? `Elo ${task.number}` : `T${task.number}`;
                  if (task.id === feedbackFor && task.voice)
                    return <FeedbackCard key={task.id} room={room} task={task} onNext={() => setFeedbackFor(null)} />;
                  if (task.state === 'Current' || task.state === 'AwaitingVoice')
                    return <TaskCard key={task.id} room={room} task={task} onRoom={setUpdated} onVoiced={() => setFeedbackFor(task.id)} />;
                  return <TaskRow key={task.id} room={room} task={task} prefix={prefix} lockedNote={lockedNote(room, task, feedbackFor)} />;
                })}
              </ol>
            </>
          )}
        </div>
      </div>

      <aside aria-label="Máquina e progresso da sala" className="hidden w-[400px] shrink-0 flex-col gap-6 overflow-y-auto md:flex lg:max-xl:w-[360px]">
        {view !== 'resumo' && !feedbackFor && <FocadaLine size="devolutiva">{focadaLine(room, view)}</FocadaLine>}
        {view === 'resumo' ? (
          <SummarySide room={room} />
        ) : (
          <>
            <MachinePanel room={room} busy={machineBusy} onToggle={(on) => void toggleMachine(on)} onDownload={download} />
            <ProgressCard done={done} total={total}>
              {progressText}
            </ProgressCard>
          </>
        )}
      </aside>
    </div>
  );
}

function focadaLine(room: RoomState, view: string): string {
  if (view === 'fechamento') return 'Explorar é metade. Quem sabe corrigir entendeu o ataque de verdade.';
  if (!room.machineOn) return 'Primeiro suba a sua máquina: baixe a sala, rode o iniciar.sh e marque aqui ao lado.';
  if (room.tasks.some((t) => t.state === 'AwaitingVoice')) return 'Resposta certa. Agora me conta com a sua voz: o que fez, o que viu, por que funcionou.';
  if (room.kind === 'Challenge') return 'Aqui eu não guio. Use o que você já sabe e o que viu nos elos anteriores.';
  return 'A flag é só a prova. O que vale é você explicar o que viu.';
}

function lockedNote(room: RoomState, task: RoomTask, feedbackFor: string | null): string {
  const previous = room.tasks.find((t) => t.number === task.number - 1);
  if (previous?.id === feedbackFor) return 'Abre com o Próxima tarefa';
  if (previous && previous.state !== 'Locked') return `Abre depois do áudio d${room.kind === 'Challenge' ? 'o' : 'a'} ${previous.chainLabel ?? `${unit(room)} ${previous.number}`}`;
  return `Abre depois d${room.kind === 'Challenge' ? 'o Elo' : 'a Tarefa'} ${task.number - 1}`;
}

function TaskCard({ room, task, onRoom, onVoiced }: { room: RoomState; task: RoomTask; onRoom: (room: RoomState) => void; onVoiced: () => void }) {
  const challenge = room.kind === 'Challenge';
  const awaitingVoice = task.state === 'AwaitingVoice';
  const total = room.tasks.length;
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [hints, setHints] = useState(0);
  const [showTheory, setShowTheory] = useState(false);
  const recorder = useVoiceRecorder(async (audio) => {
    onRoom(await roomsApi.submitTaskVoice(room.id, task.id, audio));
    onVoiced();
  });

  const check = async () => {
    if (!answer.trim()) return setWrong('Digite a resposta que você achou no alvo.');
    setChecking(true);
    setWrong(null);
    try {
      const result = await roomsApi.submitFlag(room.id, task.id, answer);
      if (result.correct) onRoom(result.room);
      else setWrong('Ainda não é essa. Confira no alvo e tente de novo: errar aqui não custa nada.');
    } catch (err) {
      setWrong(classifyApiError(err).message);
    } finally {
      setChecking(false);
    }
  };

  const next = room.tasks.find((t) => t.number === task.number + 1);
  const eyebrow = challenge
    ? `Elo ${task.number} de ${total}${task.chainLabel ? ` · ${task.chainLabel}` : ''}`
    : `${unit(room)} ${task.number} de ${total}`;

  return (
    <li className="flex flex-col gap-3 border-2 border-accent bg-surface p-6 shadow-[4px_4px_0_0_var(--color-accent-shadow)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-rotulo-sm text-secondary">{eyebrow}</p>
        {awaitingVoice ? (
          <button type="button" className="text-rotulo-sm text-accent hover:text-accent-hover" onClick={() => setShowTheory((v) => !v)}>
            {showTheory ? 'Esconder a teoria' : 'Ver a teoria'}
          </button>
        ) : (
          challenge && <p className="text-rotulo-sm text-muted">Sem passo a passo</p>
        )}
      </div>
      <h2 className="text-lead text-primary">{task.title}</h2>
      {(!awaitingVoice || showTheory) && (
        <>
          <p className="text-corpo whitespace-pre-line text-primary">{task.theory}</p>
          <p className="text-corpo text-primary">{task.question}</p>
        </>
      )}

      {awaitingVoice ? (
        <>
          <FlagField label={challenge ? 'Flag do elo' : 'Sua resposta'} value={answer || 'Resposta certa'} placeholder="" correct />
          <p className="text-rotulo-sm text-secondary">Agora, sua voz</p>
          <p className="text-corpo text-primary">{task.voicePrompt}</p>
          <p className="text-pequeno text-muted">
            De 30 a 90 s.{next ? ` ${next.chainLabel ?? `A ${unit(room)} ${next.number}`} abre depois da devolutiva.` : ''}
          </p>
          <Recorder
            phase={recorder.phase}
            seconds={recorder.seconds}
            error={recorder.error}
            onStart={() => void recorder.start()}
            onStop={recorder.stop}
            hint="Mínimo 30 s, máximo 1 min 30. O que fez, o que viu, por que funcionou."
          />
          <p className="text-pequeno text-muted">Nota abaixo de 80 não trava: você segue, e a Focada aponta o que faltou.</p>
        </>
      ) : (
        <>
          <FlagField
            label={challenge ? 'Flag do elo' : 'Sua resposta'}
            value={answer}
            placeholder={task.answerFormat || 'FOCADU{...}'}
            error={wrong}
            onChange={(value) => {
              setAnswer(value);
              setWrong(null);
            }}
            onSubmit={() => void check()}
          />
          {hints > 0 && (
            <ol className="flex flex-col gap-2">
              {task.hints.slice(0, hints).map((hint, i) => (
                <li key={hint} className="border-2 border-stroke bg-base px-4 py-2 text-pequeno text-secondary">
                  <span className="text-rotulo-sm text-accent">Dica {i + 1} · </span>
                  {hint}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Button loading={checking} onClick={() => void check()}>
              {challenge ? 'Conferir a flag' : 'Conferir a resposta'}
            </Button>
            {hints < task.hints.length && (
              <button type="button" className="text-rotulo-sm text-accent hover:text-accent-hover" onClick={() => setHints((n) => n + 1)}>
                Dica {hints + 1} de {task.hints.length}
              </button>
            )}
          </div>
          <p className="text-pequeno text-muted">
            Depois da resposta certa: grave de 30 a 90 s contando o que fez.
            {next ? ` Só aí ${challenge ? `o ${next.chainLabel ?? `Elo ${next.number}`}` : `a Tarefa ${next.number}`} abre.` : ' Depois vem o fechamento da sala.'}
          </p>
        </>
      )}
    </li>
  );
}

function FeedbackCard({ room, task, onNext }: { room: RoomState; task: RoomTask; onNext: () => void }) {
  const [showTheory, setShowTheory] = useState(false);
  const next = room.tasks.find((t) => t.number === task.number + 1);
  return (
    <li className="flex flex-col gap-3 border-2 border-stroke bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-rotulo-sm text-secondary">
          {unit(room)} {task.number} de {room.tasks.length}
          {task.chainLabel ? ` · ${task.chainLabel}` : ''}
        </p>
        <button type="button" className="text-rotulo-sm text-accent hover:text-accent-hover" onClick={() => setShowTheory((v) => !v)}>
          {showTheory ? 'Esconder a teoria' : 'Ver a teoria'}
        </button>
      </div>
      <h2 className="text-lead text-primary">{task.title}</h2>
      {showTheory && <p className="text-corpo whitespace-pre-line text-primary">{task.theory}</p>}
      <FlagField label="Sua resposta" value="Resposta certa" placeholder="" correct />
      <VoiceFeedback voice={task.voice!} />
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={onNext}>{next ? 'Próxima tarefa' : 'Ir pro fechamento'}</Button>
        {next && (
          <p className="text-pequeno text-muted">
            {unit(room)} {next.number}: {next.title}
          </p>
        )}
      </div>
    </li>
  );
}

function FinalCard({ room, onRoom }: { room: RoomState; onRoom: (room: RoomState) => void }) {
  const recorder = useVoiceRecorder(async (audio) => onRoom(await roomsApi.submitFinalVoice(room.id, audio)));
  return (
    <section className="flex flex-col gap-3 border-2 border-accent bg-surface p-6 shadow-[4px_4px_0_0_var(--color-accent-shadow)]">
      <p className="text-rotulo-sm text-secondary">Pra fechar a sala · uns 3 min</p>
      <h2 className="text-lead text-primary">Como você corrigiria a {room.title}?</h2>
      <p className="text-corpo text-primary">{room.final.prompt}</p>
      <ul className="flex flex-col gap-2">
        {room.tasks.map((task) => (
          <li key={task.id} className="flex gap-6 text-corpo text-primary">
            <span className="w-14 shrink-0 text-rotulo-sm leading-7 text-project">{room.kind === 'Challenge' ? `Elo ${task.number}` : `T${task.number}`}</span>
            {task.title}
          </li>
        ))}
      </ul>
      <Recorder
        phase={recorder.phase}
        seconds={recorder.seconds}
        error={recorder.error}
        onStart={() => void recorder.start()}
        onStop={recorder.stop}
        hint="Mínimo 30 s, máximo 1 min 30. O que você mudaria em cada falha, e por quê."
      />
      <p className="text-pequeno text-muted">Depois: o resumo da sala, com a nota de cada tarefa.</p>
    </section>
  );
}

function SummaryView({ room, roomsLink }: { room: RoomState; roomsLink: string }) {
  const final = room.final.voice!;
  return (
    <>
      <FocadaLine size="devolutiva" tone="acerto" label={`Focada · Sala fechada · Nota ${final.score}`}>
        {final.improvementPoints || 'Você não só entrou: explicou cada passo e disse como fechar a porta.'}
      </FocadaLine>
      <ol className="flex flex-col gap-2">
        {room.tasks.map((task) => (
          <TaskRow key={task.id} room={room} task={task} prefix={room.kind === 'Challenge' ? `Elo ${task.number}` : `T${task.number}`} />
        ))}
        <li className="flex h-12 items-center gap-4 border-2 border-stroke bg-surface px-6">
          <span className="text-rotulo-sm text-secondary">Fim</span>
          <span className="min-w-0 flex-1 truncate text-corpo text-primary">Como eu corrigiria a {room.title}</span>
          <span className="text-rotulo-sm text-accent">Nota {final.score}</span>
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink to={roomsLink}>Voltar pras salas</ButtonLink>
        <Link to={roomsLink} className="text-pequeno text-muted hover:text-secondary">
          Veja o que abriu na lista de salas.
        </Link>
      </div>
    </>
  );
}

function SummarySide({ room }: { room: RoomState }) {
  const scores = room.tasks.map((t) => t.voice?.score ?? 0);
  const average = Math.round([...scores, room.final.voice!.score].reduce((a, b) => a + b, 0) / (scores.length + 1));
  const weakest = room.tasks.reduce((low, t) => ((t.voice?.score ?? 100) < (low.voice?.score ?? 100) ? t : low), room.tasks[0]);
  return (
    <Card eyebrow="Resumo da sala">
      <div className="flex gap-8">
        <span className="flex flex-col gap-1">
          <span className="text-titulo text-accent">{average}</span>
          <span className="text-rotulo-sm text-muted">nota média</span>
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-titulo text-primary">{roomMinutes(room)} min</span>
          <span className="text-rotulo-sm text-muted">na sala</span>
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-titulo text-primary">
            {room.tasks.length}/{room.tasks.length}
          </span>
          <span className="text-rotulo-sm text-muted">flags</span>
        </span>
      </div>
      {weakest?.voice && (
        <p className="text-pequeno text-secondary">
          A mais fraca foi a {unit(room)} {weakest.number} ({weakest.voice.score}): {weakest.voice.improvementPoints ?? weakest.title}
        </p>
      )}
    </Card>
  );
}
