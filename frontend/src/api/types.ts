// Espelha os DTOs de backend/src/Focadu.Application (System.Text.Json serializa em camelCase por
// padrao no ASP.NET Core, confirmado empiricamente contra a Api real). Enums do C# chegam como
// numero (a ordem dos valores importa - ver os enums correspondentes em Focadu.Domain.Enums).

export const ActivityType = {
  Quiz: 0,
  WordMatch: 1,
  Cloze: 2,
  Roleplay: 3,
  VoiceSummary: 4,
  Reading: 5,
  Video: 6,
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const DailyAccessMode = { Start: 0, Resume: 1, Replay: 2, ReadOnly: 3 } as const;
export type DailyAccessMode = (typeof DailyAccessMode)[keyof typeof DailyAccessMode];

export const ActivityStatus = { Pending: 0, Completed: 1 } as const;
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const AnswerMode = { MultipleChoice: 0, FreeText: 1 } as const;
export type AnswerMode = (typeof AnswerMode)[keyof typeof AnswerMode];

export const TerminalQuality = { Ideal: 0, Suboptimal: 1, Poor: 2 } as const;
export type TerminalQuality = (typeof TerminalQuality)[keyof typeof TerminalQuality];

export const DailyStatus = { Locked: 0, Available: 1, InProgress: 2, Completed: 3 } as const;
export type DailyStatus = (typeof DailyStatus)[keyof typeof DailyStatus];

export const CourseStatus = { Draft: 0, Active: 1, Archived: 2 } as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];
export type CuratedContentType = 0 | 1; // Reading, Video

// Nomes que a Api de autoria espera no campo `type` do request (case-insensitive, ver
// CreateCuratedContentUseCase.ParseType) - a mesma ordem do enum acima.
export const CURATED_CONTENT_TYPE_NAMES = ['Reading', 'Video'] as const;

export const WeeklyProjectStatus = { Pending: 0, Submitted: 1, Evaluated: 2 } as const;
export type WeeklyProjectStatus = (typeof WeeklyProjectStatus)[keyof typeof WeeklyProjectStatus];

export const PublicationPlatform = { LinkedIn: 1, GitHub: 2 } as const;
export type PublicationPlatform = (typeof PublicationPlatform)[keyof typeof PublicationPlatform];
// Nomes que a Api espera no campo `platform` do request de submissao (case-insensitive, ver
// Program.cs) - mesma ordem/convencao de CURATED_CONTENT_TYPE_NAMES.
export const PUBLICATION_PLATFORM_NAMES: Record<PublicationPlatform, string> = {
  [PublicationPlatform.LinkedIn]: 'LinkedIn',
  [PublicationPlatform.GitHub]: 'GitHub',
};

export const PublicationStatus = { NotRequired: 0, Pending: 1, Submitted: 2, Validated: 3, Failed: 4 } as const;
export type PublicationStatus = (typeof PublicationStatus)[keyof typeof PublicationStatus];

/** ActivityType -> rotulo de UI (usado pra "proxima etapa" no StartDashboard/CourseDetailPage, Fase 8). */
export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  [ActivityType.Quiz]: 'Quiz do dia',
  [ActivityType.WordMatch]: 'Associe os termos',
  [ActivityType.Cloze]: 'Complete a frase',
  [ActivityType.Roleplay]: 'Roleplay',
  [ActivityType.VoiceSummary]: 'Resumo falado',
  [ActivityType.Reading]: 'Leitura',
  [ActivityType.Video]: 'Vídeo',
};

// IsCorrect vem nulo ate a atividade ter uma ActivityResponse - gabarito escondido antes de
// responder (ver Focadu.Application.Dailies.DailyStateMapper).
export interface QuizOptionDto {
  id: string;
  text: string;
  isCorrect: boolean | null;
}

// WordMatch (Fase 23): termos e definicoes chegam em 2 listas separadas (nao aninhadas) - a
// correspondencia entre elas e o proprio gabarito, so revelada depois de responder (ver
// WordMatchTermDto.correctDefinitionId). Definicoes vem embaralhadas pelo backend a cada carga.
export interface WordMatchTermDto {
  id: string;
  text: string;
  correctDefinitionId: string | null;
}

export interface WordMatchDefinitionDto {
  id: string;
  text: string;
}

export interface RoleplayOptionDto {
  id: string;
  text: string;
  nextNodeId: string | null;
}

export interface RoleplayNodeDto {
  id: string;
  nodeKey: string;
  text: string;
  isTerminal: boolean;
  terminalQuality: TerminalQuality | null;
  options: RoleplayOptionDto[];
}

export interface ActivityResponseDto {
  id: string;
  activityId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  transcript: string | null;
  justification: string | null;
  aiFeedback: string | null;
  createdAt: string;
}

export interface DailyActivityDto {
  id: string;
  type: ActivityType;
  orderIndex: number;
  contentId: string | null;
  status: ActivityStatus;
  answerMode: AnswerMode;
  prompt: string | null;
  expectedAnswer: string | null;
  quizOptions: QuizOptionDto[];
  wordMatchTerms: WordMatchTermDto[];
  wordMatchDefinitions: WordMatchDefinitionDto[];
  roleplayNodes: RoleplayNodeDto[];
  responses: ActivityResponseDto[];
}

export interface DailyStateDto {
  id: string;
  weeklyId: string;
  dayNumber: number;
  date: string;
  status: DailyStatus;
  isReinforcement: boolean;
  penaltyPoints: number;
  /** Fase 15: sempre EvaluationPolicy.DailyPenaltyThreshold (backend) - pro PenaltyGauge nunca hardcodar o valor. */
  penaltyThreshold: number;
  accessMode: DailyAccessMode;
  activities: DailyActivityDto[];
}

export interface SubmitActivityResponseResult {
  response: ActivityResponseDto;
  dailyReinforcementTriggered: boolean;
  reinforcementDailyId: string | null;
  weeklyReinforcementTriggered: boolean;
}

// Reforco (diario/semanal), quando existe, ja foi disparado antes (durante alguma resposta
// anterior) - so aqui o cliente tem certeza de ter visto todas as atividades da Daily.
// gemsEarned/streakAfterCompletion (Fase 14): gemsEarned e 0 em replay/cap mensal atingido;
// streakAfterCompletion e sempre o streak "ao vivo", mesmo quando esta conclusao nao mexeu nele.
// wasReinforcementBonus (Fase 15): elegibilidade ao Bonus de Superacao, independente de quantas
// Gems o cap mensal efetivamente permitiu (so usar pra escolher a COPY quando gemsEarned > 0).
export interface CompleteDailyResult {
  daily: DailyStateDto;
  dailyReinforcementTriggered: boolean;
  reinforcementDailyId: string | null;
  weeklyReinforcementTriggered: boolean;
  weeklyReinforcementId: string | null;
  gemsEarned: number;
  streakAfterCompletion: number;
  wasReinforcementBonus: boolean;
}

/**
 * GET /api/users/me/gamification (Fase 14) - Gems acumuladas + streak atual/recorde do usuario
 * logado. streakJustBroken (Fase 10, retomada): true na 1a leitura apos currentStreak virar 0 por
 * inatividade e ainda nao reconhecida - dispara a tela "Streak Perdido" (ver
 * api.acknowledgeStreakBreak).
 */
export interface GamificationSummaryDto {
  totalGems: number;
  currentStreak: number;
  longestStreak: number;
  streakJustBroken: boolean;
}

export interface CourseSummaryDto {
  id: string;
  name: string;
  status: CourseStatus;
  monthlyCount: number;
}

export interface CourseProgressDto {
  totalDailies: number;
  completedDailies: number;
  reinforcementDailies: number;
  completionPercentage: number;
}

export interface WeeklyOverviewDto {
  id: string;
  number: number;
  title: string;
  theme: string | null;
  totalDailies: number;
  completedDailies: number;
  weakDailies: number;
  hasWeeklyReinforcement: boolean;
  /** Fase 8: status por dia, pra grids de navegacao (Detalhes do Curso) sem round-trip extra por semana. */
  days: DailyStatusSummaryDto[];
  /** Fase 11: true quando ESTA Weekly esta com o modulo completo mas sem publicacao Validated - a PROXIMA Weekly (Number+1) fica bloqueada por causa disso. */
  requiresPublicationToUnlock: boolean;
}

/** Resumo enxuto de uma Daily pra grids de navegacao (Fase 8) - versao mais leve de DailyOverviewDto. */
export interface DailyStatusSummaryDto {
  id: string;
  dayNumber: number;
  date: string;
  status: DailyStatus;
  isReinforcement: boolean;
  totalActivities: number;
  completedActivities: number;
}

export interface MonthlyOverviewDto {
  id: string;
  number: number;
  title: string;
  weeklies: WeeklyOverviewDto[];
}

export interface DailyReinforcementSummaryDto {
  dailyId: string;
  weeklyId: string;
  dayNumber: number;
  date: string;
  activityCount: number;
}

export interface WeeklyReinforcementSummaryDto {
  id: string;
  weeklyId: string;
  triggeredAt: string;
  weakDailyIds: string[];
}

export interface CourseDetailDto {
  id: string;
  name: string;
  status: CourseStatus;
  progress: CourseProgressDto;
  monthlies: MonthlyOverviewDto[];
  dailyReinforcements: DailyReinforcementSummaryDto[];
  weeklyReinforcements: WeeklyReinforcementSummaryDto[];
}

export interface DailyOverviewDto {
  id: string;
  dayNumber: number;
  date: string;
  status: DailyStatus;
  isReinforcement: boolean;
  penaltyPoints: number;
  isWeakDay: boolean;
  totalActivities: number;
  completedActivities: number;
  passedActivities: number;
}

export interface CuratedContentDto {
  id: string;
  type: CuratedContentType;
  title: string;
  externalUrl: string | null;
  bodyText: string | null;
  /**
   * So preenchido por GET /api/curated-content/{id} (Fase 21/22) - 1 analogia por seção "####" do
   * bodyText (mesma ordem), gerada por IA a partir dos interesses do usuário, quando a leitura e o
   * perfil permitem. [] quando não há personalização pra este conteúdo/usuário.
   */
  personalizedAnalogies?: string[];
}

export interface WeeklyProjectDto {
  id: string;
  specText: string;
  status: WeeklyProjectStatus;
  submissionUrl: string | null;
  /** Fase 16: nota (0-100) da avaliação, preenchida junto com Status Evaluated. Nulo até então. */
  score: number | null;
  feedback: string | null;
}

export interface WeeklyDetailDto {
  id: string;
  monthlyId: string;
  number: number;
  title: string;
  theme: string | null;
  dailies: DailyOverviewDto[];
  curatedContents: CuratedContentDto[];
  project: WeeklyProjectDto | null;
  reinforcements: WeeklyReinforcementSummaryDto[];
  /** Fase 11: true quando ESTA Weekly completou o modulo mas ainda falta publicacao Validated. */
  requiresPublicationToUnlock: boolean;
  /** Fase 15: true quando existe um reforco semanal (2+ dias fracos) ainda nao totalmente atendido - so indicador, nunca bloqueia nada. */
  hasPendingWeeklyReinforcement: boolean;
}

// Ranking (Fase 16) - Score de Estudo, metrica de QUALIDADE (diferente de Gems, que recompensa
// consistencia/conclusao). "weekly"/"monthly" sao por POSICAO no curriculo de cada matricula (a
// WeeklyTemplate/Monthly atual, nao calendario real) - ver GetCourseRankingUseCase no backend.
export type RankingScope = 'weekly' | 'monthly' | 'course';

// equippedNameColor (Fase 18): token estavel (Name do CosmeticItem equipado, ex: "Verde Neon"),
// nao um hex - o frontend mapeia token -> cor de verdade (ver lib/cosmeticStyle.ts), mesmo padrao
// de BadgeDto.code -> label/icone. Nulo quando o usuario nao tem nenhuma cor de nome equipada.
export interface RankingEntryDto {
  userId: string;
  displayName: string;
  score: number;
  position: number;
  equippedNameColor: string | null;
}

/** currentUserEntry e null so quando o usuario logado nao tem matricula neste curso. */
export interface RankingResultDto {
  topEntries: RankingEntryDto[];
  currentUserEntry: RankingEntryDto | null;
}

// Marketplace de Cosmeticos (Fase 17) - catalogo fixo via seed, sem autoria via Api ainda.
export const CosmeticSlot = { AvatarFrame: 0, NameColor: 1, ProfileBanner: 2 } as const;
export type CosmeticSlot = (typeof CosmeticSlot)[keyof typeof CosmeticSlot];

// Nomes que a Api de unequip espera no campo "slot" do request (case-insensitive, ver
// Program.cs) - mesma convencao de CURATED_CONTENT_TYPE_NAMES/PUBLICATION_PLATFORM_NAMES.
export const COSMETIC_SLOT_NAMES: Record<CosmeticSlot, string> = {
  [CosmeticSlot.AvatarFrame]: 'AvatarFrame',
  [CosmeticSlot.NameColor]: 'NameColor',
  [CosmeticSlot.ProfileBanner]: 'ProfileBanner',
};

export const CosmeticRarity = { Common: 0, Rare: 1, Epic: 2 } as const;
export type CosmeticRarity = (typeof CosmeticRarity)[keyof typeof CosmeticRarity];

/** Owned/Equipped ja resolvidos pro usuario logado - o frontend nunca precisa cruzar inventario/equipados manualmente. */
export interface CosmeticItemDto {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  priceGems: number;
  owned: boolean;
  equipped: boolean;
}

/** Devolvido por GET catalog e por toda acao de compra/equipar/desequipar - sempre o catalogo inteiro recalculado, nunca precisa de uma 2a chamada. */
export interface MarketplaceCatalogDto {
  totalGems: number;
  items: CosmeticItemDto[];
}

// Troféus/Badges (Fase 17) - todos calculados sob demanda no backend. `code` e estavel
// ("streak_7", "streak_30", "easy_weekly", "embaixador", "founder") - label/icone/descricao sao
// so apresentacao, o frontend decide (mesmo padrao de DailyStatus -> lib/statusBadge.ts).
export interface BadgeDto {
  code: string;
  achieved: boolean;
  progress: number;
}

export interface UserBadgesDto {
  badges: BadgeDto[];
}

export interface ReferralInfoDto {
  referralCode: string;
  confirmedReferralCount: number;
}

export interface ModulePublicationDto {
  weeklyId: string;
  status: PublicationStatus;
  platform: PublicationPlatform | null;
  submittedUrl: string | null;
  generatedDraft: string | null;
  validationError: string | null;
}

export interface GitHubRepoDto {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

// Autenticacao (Fase 12) - sessao via cookie httpOnly, nunca via token acessivel a partir do JS.
// profileCompletedAt (Fase 13): nulo ate a Entrevista de Perfil ser concluida - SplashPage/pos-
// login usam isso pra decidir se redirecionam pra /onboarding (ver lib/onboarding.ts).
// interests/additionalProfileNotes (Fase 18): o que ja foi salvo na Entrevista de Perfil - usado
// pela aba "Informações" do Perfil, sem precisar de um endpoint novo (UserDto ja e buscado em
// /auth/me pelo AuthContext).
export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  profileCompletedAt: string | null;
  interests: string[];
  additionalProfileNotes: string | null;
}

// referralCode (Fase 17): opcional - codigo invalido/de ninguem so e ignorado no backend, nunca bloqueia o registro.
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  referralCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Matricula (Fase 13) - Onboarding/Selecao de Curso.
export interface AvailableCourseDto {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
}

export interface EnrollmentDto {
  id: string;
  courseId: string;
  courseName: string;
  enrolledAt: string;
}

// Curriculo de um curso (Course -> Monthly -> WeeklyTemplate), sem exigir matricula (Fase 13b) -
// so `/admin/conteudo` usa isso, ver GetCourseCurriculumUseCase.
export interface WeeklyTemplateSummaryDto {
  id: string;
  number: number;
  title: string;
  theme: string | null;
}

export interface MonthlyCurriculumDto {
  id: string;
  number: number;
  title: string;
  weeklyTemplates: WeeklyTemplateSummaryDto[];
}

export interface CourseCurriculumDto {
  id: string;
  name: string;
  monthlies: MonthlyCurriculumDto[];
}

/** WeeklyTemplate (curriculo), sem exigir matricula (Fase 13b) - ver GetWeeklyTemplateDetailUseCase. */
export interface WeeklyTemplateDetailDto {
  id: string;
  monthlyId: string;
  number: number;
  title: string;
  theme: string | null;
  curatedContents: CuratedContentDto[];
}
