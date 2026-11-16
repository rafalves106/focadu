import { BASE_URL, request } from './client';

// Fase 110: Salas práticas. Espelha backend/src/Focadu.Application/Rooms/Dtos.cs.

export type RoomKind = 'Week' | 'Tool' | 'Challenge';
export type RoomStatus = 'Locked' | 'Available' | 'InProgress' | 'Completed';
export type RoomTaskState = 'Locked' | 'Current' | 'AwaitingVoice' | 'Done';

export interface RoomSummary {
  id: string;
  slug: string;
  title: string;
  kind: RoomKind;
  weekNumber: number | null;
  difficulty: string;
  estimatedMinutes: number;
  summary: string;
  taskCount: number;
  tasksDone: number;
  status: RoomStatus;
  missingPrerequisites: string[];
  averageScore: number | null;
}

export interface RoomVoiceResult {
  score: number;
  transcript: string;
  improvementPoints: string | null;
  correctAnswer: string;
  at: string;
}

export interface RoomTask {
  id: string;
  number: number;
  title: string;
  chainLabel: string | null;
  state: RoomTaskState;
  theory: string | null;
  question: string | null;
  answerFormat: string;
  hints: string[];
  voicePrompt: string | null;
  flagSolvedAt: string | null;
  voice: RoomVoiceResult | null;
}

export interface RoomState {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  kind: RoomKind;
  weekNumber: number | null;
  difficulty: string;
  estimatedMinutes: number;
  summary: string;
  scenario: string;
  machineLabel: string;
  environmentFolder: string;
  locked: boolean;
  missingPrerequisites: string[];
  machineOn: boolean;
  startedAt: string | null;
  tasks: RoomTask[];
  final: { unlocked: boolean; prompt: string | null; voice: RoomVoiceResult | null };
}

/** Avaliação por IA do áudio: transcrição + nota (mesmo teto do resumo falado). */
const VOICE_TIMEOUT_MS = 120_000;

function voiceForm(audio: Blob) {
  const form = new FormData();
  form.append('audio', audio, 'recording.webm');
  return form;
}

export const roomsApi = {
  list: (courseId: string) => request<RoomSummary[]>(`/api/courses/${courseId}/rooms`),
  get: (roomId: string) => request<RoomState>(`/api/rooms/${roomId}`),
  setMachine: (roomId: string, on: boolean) =>
    request<RoomState>(`/api/rooms/${roomId}/machine`, { method: 'PUT', body: JSON.stringify({ on }) }),
  submitFlag: (roomId: string, taskId: string, answer: string) =>
    request<{ correct: boolean; room: RoomState }>(`/api/rooms/${roomId}/tasks/${taskId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),
  submitTaskVoice: (roomId: string, taskId: string, audio: Blob) =>
    request<RoomState>(`/api/rooms/${roomId}/tasks/${taskId}/voice`, { method: 'POST', body: voiceForm(audio), timeoutMs: VOICE_TIMEOUT_MS }),
  submitFinalVoice: (roomId: string, audio: Blob) =>
    request<RoomState>(`/api/rooms/${roomId}/final/voice`, { method: 'POST', body: voiceForm(audio), timeoutMs: VOICE_TIMEOUT_MS }),
  /** Baixa o zip do ambiente (compose, Dockerfiles, iniciar.sh) pela sessão do cookie e salva no computador. */
  downloadEnvironment: async (roomId: string, fileName: string) => {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/environment`, { credentials: 'include' });
    if (!res.ok) throw new Error('Não deu pra baixar a sala. Tente de novo.');
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  },
};
