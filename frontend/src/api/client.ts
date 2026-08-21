import {
  COSMETIC_SLOT_NAMES,
  PUBLICATION_PLATFORM_NAMES,
  type ApiErrorBody,
  type AvailableCourseDto,
  type CompleteDailyResult,
  type CosmeticSlot,
  type CourseCurriculumDto,
  type CourseDetailDto,
  type CourseSummaryDto,
  type CuratedContentDto,
  type DailyStateDto,
  type EnrollmentDto,
  type GamificationSummaryDto,
  type GitHubRepoDto,
  type LoginRequest,
  type MarketplaceCatalogDto,
  type ModulePublicationDto,
  type PublicationPlatform,
  type RankingResultDto,
  type RankingScope,
  type ReferralInfoDto,
  type RegisterRequest,
  type SubmitActivityResponseResult,
  type UserBadgesDto,
  type UserDto,
  type WeeklyDetailDto,
  type WeeklyProjectDto,
  type WeeklyTemplateDetailDto,
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
    // Fase 12: sessao vai por cookie httpOnly (nunca por header) - sem isso o navegador nunca
    // manda o cookie "focadu_auth" de volta pra Api, mesmo ja autenticado.
    credentials: 'include',
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
  // Ranking (Fase 16) - Score de Estudo, por Course.
  getCourseRanking: (courseId: string, scope: RankingScope) =>
    request<RankingResultDto>(`/api/courses/${courseId}/ranking?scope=${scope}`),
  // Curriculo sem exigir matricula (Fase 13b) - so `/admin/conteudo` usa estes dois.
  getCourseCurriculum: (courseId: string) => request<CourseCurriculumDto>(`/api/courses/${courseId}/curriculum`),
  getWeeklyTemplate: (id: string) => request<WeeklyTemplateDetailDto>(`/api/weekly-templates/${id}`),
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
  // weeklyTemplateId (Fase 13b, era weeklyId): CuratedContent virou curriculo, ver
  // CreateCuratedContentRequest no backend.
  createCuratedContent: (body: { weeklyTemplateId: string; type: string; title: string; externalUrl: string | null; bodyText: string | null }) =>
    request<CuratedContentDto>('/api/curated-content', { method: 'POST', body: JSON.stringify(body) }),
  updateCuratedContent: (id: string, body: { title: string; externalUrl: string | null; bodyText: string | null }) =>
    request<CuratedContentDto>(`/api/curated-content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Projeto semanal (Fase 7): unica escrita do aluno sobre WeeklyProject - Status vira Submitted no dominio (WeeklyProject.Submit).
  submitWeeklyProject: (weeklyId: string, submissionUrl: string) =>
    request<WeeklyProjectDto>(`/api/weeklies/${weeklyId}/project/submit`, {
      method: 'POST',
      body: JSON.stringify({ submissionUrl }),
    }),
  // Publicacao publica do modulo (Fase 11) - prova de aprendizado exigida ao completar uma Weekly.
  getPublicationStatus: (weeklyId: string) => request<ModulePublicationDto>(`/api/weeklies/${weeklyId}/publication/status`),
  generateLinkedInDraft: (weeklyId: string) =>
    request<ModulePublicationDto>(`/api/weeklies/${weeklyId}/publication/draft`, { method: 'POST' }),
  getGitHubRepositories: () => request<GitHubRepoDto[]>('/api/github/repositories'),
  commitToGitHub: (weeklyId: string, repoName: string, isNewRepo: boolean) =>
    request<ModulePublicationDto>(`/api/weeklies/${weeklyId}/publication/github-commit`, {
      method: 'POST',
      body: JSON.stringify({ repoName, isNewRepo }),
    }),
  submitPublication: (weeklyId: string, platform: PublicationPlatform, url: string) =>
    request<ModulePublicationDto>(`/api/weeklies/${weeklyId}/publication/submit`, {
      method: 'POST',
      body: JSON.stringify({ platform: PUBLICATION_PLATFORM_NAMES[platform], url }),
    }),
  // Autenticacao (Fase 12) - sessao via cookie httpOnly setado pela Api; nenhum destes devolve
  // um token pro cliente guardar, so o UserDto.
  register: (data: RegisterRequest) => request<UserDto>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginRequest) => request<UserDto>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<UserDto>('/api/auth/me'),
  // Onboarding (Fase 13b) - Entrevista de Perfil + Selecao de Curso.
  completeProfile: (interests: string[], additionalNotes: string | null) =>
    request<UserDto>('/api/users/me/profile', { method: 'PUT', body: JSON.stringify({ interests, additionalNotes }) }),
  getAvailableCourses: () => request<AvailableCourseDto[]>('/api/courses/available'),
  getMyEnrollments: () => request<EnrollmentDto[]>('/api/enrollments/me'),
  createEnrollment: (courseId: string) =>
    request<EnrollmentDto>('/api/enrollments', { method: 'POST', body: JSON.stringify({ courseId }) }),
  // Gamificacao (Fase 14) - Gems + Streak.
  getGamification: () => request<GamificationSummaryDto>('/api/users/me/gamification'),
  // Troféus/Badges + Indicação (Fase 17) - calculados sob demanda no backend.
  getUserBadges: () => request<UserBadgesDto>('/api/users/me/badges'),
  getReferralInfo: () => request<ReferralInfoDto>('/api/users/me/referral'),
  // Marketplace de Cosméticos (Fase 17) - toda ação (compra/equipar/desequipar) devolve o
  // catálogo inteiro recalculado, mesmo shape do GET.
  getMarketplaceCatalog: () => request<MarketplaceCatalogDto>('/api/marketplace/catalog'),
  purchaseCosmeticItem: (itemId: string) =>
    request<MarketplaceCatalogDto>('/api/marketplace/purchase', { method: 'POST', body: JSON.stringify({ itemId }) }),
  equipCosmetic: (itemId: string) =>
    request<MarketplaceCatalogDto>('/api/marketplace/equip', { method: 'POST', body: JSON.stringify({ itemId }) }),
  unequipCosmetic: (slot: CosmeticSlot) =>
    request<MarketplaceCatalogDto>('/api/marketplace/unequip', {
      method: 'POST',
      body: JSON.stringify({ slot: COSMETIC_SLOT_NAMES[slot] }),
    }),
};
