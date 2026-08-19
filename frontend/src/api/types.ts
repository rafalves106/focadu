// Espelha os DTOs de backend/src/Focadu.Application (System.Text.Json serializa em camelCase por
// padrao no ASP.NET Core, confirmado empiricamente contra a Api real). Enums do C# chegam como
// numero (a ordem dos valores importa - ver os enums correspondentes em Focadu.Domain.Enums).

export const ActivityType = { Quiz: 0, WordMatch: 1, Cloze: 2, Roleplay: 3 } as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const DailyAccessMode = { Start: 0, Resume: 1, Replay: 2, ReadOnly: 3 } as const;
export type DailyAccessMode = (typeof DailyAccessMode)[keyof typeof DailyAccessMode];

export type ActivityStatus = 0 | 1; // Pending, Completed
export type AnswerMode = 0 | 1; // MultipleChoice, FreeText
export type DailyStatus = 0 | 1 | 2 | 3; // Locked, Available, InProgress, Completed
export type CourseStatus = 0 | 1 | 2; // Draft, Active, Archived
export type CuratedContentType = 0 | 1 | 2; // Reading, Video, Diagram
export type WeeklyProjectStatus = 0 | 1 | 2; // Pending, Submitted, Evaluated
export type TerminalQuality = 0 | 1 | 2; // Ideal, Suboptimal, Poor

// IsCorrect vem nulo ate a atividade ter uma ActivityResponse - gabarito escondido antes de
// responder (ver Focadu.Application.Dailies.DailyStateMapper).
export interface QuizOptionDto {
  id: string;
  text: string;
  isCorrect: boolean | null;
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
  accessMode: DailyAccessMode;
  activities: DailyActivityDto[];
}

export interface SubmitActivityResponseResult {
  response: ActivityResponseDto;
  dailyReinforcementTriggered: boolean;
  reinforcementDailyId: string | null;
  weeklyReinforcementTriggered: boolean;
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
}

export interface WeeklyProjectDto {
  id: string;
  specText: string;
  status: WeeklyProjectStatus;
  submissionUrl: string | null;
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
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
