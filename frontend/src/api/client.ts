import type {
  ApiErrorBody,
  CompleteDailyResult,
  CourseDetailDto,
  CourseSummaryDto,
  CuratedContentDto,
  DailyStateDto,
  SubmitActivityResponseResult,
  WeeklyDetailDto,
  WeeklyProjectDto,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5282';

// Fase 10: timeout padrao de 10s (sugerido no prompt) - alto o suficiente pra nao disparar em
// requisicoes normais, baixo o suficiente pra nao deixar a TimeoutError demorar pra aparecer.
// VoiceSummary e excecao: o endpoint de audio transcreve (Groq Whisper) e avalia (Groq chat
// completion) em sequencia no backend, que ja tem seu proprio timeout de 60s pra Groq (ver
// GroqContentEvaluationService/docs/ARQUITETURA.md) - o timeout do cliente aqui precisa ser maior
// que esse, senao a TimeoutError apareceria antes do backend ter chance de responder de verdade.
const DEFAULT_TIMEOUT_MS = 10_000;
const VOICE_SUMMARY_TIMEOUT_MS = 70_000;

/** Erro de Api com o mesmo { error, message } que Focadu.Api.ErrorHandling.ApiExceptionHandler sempre devolve. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  // FormData (upload de audio) nunca leva Content-Type manual - o navegador define o boundary
  // do multipart sozinho; forcar 'application/json' aqui quebraria o parsing no backend.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(init?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body: ApiErrorBody | null = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? 'erro_desconhecido', body?.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Qual campo e usado depende do tipo (e, pro Cloze, do AnswerMode) da atividade - ver
// SubmitActivityResponseUseCase.ResolveScore no backend. Nao ha mais campo Score: desde a Fase 4
// o backend calcula o Score de todo tipo de atividade, nunca aceita pronto do cliente.
export interface SubmitActivityResponseBody {
  selectedOptionId?: string;
  selectedRoleplayNodeId?: string;
  transcript?: string;
  justification?: string;
  aiFeedback?: string;
}

export const api = {
  getToday: () => request<DailyStateDto>('/api/today'),
  getCourses: () => request<CourseSummaryDto[]>('/api/courses'),
  getCourse: (courseId: string) => request<CourseDetailDto>(`/api/courses/${courseId}`),
  getWeekly: (weeklyId: string) => request<WeeklyDetailDto>(`/api/weeklies/${weeklyId}`),
  getDaily: (dailyId: string) => request<DailyStateDto>(`/api/dailies/${dailyId}`),
  getCuratedContent: (id: string) => request<CuratedContentDto>(`/api/curated-content/${id}`),
  startDaily: (dailyId: string) => request<DailyStateDto>(`/api/dailies/${dailyId}/start`, { method: 'POST' }),
  completeDaily: (dailyId: string) =>
    request<CompleteDailyResult>(`/api/dailies/${dailyId}/complete`, { method: 'POST' }),
  submitActivityResponse: (dailyId: string, activityId: string, body: SubmitActivityResponseBody) =>
    request<SubmitActivityResponseResult>(`/api/dailies/${dailyId}/activities/${activityId}/responses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // VoiceSummary (Fase 5): endpoint separado do texto porque o corpo e binario (multipart/
  // form-data) - o backend transcreve e avalia por IA, Score nunca vem do cliente.
  submitVoiceSummaryResponse: (dailyId: string, activityId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return request<SubmitActivityResponseResult>(
      `/api/dailies/${dailyId}/activities/${activityId}/responses/audio`,
      { method: 'POST', body: formData, timeoutMs: VOICE_SUMMARY_TIMEOUT_MS },
    );
  },
  // Autoria de conteudo curado (Fase 6) - unico tipo de conteudo com endpoint de escrita, ver
  // docs/ARQUITETURA.md. `type` so existe na criacao (nunca muda depois, ver CuratedContent.Update).
  createCuratedContent: (body: { weeklyId: string; type: string; title: string; externalUrl: string | null; bodyText: string | null }) =>
    request<CuratedContentDto>('/api/curated-content', { method: 'POST', body: JSON.stringify(body) }),
  updateCuratedContent: (id: string, body: { title: string; externalUrl: string | null; bodyText: string | null }) =>
    request<CuratedContentDto>(`/api/curated-content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Projeto semanal (Fase 7): unica escrita do aluno sobre WeeklyProject - Status vira Submitted no dominio (WeeklyProject.Submit).
  submitWeeklyProject: (weeklyId: string, submissionUrl: string) =>
    request<WeeklyProjectDto>(`/api/weeklies/${weeklyId}/project/submit`, {
      method: 'POST',
      body: JSON.stringify({ submissionUrl }),
    }),
};
