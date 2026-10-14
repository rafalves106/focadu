import { request } from './client';
import type {
  AdminCohortDetailDto,
  AdminCohortsDto,
  AdminCourseCatalogDto,
  AdminSaveCourseBody,
  AdminUpdateStudentResultDto,
  AdminCourseVisibilityDto,
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

  // Fase 97: editar, redefinir senha, desativar/reativar e papel de admin.
  updateStudent: (userId: string, displayName: string, email: string) =>
    request<AdminUpdateStudentResultDto>(`/api/admin/students/${userId}`, { method: 'PUT', body: JSON.stringify({ displayName, email }) }),
  sendPasswordReset: (userId: string) => request<void>(`/api/admin/students/${userId}/password-reset`, { method: 'POST', timeoutMs: 30_000 }),
  disableStudent: (userId: string, confirmation: string) =>
    request<AdminStudentDto>(`/api/admin/students/${userId}/disable`, { method: 'POST', body: JSON.stringify({ confirmation }) }),
  enableStudent: (userId: string) => request<AdminStudentDto>(`/api/admin/students/${userId}/enable`, { method: 'POST' }),
  setStudentRole: (userId: string, admin: boolean) =>
    request<AdminStudentDto>(`/api/admin/students/${userId}/role`, { method: 'PUT', body: JSON.stringify({ admin }) }),

  // Fase 97: aba Cursos.
  getAdminCourses: () => request<AdminCourseCatalogDto[]>('/api/admin/courses', { timeoutMs: 30_000 }),
  createAdminCourse: (body: AdminSaveCourseBody & { name: string }) =>
    request<AdminCourseCatalogDto>('/api/admin/courses', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminCourse: (id: string, body: AdminSaveCourseBody) =>
    request<AdminCourseCatalogDto>(`/api/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  publishAdminCourse: (id: string) => request<AdminCourseCatalogDto>(`/api/admin/courses/${id}/publish`, { method: 'POST' }),
  unpublishAdminCourse: (id: string) => request<AdminCourseCatalogDto>(`/api/admin/courses/${id}/unpublish`, { method: 'POST' }),
  revertAdminCourseCatalog: (id: string) => request<AdminCourseCatalogDto>(`/api/admin/courses/${id}/revert-catalog`, { method: 'POST' }),

  getInvites: () => request<AdminInvitesDto>('/api/admin/invites'),
  createInvite: (note: string, maxUses: number, validDays: number, cohortId: string | null = null) =>
    request<AdminInviteDto>('/api/admin/invites', { method: 'POST', body: JSON.stringify({ note, maxUses, validDays, cohortId }) }),

  // Fase 96: Turmas.
  getCohorts: () => request<AdminCohortsDto>('/api/admin/cohorts'),
  getCohort: (id: string) => request<AdminCohortDetailDto>(`/api/admin/cohorts/${id}`),
  createCohort: (name: string, courseIds: string[]) =>
    request<AdminCohortDetailDto>('/api/admin/cohorts', { method: 'POST', body: JSON.stringify({ name, courseIds }), timeoutMs: 30_000 }),
  updateCohort: (id: string, name: string, courseIds: string[]) =>
    request<AdminCohortDetailDto>(`/api/admin/cohorts/${id}`, { method: 'PUT', body: JSON.stringify({ name, courseIds }), timeoutMs: 60_000 }),
  archiveCohort: (id: string) => request<AdminCohortDetailDto>(`/api/admin/cohorts/${id}/archive`, { method: 'POST' }),
  setCourseVisibility: (courseId: string, onlyForCohorts: boolean) =>
    request<AdminCourseVisibilityDto>(`/api/admin/courses/${courseId}/visibility`, { method: 'PUT', body: JSON.stringify({ onlyForCohorts }) }),
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
  setAiLimits: (limits: { dailyBudgetUsd: number | null; monthlyCapUsd: number | null; fallbackModel: string | null }) =>
    request<{ dailyBudgetUsd: number | null; monthlyCapUsd: number | null; fallbackModel: string | null }>('/api/admin/ai-usage/limits', {
      method: 'PUT',
      body: JSON.stringify(limits),
    }),
};
