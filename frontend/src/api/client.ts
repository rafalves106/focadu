import type {
  ApiErrorBody,
  CompleteDailyResult,
  CourseDetailDto,
  CourseSummaryDto,
  DailyStateDto,
  SubmitActivityResponseResult,
  WeeklyDetailDto,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5282';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
  startDaily: (dailyId: string) => request<DailyStateDto>(`/api/dailies/${dailyId}/start`, { method: 'POST' }),
  completeDaily: (dailyId: string) =>
    request<CompleteDailyResult>(`/api/dailies/${dailyId}/complete`, { method: 'POST' }),
  submitActivityResponse: (dailyId: string, activityId: string, body: SubmitActivityResponseBody) =>
    request<SubmitActivityResponseResult>(`/api/dailies/${dailyId}/activities/${activityId}/responses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
