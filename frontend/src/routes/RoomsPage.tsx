import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { roomsApi, type RoomStatus, type RoomSummary } from '../api/rooms';
import { useApiResource } from '../api/useApiResource';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { DayNode } from '../components/trail/DayNode';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { FocadaLine } from '../components/ui/FocadaLine';
import { pickCourse } from '../lib/courseChoice';
import { kindMeta, lockedText } from '../lib/roomText';
import type { DayNodeState } from '../lib/weekPath';

const GROUPS: { kind: RoomSummary['kind']; title: string; prefix: string }[] = [
  { kind: 'Week', title: 'Salas da semana', prefix: 'S' },
  { kind: 'Tool', title: 'Salas de ferramenta', prefix: 'F' },
  { kind: 'Challenge', title: 'Sala-desafio', prefix: 'D' },
];

const NODE: Record<RoomStatus, DayNodeState> = { Locked: 'trancado', Available: 'disponivel', InProgress: 'atual', Completed: 'feito' };

/**
 * Lista de salas (Fase 110; Figma 70:63): grupos por tipo, a sala em andamento em destaque com o Primário
 * "Continuar", as livres com "Começar" e as trancadas com o que falta em âmbar. À direita, a Fala, o progresso e
 * o "Antes de entrar" (Docker, memória, computador).
 */
export function RoomsPage() {
  const [params] = useSearchParams();
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const course = pickCourse(courses, params.get('course'));
  const { data: rooms, error, loading, retry } = useApiResource(
    () => (course ? roomsApi.list(course.id) : Promise.resolve(null)),
    [course?.id],
  );

  if (!courses || (course && loading)) return <Centered text="Carregando salas..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course || !rooms) return <Centered text="Matricule-se num curso pra ver as salas." />;

  const current = rooms.find((r) => r.status === 'InProgress') ?? rooms.find((r) => r.status === 'Available');
  const completed = rooms.filter((r) => r.status === 'Completed').length;
  const tasks = rooms.reduce((sum, r) => sum + r.tasksDone, 0);
  const scores = rooms.map((r) => r.averageScore).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="tela-cheia flex gap-6 p-4 md:p-6 wide:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Breadcrumb parts={[course.name, 'Salas']} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-lead text-primary md:text-titulo">Salas práticas</h1>
          <p className="text-pequeno text-muted">
            {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'} · pouca leitura, muito Kali
          </p>
        </div>
        {rooms.length === 0 && <p className="text-corpo text-secondary">As salas deste curso ainda estão sendo preparadas.</p>}
        {/* Fase 112: salas das sessões agrupadas por semana, nó "S" + número da sessão de origem. */}
        {[...new Set(rooms.filter((r) => r.sessionNumber != null).map((r) => r.weekNumber))].map((week) => (
          <section key={`sessoes-${week}`} className="flex flex-col gap-3">
            <h2 className="text-rotulo-sm text-secondary">Salas das sessões{week != null ? ` · semana ${week}` : ''}</h2>
            <ul className="flex flex-col gap-3">
              {rooms
                .filter((r) => r.sessionNumber != null && r.weekNumber === week)
                .sort((x, y) => x.sessionNumber! - y.sessionNumber!)
                .map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    label={`S${room.sessionNumber}`}
                    number={room.sessionNumber!}
                    highlight={room.id === current?.id}
                  />
                ))}
            </ul>
          </section>
        ))}
        {GROUPS.map((group) => {
          const items = rooms.filter((r) => r.kind === group.kind && r.sessionNumber == null);
          if (items.length === 0) return null;
          return (
            <section key={group.kind} className="flex flex-col gap-3">
              <h2 className="text-rotulo-sm text-secondary">{group.title}</h2>
              <ul className="flex flex-col gap-3">
                {items.map((room, index) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    label={`${group.prefix}${group.kind === 'Week' ? room.weekNumber : index + 1}`}
                    number={index + 1}
                    highlight={room.id === current?.id}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <aside aria-label="Resumo das salas" className="hidden w-[400px] shrink-0 flex-col gap-6 xl:flex">
        <FocadaLine size="devolutiva">Sala é mão na massa: pouca leitura, muito Kali. Cada tarefa fecha com a sua voz.</FocadaLine>
        <Card eyebrow="Seu progresso">
          <div className="flex gap-8">
            <Stat value={`${completed}/${rooms.length}`} label="salas" />
            <Stat value={String(tasks)} label="tarefas" />
            <Stat value={average === null ? '—' : String(average)} label="nota média" accent />
          </div>
        </Card>
        <Card kind="suave" eyebrow="Antes de entrar">
          <ul className="flex flex-col gap-2">
            {['Docker Desktop instalado e aberto.', 'Uns 5 GB livres e 4 GB de memória pro Docker.', 'Um computador: a sala não roda no celular.'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-corpo text-secondary">
                <span className="size-2 shrink-0 bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-titulo ${accent ? 'text-accent' : 'text-primary'}`}>{value}</span>
      <span className="text-rotulo-sm text-muted">{label}</span>
    </div>
  );
}

function RoomRow({ room, label, number, highlight }: { room: RoomSummary; label: string; number: number; highlight: boolean }) {
  const locked = room.status === 'Locked';
  const to = `/salas/${room.id}`;
  const action = locked ? null : room.status === 'InProgress' ? `Continuar · Tarefa ${Math.min(room.tasksDone + 1, room.taskCount)}` : room.status === 'Completed' ? 'Rever' : 'Começar';
  return (
    <li
      className={`flex items-center gap-6 border-2 bg-surface px-6 py-2 ${
        highlight ? 'border-accent shadow-[4px_4px_0_0_var(--color-accent-shadow)]' : 'border-stroke'
      }`}
    >
      <span className="flex w-16 shrink-0 justify-center">
        <DayNode
          focusable={false}
          node={{ key: room.id, state: NODE[room.status], label, dayNumber: number, title: room.title, to: locked ? null : to }}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`text-lead ${locked ? 'text-muted' : 'text-primary'}`}>{room.title}</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-pequeno text-muted">
            {kindMeta(room)}
            {room.status === 'Available' ? ` · ${room.taskCount} tarefas` : ''}
          </p>
          {room.status === 'InProgress' && (
            <Chip tone="verde">
              {room.tasksDone} de {room.taskCount} tarefas
            </Chip>
          )}
          {room.status === 'Completed' && <Chip tone="verde">Concluída · nota {room.averageScore}</Chip>}
        </div>
        {locked && <p className="text-pequeno text-project">{lockedText(room)}</p>}
      </div>
      <div className="hidden w-60 shrink-0 justify-end md:flex">
        {action && (
          <ButtonLink to={to} kind={highlight ? 'primario' : 'secundario'}>
            {action}
          </ButtonLink>
        )}
      </div>
    </li>
  );
}
