import type { RoomState, RoomSummary, RoomTask } from '../api/rooms';

// Fase 110: textos e contas das telas de Sala (Figma "Salas práticas (proposta)", página 68:2).

export function kindMeta(room: Pick<RoomSummary, 'kind' | 'weekNumber' | 'difficulty' | 'estimatedMinutes'>): string {
  const kind = room.kind === 'Week' ? `Semana ${room.weekNumber}` : room.kind === 'Tool' ? 'Ferramenta' : 'Desafio';
  return `${kind} · ${room.difficulty} · ${duration(room.estimatedMinutes)}`;
}

export function roomSubtitle(room: RoomState): string {
  const kind = room.kind === 'Week' ? `Sala da semana ${room.weekNumber}` : room.kind === 'Tool' ? 'Sala de ferramenta' : 'Sala-desafio';
  return `${kind} · ${room.difficulty} · ${duration(room.estimatedMinutes)}`;
}

/** Por que a sala está trancada: a sessão dela ainda não foi feita (Fase 111), a semana ainda não chegou ou faltam salas antes. */
export function lockedText(room: { opensWithWeek: number | null; opensWithSession?: number | null; missingPrerequisites: string[] }): string {
  if (room.opensWithSession != null) return `Abre quando você concluir a sessão do Dia ${room.opensWithSession}`;
  if (room.opensWithWeek !== null) return `Abre com a Semana ${room.opensWithWeek}`;
  return `Abre depois de ${room.missingPrerequisites.join(' e ')}`;
}

export function duration(minutes: number): string {
  return minutes >= 90 ? `uns ${Math.round(minutes / 60)} h` : `uns ${minutes} min`;
}

/** Nome da unidade: "Tarefa" ou, na sala-desafio, "Elo". */
export function unit(room: Pick<RoomState, 'kind'>): string {
  return room.kind === 'Challenge' ? 'Elo' : 'Tarefa';
}

/** Minutos gastos numa tarefa: do áudio anterior (ou do começo da sala) até o áudio dela. */
export function taskMinutes(room: RoomState, task: RoomTask): number | null {
  if (!task.voice) return null;
  const previous = room.tasks.find((t) => t.number === task.number - 1)?.voice?.at ?? room.startedAt;
  if (!previous) return null;
  return Math.max(1, Math.round((Date.parse(task.voice.at) - Date.parse(previous)) / 60000));
}

export function roomMinutes(room: RoomState): number {
  if (!room.startedAt) return 0;
  const last = room.final.voice?.at ?? room.tasks.map((t) => t.voice?.at).filter(Boolean).at(-1) ?? new Date().toISOString();
  return Math.max(1, Math.round((Date.parse(last!) - Date.parse(room.startedAt)) / 60000));
}

export function doneTasks(room: RoomState): RoomTask[] {
  return room.tasks.filter((t) => t.state === 'Done');
}

export function scoresText(room: RoomState): string {
  const scores = doneTasks(room).map((t) => t.voice!.score);
  if (scores.length === 0) return 'nenhuma nota ainda';
  if (scores.length <= 3) return `notas ${scores.slice(0, -1).join(', ')}${scores.length > 1 ? ' e ' : ''}${scores.at(-1)}`;
  return `notas de ${Math.min(...scores)} a ${Math.max(...scores)}`;
}

export function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Comandos pra subir a sala depois de baixar o zip. */
export function startCommands(room: Pick<RoomState, 'environmentFolder'>): string[] {
  return [`unzip ${room.environmentFolder}.zip`, `cd ${room.environmentFolder}`, './iniciar.sh'];
}
