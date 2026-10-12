// Fase 94, Painel de gestao (rotas /api/admin, so admin). Espelha Focadu.Application/Admin/*Dtos.cs.

export interface AdminCountDto {
  table: string;
  count: number;
}

export interface AdminDayCell {
  week: number;
  day: number;
  completed: boolean;
}

export interface AdminCourseProgressDto {
  courseId: string;
  courseName: string;
  totalDays: number;
  completedDays: number;
  currentDay: number;
  enrolledAt: string;
  lastActivityAt: string | null;
  days: AdminDayCell[];
}

export interface AdminStudentDto {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  isAdmin: boolean;
  currentStreak: number;
  lastActivityAt: string | null;
  currentCourse: string | null;
  currentDay: number | null;
  courses: AdminCourseProgressDto[];
}

export interface CourseResetPreviewDto {
  userId: string;
  displayName: string;
  email: string;
  courseId: string;
  courseName: string;
  willDelete: AdminCountDto[];
}

export interface CourseResetResultDto {
  userId: string;
  courseId: string;
  deleted: AdminCountDto[];
}

export type InviteStatus = 'ativo' | 'esgotado' | 'vencido' | 'revogado';

export interface AdminInviteDto {
  code: string;
  note: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: InviteStatus;
  /** Relativo ("/login?convite=CODIGO") - o front completa com a propria origem. */
  link: string;
}

export interface AdminInvitesDto {
  maxUsesLimit: number;
  maxValidDays: number;
  defaultValidDays: number;
  invites: AdminInviteDto[];
}

export type CurationDayState = 'em_dia' | 'difere' | 'so_no_arquivo' | 'so_no_banco' | 'sem_curadoria';

export interface CurationDayDto {
  day: number;
  /** 0 = dia no banco que nem esta no curso.json. */
  week: number;
  state: CurationDayState;
  responses: number;
  studentsWithProgress: number;
}

export interface CurationCourseDto {
  slug: string | null;
  courseId: string | null;
  name: string;
  status: string | null;
  curatedDays: number;
  importedDays: number;
  staleDays: number;
  days: CurationDayDto[];
}

export interface ImportDayPreviewDto {
  day: number;
  status: 'Created' | 'Updated' | 'Unchanged' | 'NeedsConfirmation' | 'Rejected' | 'NoFile';
  detail: string;
  errors: string[];
}

export interface ImportPreviewDto {
  slug: string;
  courseName: string;
  canConfirm: boolean;
  days: ImportDayPreviewDto[];
  studentsLosingAnswers: number;
}

export interface ImportResultDto {
  slug: string;
  courseName: string;
  days: ImportDayPreviewDto[];
  dailiesAdded: number;
  dailiesReset: number;
}

export interface AdminStudentRefDto {
  id: string;
  displayName: string;
  email: string;
}

export interface StaleDaysPreviewDto {
  courseId: string;
  courseName: string;
  days: number[];
  affectedStudents: AdminStudentRefDto[];
  willDelete: AdminCountDto[];
}

export interface StaleDaysResultDto {
  courseId: string;
  courseName: string;
  days: number[];
  deleted: AdminCountDto[];
}

export interface AdminOverviewDto {
  students: number;
  activeStudents7d: number;
  activeStudents30d: number;
  signupsByInvite: number;
  activeInvites: number;
  completedDays30d: number;
  completionsByDay: { date: string; count: number }[];
  aiCostMonthUsd: number;
  aiMonthlyCapUsd: number | null;
  recentSignups: { id: string; displayName: string; email: string; createdAt: string; courses: string[] }[];
  curation: { name: string; curatedDays: number; importedDays: number; staleDays: number }[];
}

export type AiCallType =
  | 'Transcription'
  | 'ContentEvaluation'
  | 'Analogy'
  | 'StudyAssistant'
  | 'NotesReview'
  | 'CodeStepEvaluation'
  | 'CodeStepHint'
  | 'ProjectEvaluation'
  | 'LinkedInDraft';

export type AiPeriod = 'mes' | '7d' | '30d';

export interface AiUsageTotalsDto {
  estimatedCostUsd: number;
  costPerActiveStudentUsd: number | null;
  audioMinutes: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  failedCalls: number;
  activeStudents: number;
}

export interface AiUsageByTypeDto {
  callType: AiCallType;
  costUsd: number;
  sharePercent: number;
  calls: number;
}

export interface AiModelPriceDto {
  model: string;
  inputPerMillionUsd: number | null;
  outputPerMillionUsd: number | null;
  audioPerHourUsd: number | null;
  updatedAt: string;
  updatedBy: string;
  source: string | null;
}

export interface AiUsageOverviewDto {
  period: AiPeriod;
  fromUtc: string;
  toUtc: string;
  measuringSince: string;
  courseId: string | null;
  totals: AiUsageTotalsDto;
  byType: AiUsageByTypeDto[];
  monthlyCap: { capUsd: number | null; monthCostUsd: number };
  prices: AiModelPriceDto[];
  unpricedModels: string[];
}

export interface AiUsageStudentRowDto {
  userId: string;
  displayName: string;
  email: string;
  courses: string[];
  costUsd: number;
  calls: number;
  audioMinutes: number;
  tokens: number;
  lastCallAt: string | null;
}

export interface AiUsageStudentsDto {
  period: AiPeriod;
  fromUtc: string;
  toUtc: string;
  totalCostUsd: number;
  students: AiUsageStudentRowDto[];
}

export interface AiUsageStudentDetailDto {
  userId: string;
  displayName: string;
  email: string;
  totals: AiUsageTotalsDto;
  byType: AiUsageByTypeDto[];
  courses: {
    courseId: string;
    courseName: string;
    totalCostUsd: number;
    days: { day: number; costUsd: number; courseAverageUsd: number | null }[];
  }[];
}
