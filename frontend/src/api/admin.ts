import { request } from './client';
import type {
  AdminInviteDto,
  AdminInvitesDto,
  AdminOverviewDto,
  AdminStudentDto,
  AiModelPriceDto,
  AiPeriod,
  AiUsageOverviewDto,
  AiUsageStudentDetailDto,
  AiUsageStudentsDto,
  CourseResetPreviewDto,
  CourseResetResultDto,
  CurationCourseDto,
  ImportPreviewDto,
  ImportResultDto,
  StaleDaysPreviewDto,
  StaleDaysResultDto,
} from './adminTypes';

// Importar roda o linter (Node) por dia - pode passar dos 10s padrao com varios dias marcados.
const IMPORT_TIMEOUT_MS = 90_000;

function aiQuery(period: AiPeriod, courseId: string | null) {
  const params = new URLSearchParams({ period });
  if (courseId) params.set('courseId', courseId);
  return params.toString();
}

/** Fase 94, Painel de gestao. Toda rota responde 403 `acesso_negado` pra quem nao e admin. */
export const adminApi = {
  getOverview: () => request<AdminOverviewDto>('/api/admin/overview'),

  getStudents: () => request<AdminStudentDto[]>('/api/admin/students'),
  previewCourseReset: (userId: string, courseId: string) =>
    request<CourseResetPreviewDto>(`/api/admin/students/${userId}/courses/${courseId}/reset`),
  resetCourse: (userId: string, courseId: string, confirmation: string) =>
    request<CourseResetResultDto>(`/api/admin/students/${userId}/courses/${courseId}/reset`, {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
      timeoutMs: 30_000,
    }),

  getInvites: () => request<AdminInvitesDto>('/api/admin/invites'),
  createInvite: (note: string, maxUses: number, validDays: number) =>
    request<AdminInviteDto>('/api/admin/invites', { method: 'POST', body: JSON.stringify({ note, maxUses, validDays }) }),
  revokeInvite: (code: string) => request<AdminInviteDto>(`/api/admin/invites/${encodeURIComponent(code)}/revoke`, { method: 'POST' }),

  getCuration: () => request<CurationCourseDto[]>('/api/admin/curation', { timeoutMs: 30_000 }),
  previewImport: (slug: string, days: number[]) =>
    request<ImportPreviewDto>(`/api/admin/curation/${encodeURIComponent(slug)}/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ days }),
      timeoutMs: IMPORT_TIMEOUT_MS,
    }),
  importDays: (slug: string, days: number[]) =>
    request<ImportResultDto>(`/api/admin/curation/${encodeURIComponent(slug)}/import`, {
      method: 'POST',
      body: JSON.stringify({ days }),
      timeoutMs: IMPORT_TIMEOUT_MS,
    }),
  previewStaleDays: (courseId: string) => request<StaleDaysPreviewDto>(`/api/admin/courses/${courseId}/stale-days`, { timeoutMs: 30_000 }),
  deleteStaleDays: (courseId: string, confirmation: string) =>
    request<StaleDaysResultDto>(`/api/admin/courses/${courseId}/stale-days/delete`, {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
      timeoutMs: 60_000,
    }),

  getAiUsage: (period: AiPeriod, courseId: string | null) => request<AiUsageOverviewDto>(`/api/admin/ai-usage?${aiQuery(period, courseId)}`),
  getAiUsageStudents: (period: AiPeriod, courseId: string | null) =>
    request<AiUsageStudentsDto>(`/api/admin/ai-usage/students?${aiQuery(period, courseId)}`),
  getAiUsageStudent: (userId: string) => request<AiUsageStudentDetailDto>(`/api/admin/ai-usage/students/${userId}`),
  setAiPrice: (body: {
    model: string;
    inputPerMillionUsd: number | null;
    outputPerMillionUsd: number | null;
    audioPerHourUsd: number | null;
    source: string | null;
  }) => request<AiModelPriceDto>('/api/admin/ai-usage/prices', { method: 'PUT', body: JSON.stringify(body) }),
  setAiCap: (monthlyCapUsd: number | null) =>
    request<{ monthlyCapUsd: number | null }>('/api/admin/ai-usage/cap', { method: 'PUT', body: JSON.stringify({ monthlyCapUsd }) }),
};
