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
  // Fase 79: passo de codigo da ponte ("code comigo") - codigo + saida conferidos pela IA.
  CodeStep: 7,
  // Missao no terminal (dias normais do Linux): o proprio navegador confere a saida, sem IA e sem tentativa.
  TerminalMission: 8,
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// WeekPendingClosure (Fase 54): todas as Dailies da Weekly concluidas, falta o projeto (ou a publicacao) pra liberar a proxima - "/hoje" devolve a ultima Daily dessa Weekly com este modo.
// NeedsProjectLanguage (Fase 69): a Daily de hoje e a ponte pro projeto (uma versao por linguagem) e a linguagem do projeto ainda nao foi escolhida - vem sem atividades.
export const DailyAccessMode = { Start: 0, Resume: 1, Replay: 2, ReadOnly: 3, Blocked: 4, WeekPendingClosure: 5, NeedsProjectLanguage: 6 } as const;
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
export type CuratedContentType = 0 | 1 | 2; // Reading, Video, File (Fase 79: arquivo pra baixar, ex. ponte.pcap)

// Nomes que a Api de autoria espera no campo `type` do request (case-insensitive, ver
// CreateCuratedContentUseCase.ParseType) - a mesma ordem do enum acima.
export const CURATED_CONTENT_TYPE_NAMES = ['Reading', 'Video'] as const;

export const WeeklyProjectStatus = { Pending: 0, Submitted: 1, Evaluated: 2 } as const;
export type WeeklyProjectStatus = (typeof WeeklyProjectStatus)[keyof typeof WeeklyProjectStatus];

// Fase 59 (piloto Semana 1): linguagem do Projeto Semanal - lista fechada (curadoria mantem
// repositorio-modelo + referencias por linguagem, ver secret/rascunhos/linguagem-preferida-e-
// referencias-do-projeto.md). O mesmo nome serve de rotulo (Python/JavaScript nao precisam de
// traducao) e de valor que a Api espera no campo "language" dos requests.
export const ProjectLanguage = { Python: 1, JavaScript: 2 } as const;
export type ProjectLanguage = (typeof ProjectLanguage)[keyof typeof ProjectLanguage];
export const PROJECT_LANGUAGE_NAMES: Record<ProjectLanguage, string> = {
  [ProjectLanguage.Python]: 'Python',
  [ProjectLanguage.JavaScript]: 'JavaScript',
};

// Em que ponto da escolha de linguagem o aluno esta num Projeto Semanal (Fase 59) - ver
// WeeklyProjectDto abaixo. Semana sem variantes de linguagem (fora do piloto) e sempre None, igual
// sempre foi antes desta fase.
export const ProjectLanguageStep = { None: 0, NeedsPreference: 1, NeedsChoice: 2, Chosen: 3 } as const;
export type ProjectLanguageStep = (typeof ProjectLanguageStep)[keyof typeof ProjectLanguageStep];

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
  [ActivityType.CodeStep]: 'Passo de código',
  [ActivityType.TerminalMission]: 'Missão no terminal',
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
  /** Fase 79: so em CodeStep (passo de codigo da ponte) - nulo nos outros tipos. */
  codeStep?: CodeStepDto | null;
  /** So em TerminalMission: as missoes do bloco, conferidas no navegador. */
  missions?: TerminalMissionDto[] | null;
  /** So em TerminalMission (terminal v3): a cola "Comandos de hoje" - vazia em bloco curado antes dela. */
  commands?: TerminalCommandDto[] | null;
}

/** Um item da cola "Comandos de hoje": sintaxe generica (`chmod 640 arq`) e o que ela faz. */
export interface TerminalCommandDto {
  command: string;
  description: string;
}

/**
 * Missao do bloco `TerminalMission`. O laboratorio confere depois de cada comando digitado e TODA condicao
 * informada precisa valer: `command` (regex sobre o comando), `output` (regex sobre a saida dele) e
 * `probe` + `state` (roda `probe` em silencio e confere a saida dele com a regex `state` - o estado do sistema).
 * Nada aqui e segredo: o servidor nao confere nada.
 */
export interface TerminalMissionDto {
  title: string;
  prompt: string;
  /** Dicas fixas em dois niveis: 1 = o conceito, 2 = o comando. */
  hints: string[];
  /** O que reparar, mostrado quando a missao e cumprida. */
  note: string;
  check: { command: string | null; output: string | null; probe: string | null; state: string | null };
  /** Terminal v3: o porque da missao, numa frase (nulo em missao curada antes). */
  situation?: string | null;
  /** Terminal v3: o que o aluno vai ver quando der certo. */
  goal?: string | null;
  /** Terminal v3: os passos em palavras, so em missao de mais de um comando. */
  steps?: string[] | null;
}

/**
 * Passo de codigo da ponte (Fase 79, "code comigo"). `priorCode` e o script ate antes deste passo (o
 * que os passos anteriores entregaram: a tentativa aprovada ou a solucao) - nulo enquanto o passo
 * anterior nao acabou. `solution`/`expectedOutput` so vem depois que o passo acaba (`done`: passou ou
 * gastou `maxAttempts` tentativas). Nas respostas, `transcript` e o codigo enviado, `justification` a
 * saida colada e `aiFeedback` a fala da Focada.
 */
export interface CodeStepDto {
  priorCode: string | null;
  done: boolean;
  maxAttempts: number;
  solution: string | null;
  expectedOutput: string | null;
  /** Fase 86: este passo roda no laboratorio do dia (`DailyStateDto.lab`); falso/ausente = fluxo da Fase 79 (colar a saida). */
  labEnabled?: boolean;
  /** Fase 86: codigo com que o editor abre (nulo = vazio; nas pontes o editor abre com o script acumulado). */
  codeStarter?: string | null;
  /** Fase 86: dicas da Focada por passo (0 fora do laboratorio); nao contam como tentativa. */
  maxHints?: number;
  /** Fase 86: as dicas ja dadas neste passo, da 1a pra ultima. */
  hints?: CodeStepHintDto[] | null;
}

/** Fase 86: uma dica da Focada num passo com laboratorio - tres blocos curtos. */
export interface CodeStepHintDto {
  number: number;
  right: string;
  wrong: string;
  improve: string;
  createdAt: string;
}

export type LabRuntime = 'python' | 'javascript' | 'bash';

/**
 * Fase 86: laboratorio de codigo do dia (nulo = dia sem laboratorio). Quem roda o codigo e o navegador do
 * aluno (src/lab/); `fileContentIds` sao os File do "Material de hoje" que ja vem no ambiente.
 */
export interface LabConfigDto {
  runtime: LabRuntime;
  /** So no bash: 'basico' ou 'servidor'. */
  image: 'basico' | 'servidor' | null;
  fileContentIds: string[];
  packages: string[];
  services: string[];
  /** Arquivo que o aluno cria/edita (auditor.py, investigar.sh). */
  entry: string;
  /** Comando de exemplo que roda o `entry` (no Linux, o aluno digita). */
  command: string;
  timeoutSeconds: number;
  /** Bash: linhas de shell rodadas como root antes do terminal abrir (usuarios, grupos, arquivos). */
  setup: string[];
  /** Bash: usuario em que o terminal entra depois do `setup` (nulo = root). */
  user: string | null;
}

/** Fase 86: o que o laboratorio produziu ao rodar o passo - vai junto do envio e da dica. */
export interface LabRunPayload {
  output: string;
  exitCode: number;
  /** Linux: historico de comandos digitados, com a saida de cada um. */
  commands?: { command: string; output: string }[];
}

export interface CodeStepHintResponse {
  hint: CodeStepHintDto;
  hintsUsed: number;
  hintsLeft: number;
}

export interface DailyStateDto {
  id: string;
  weeklyId: string;
  dayNumber: number;
  date: string;
  status: DailyStatus;
  isReinforcement: boolean;
  penaltyPoints: number;
  /** Fase 15: sempre EvaluationPolicy.DailyPenaltyThreshold (backend) - pro PenaltyHeaderBadge nunca hardcodar o valor. */
  penaltyThreshold: number;
  accessMode: DailyAccessMode;
  activities: DailyActivityDto[];
  /** Fase 56: id da Daily de reforco ainda nao concluida da matricula - so vem preenchido em GET /api/today (null nos demais e quando nao ha reforco pendente). Alimenta o botao "Ir para a sessao de reforco" (`PendingReinforcementCard`). */
  pendingReinforcementDailyId: string | null;
  /** Fase 79: repositorio (GitHub ou Forgejo) do script da ponte "code comigo" - opcional, so depois de concluir. */
  codeRepositoryUrl?: string | null;
  /** Fase 86: laboratorio de codigo do dia - nulo/ausente = dia sem laboratorio. */
  lab?: LabConfigDto | null;
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
  /** Fase 69: ultimo dia (yyyy-mm-dd) da pausa da ofensiva que cobre hoje - projeto semanal aberto, sem Daily pra fazer. Nulo sem pausa. */
  streakPausedUntil: string | null;
  /** Fase 69: a folga movel (1 dia sem estudo a cada 7) esta livre hoje. */
  streakRestAvailable: boolean;
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
  /** Fase 11: true quando ESTA Weekly esta com o modulo completo mas sem publicacao Validated - trava as proximas Weeklies (o que a trilha usa pra trancar e `isLocked`, abaixo). */
  requiresPublicationToUnlock: boolean;
  /** Fase 55: true quando alguma Weekly ANTERIOR do mesmo curso ainda nao fechou (projeto nao avaliado / publicacao nao validada) - "se existe um projeto pendente, todas as semanas seguintes ficam bloqueadas". Calculado no servidor, a mesma regra do 409 ao iniciar uma Daily. */
  isLocked: boolean;
  /** Fase 65: status do Projeto Semanal desta semana (null se ainda nao existe) - estado do castelo no mapa da trilha. */
  projectStatus: WeeklyProjectStatus | null;
  /** Fase 83: semana sem Projeto Semanal (curso de pre-requisito) - o castelo e o fechamento da semana. */
  isPracticeOnly?: boolean;
  /** Fase 83: semana fechada (Dailies originais concluidas e, se houver, projeto avaliado). */
  isClosed?: boolean;
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
  /** Fase 65: titulo do material do dia (balao do ponto no mapa da trilha). */
  title: string | null;
  /** Fase 65: a proxima Daily da matricula (DailySequencing.FindNext) - onde a Focada fica no mapa. */
  isNext: boolean;
  /** Fase 65: Daily de reforco gerada a partir desta - o mapa mostra o selo no ponto deste dia. */
  reinforcementDailyId: string | null;
  /** Fase 65: concluida hoje (hora local) - fala "por hoje acabou" da Focada no mapa. */
  completedToday: boolean;
}

export interface MonthlyOverviewDto {
  id: string;
  number: number;
  title: string;
  weeklies: WeeklyOverviewDto[];
  /** Fase 45: certificacoes de mercado que este modulo (curadoria estatica) ja cobre/aproxima. */
  certifications: CertificationCoverageDto[];
}

/** Fase 45: cobertura curada (manual, nunca gerada por IA) de uma certificacao de mercado por modulo. */
export interface CertificationCoverageDto {
  certificationCode: string;
  certificationName: string;
  certifier: string;
  coveredDomains: string;
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
  /** Fase 38b: true quando esta e a Daily nao-reforco de menor DayNumber ainda nao concluida em TODA a matricula - a unica Locked/Available que pode ser iniciada agora. Date nao serve mais pra decidir isso (ver WeeklyDetailPage). */
  isNext: boolean;
  /** Titulo do material do dia (Leitura, ou Video como fallback) - null se o dia nao tiver nenhum dos dois. So usado por WeeklyDetailPage. */
  title: string | null;
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

/** Fase 59: link de referencia (biblioteca/documentacao) da linguagem escolhida - curadoria manual, cada um conferido na mão. */
export interface ProjectReferenceDto {
  id: string;
  /** Nulo = comum a todas as linguagens da semana (ex: uma RFC). */
  language: ProjectLanguage | null;
  title: string;
  url: string;
  documents: string;
  lastVerifiedAt: string | null;
}

export interface WeeklyProjectDto {
  id: string;
  /** Fase 59: vazio enquanto o projeto nao foi disponibilizado (languageStep NeedsPreference/NeedsChoice) - o texto so vem depois que o aluno escolhe a linguagem. */
  specText: string;
  status: WeeklyProjectStatus;
  /** Fase 38: true enquanto as Dailies originais da semana nao estiverem todas concluidas - Weekly.SubmitProject recusa o envio nesse estado. So faz sentido junto de Status Pending; uma vez Submitted/Evaluated, sempre false. */
  isLocked: boolean;
  submissionUrl: string | null;
  /** Fase 16: nota (0-100) da avaliação, preenchida junto com Status Evaluated. Nulo até então. */
  score: number | null;
  feedback: string | null;
  /** Fase 60: últimos 8 caracteres do token do Forgejo valendo - o valor inteiro só vem uma vez, em api.generateForgejoToken. Nulo até o aluno gerar o 1o. */
  forgejoTokenLastEight: string | null;
  /** Username do aluno no Forgejo - junto do token acima, é o que o `git clone` HTTP pede ao autenticar. */
  forgejoUsername: string | null;
  /** Fase 59 (piloto Semana 1): ver ProjectLanguageStep. */
  languageStep: ProjectLanguageStep;
  /** Fase 59: linguagem escolhida (definitiva). Nulo ate a escolha - e sempre nulo com languageStep None. */
  language: ProjectLanguage | null;
  /** Fase 59: todas as linguagens que a semana oferece. Vazio com languageStep None (semana fora do piloto). */
  supportedLanguages: ProjectLanguage[];
  /** Fase 59: so com languageStep NeedsChoice - as linguagens da semana que o aluno marcou no perfil, entre as quais ele escolhe agora. */
  choosableLanguages: ProjectLanguage[];
  /** Fase 59: so com languageStep Chosen - as referencias da linguagem escolhida, mais as comuns a todas. */
  references: ProjectReferenceDto[];
  /** Fase 64: falas do briefing da Focada, escritas pela curadoria. Vazio na semana sem briefing ou antes do projeto ser disponibilizado. */
  briefing: string[];
  /** Fase 64: falas de estado que esta semana sobrescreve (ver lib/focadaLines.ts pras chaves e as padrao). */
  stateLines: Partial<Record<FocadaStateKey, string>>;
}

/** Fase 64: estados do projeto com fala propria da Focada (espelha WeeklyTemplate.StateLineKeys no backend). */
export type FocadaStateKey = 'repositorio' | 'entregue' | 'avaliadoAlta' | 'avaliadoBaixa';

/** Fase 60: resposta de POST /api/users/me/forgejo-token - único momento em que o token inteiro aparece (a Focadu não guarda). */
export interface ForgejoTokenDto {
  forgejoUsername: string;
  accessToken: string;
  generatedAt: string;
}

export interface WeeklyDetailDto {
  id: string;
  monthlyId: string;
  /** Fase 29: resolvido no backend via Monthly.CourseId - o Caderninho de Anotacoes usa isso pra montar o link "CADERNINHO" e o autocomplete de tags a partir do contexto de uma Daily em andamento. */
  courseId: string;
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
  /** Fase 45: certificacoes de mercado do Monthly ao qual esta Weekly pertence. */
  moduleCertifications: CertificationCoverageDto[];
  /** Fase 81: linguagem dos passos de codigo nos cursos sem projeto ("Bash", "Python"); null no Web Security. */
  practiceLanguage?: string | null;
  /** Fase 83: semana sem Projeto Semanal - fecha no castelo da semana. */
  isPracticeOnly?: boolean;
  /** Fase 83: semana fechada (Dailies originais concluidas e, se houver, projeto avaliado). */
  isClosed?: boolean;
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
  /** Fase 72: o agente em pixel art da pessoa (podio/placar), nulo sem agente criado. */
  look: AgentLookDto | null;
}

/** currentUserEntry e null so quando o usuario logado nao tem matricula neste curso. */
export interface RankingResultDto {
  /** Fase 72: quem esta logo acima do usuario, mesmo fora do top 10 ("Proximo alvo"). */
  aheadEntry: RankingEntryDto | null;
  totalEntries: number;
  /** Fase 72: semana atual do usuario e se ela ja fechou (senao o recorte Semana avisa). */
  currentWeekNumber: number | null;
  currentWeekScored: boolean;
  topEntries: RankingEntryDto[];
  currentUserEntry: RankingEntryDto | null;
}

// Squad (Fase 24) - grupo com 1 dono (ownerUserId) + membros. coLeaderUserId (Fase 24b) e
// opcional, promovido pelo Owner - herda a lideranca se o Owner sair (senao, o membro mais
// antigo). joinCode e gerado na 1a vez que alguem pede o ranking do proprio squad (lazy, ver
// GetSquadRankingUseCase).
export interface SquadDto {
  id: string;
  name: string;
  ownerUserId: string;
  coLeaderUserId: string | null;
  createdAt: string;
}

/**
 * totalGems/averageGems sao sempre o saldo TOTAL de cada membro (Gems nao tem recorte semana/mes
 * no dominio, diferente de Score) - so totalScore/averageScore respeitam `scope`. currentUserEntry
 * nunca e null aqui (diferente de RankingResultDto): se a chamada teve sucesso, o usuario logado
 * necessariamente e membro deste squad. `members` e so a pagina pedida (squad nao tem cap de
 * tamanho, Fase 24c) - `page`/`pageSize`/`totalMembers` describem o resto. coLeaderDisplayName vem
 * resolvido contra o squad inteiro (pode nao estar em `members` se ele nao esta na pagina atual).
 */
export interface SquadRankingResultDto {
  squadId: string;
  squadName: string;
  joinCode: string;
  ownerUserId: string;
  coLeaderUserId: string | null;
  coLeaderDisplayName: string | null;
  members: RankingEntryDto[];
  currentUserEntry: RankingEntryDto | null;
  totalScore: number;
  averageScore: number;
  totalGems: number;
  averageGems: number;
  page: number;
  pageSize: number;
  totalMembers: number;
}

/** Fase 72: agente em pixel art de um membro do squad - pele e o Code da peca por camada. */
export interface AgentLookDto {
  skinTone: number;
  top: string | null;
  bottom: string | null;
  hair: string | null;
  shoes: string | null;
}

export interface SquadMemberDto {
  userId: string;
  displayName: string;
  /** Nulo enquanto o membro nao criou o agente. */
  look: AgentLookDto | null;
  studiedToday: boolean;
  lastStudiedOn: string | null;
  joinedAt: string;
}

/** Meta da semana do squad (Fase 72): Dailies somadas de segunda a domingo; recompensa ainda nao definida. */
export interface SquadWeeklyGoalDto {
  completed: number;
  target: number;
  studiedToday: number;
  weekStart: string;
}

export type SquadActivityType = 'daily' | 'reinforcement' | 'project' | 'purchase' | 'agent' | 'joined';

/**
 * Atividade do feed do QG (Fase 72) - derivada no backend, nao persistida. `key` identifica a atividade
 * pro GG. `score` nulo quando o autor esconde as notas (ou no reforco).
 */
export interface SquadActivityDto {
  key: string;
  type: SquadActivityType;
  userId: string;
  displayName: string;
  occurredAt: string;
  dayNumber: number | null;
  weekNumber: number | null;
  score: number | null;
  itemName: string | null;
  itemRarity: CosmeticRarity | null;
  cheers: number;
  cheeredByMe: boolean;
}

/**
 * Pedido pra entrar num squad (Fase 77) visto por quem pediu: "pending" (aguardando o lider/colider,
 * vence em `expiresAt`) ou "rejected" (recusado - nao pode pedir de novo pra este squad).
 */
/** Revisao por IA das notas de um dia (Fase 78). `upToDate` falso = as notas mudaram depois (libera "Revisar de novo"). */
export interface NotesReviewDto {
  dailyId: string;
  strengths: string;
  missing: string;
  materialCheck: string;
  noteCount: number;
  createdAt: string;
  upToDate: boolean;
}

export interface NotesReviewsDto {
  reviews: NotesReviewDto[];
  remainingToday: number;
  dailyLimit: number;
}

export interface SquadJoinRequestDto {
  id: string;
  squadId: string;
  squadName: string;
  status: 'pending' | 'rejected';
  createdAt: string;
  expiresAt: string;
}

export type SquadJoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'rejectionUndone';

/** Um pedido na aba Notificacoes do QG (so lider e colider). `decidedByName` nulo quando foi voce (`decidedByMe`). */
export interface SquadJoinRequestEntryDto {
  id: string;
  userId: string;
  displayName: string;
  look: AgentLookDto | null;
  status: SquadJoinRequestStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
  decidedByMe: boolean;
}

export interface SquadJoinRequestsDto {
  pending: SquadJoinRequestEntryDto[];
  decided: SquadJoinRequestEntryDto[];
}

export interface SquadHqDto {
  squadId: string;
  name: string;
  joinCode: string;
  ownerUserId: string;
  coLeaderUserId: string | null;
  createdAt: string;
  members: SquadMemberDto[];
  weeklyGoal: SquadWeeklyGoalDto;
  feed: SquadActivityDto[];
}

export interface SquadCheerResultDto {
  activityKey: string;
  cheers: number;
  cheeredByMe: boolean;
}

/** Fase 72: status de um dia no cartao "Últimos 14 dias" do Perfil. */
export type StudyDayStatus = 'studied' | 'rest' | 'paused' | 'missed' | 'today' | 'before';

export interface StudyCalendarDto {
  days: { date: string; status: StudyDayStatus }[];
  lastSession: { dayNumber: number; isReinforcement: boolean; completedAt: string; score: number | null } | null;
}

// Marketplace de Cosmeticos (Fase 17) - catalogo fixo via seed, sem autoria via Api ainda.
// Fase 71: Top/Bottom/Hair/Shoes sao as camadas do agente em pixel art (mesmos numeros do enum C#).
export const CosmeticSlot = { AvatarFrame: 0, NameColor: 1, ProfileBanner: 2, Top: 3, Bottom: 4, Hair: 5, Shoes: 6 } as const;
export type CosmeticSlot = (typeof CosmeticSlot)[keyof typeof CosmeticSlot];

// Nomes que a Api de unequip espera no campo "slot" do request (case-insensitive, ver
// Program.cs) - mesma convencao de CURATED_CONTENT_TYPE_NAMES/PUBLICATION_PLATFORM_NAMES.
export const COSMETIC_SLOT_NAMES: Record<CosmeticSlot, string> = {
  [CosmeticSlot.AvatarFrame]: 'AvatarFrame',
  [CosmeticSlot.NameColor]: 'NameColor',
  [CosmeticSlot.ProfileBanner]: 'ProfileBanner',
  [CosmeticSlot.Top]: 'Top',
  [CosmeticSlot.Bottom]: 'Bottom',
  [CosmeticSlot.Hair]: 'Hair',
  [CosmeticSlot.Shoes]: 'Shoes',
};

export const CosmeticRarity = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 } as const;
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
  /** Fase 71: chave do sprite em pixel art ("parte-de-cima/moletom") - nulo nos itens da Fase 17, ainda sem arte. */
  code: string | null;
  /** Fase 71: peca do kit basico, dada na criacao do agente - nunca vendida. */
  isStarter: boolean;
}

/** Agente em pixel art (Fase 71): tom de pele de 1 a 5; as pecas sao os itens com `equipped`. */
export interface AgentDto {
  skinTone: number;
}

/**
 * Devolvido por GET catalog e por toda acao de compra/equipar/desequipar/agente - sempre o catalogo
 * inteiro recalculado, nunca precisa de uma 2a chamada. Fase 71: `agent` nulo = agente ainda nao
 * criado; `showcaseItemIds` = vitrine da semana (ate 6, na ordem do sorteio); `showcaseRenewsOn` =
 * a proxima segunda (yyyy-MM-dd), quando a vitrine troca.
 */
export interface MarketplaceCatalogDto {
  totalGems: number;
  items: CosmeticItemDto[];
  agent: AgentDto | null;
  showcaseItemIds: string[];
  showcaseRenewsOn: string;
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
  /** Fase 59: linguagens que o aluno topa usar nos Projetos Semanais, marcadas na Entrevista de Perfil. Vazio ate ele marcar. */
  preferredLanguages: ProjectLanguage[];
  /** Fase 72: o "desde set/2026" do Perfil. */
  createdAt: string;
  /** Fase 72: Configuracoes > "nao mostrar minhas notas no feed do squad". */
  hideScoresInSquadFeed: boolean;
  /** Fase 75: chaves do guia das telas ja vistas ("tour:app", "tela:loja"...). */
  seenGuides: string[];
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

// Redefinicao de senha (Fase 41) - forgotPassword sempre devolve 200 (mesmo pra email nao
// cadastrado, ver RequestPasswordResetUseCase no backend).
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Matricula (Fase 13) - Onboarding/Selecao de Curso.
/** Fase 84: situacao do aluno num curso recomendado (espelha RecommendedCourseStatus do backend). */
export const RecommendedCourseStatus = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
} as const;
export type RecommendedCourseStatus = (typeof RecommendedCourseStatus)[keyof typeof RecommendedCourseStatus];

export interface RecommendedCourseDto {
  id: string;
  name: string;
  estimatedDuration: string;
  status: RecommendedCourseStatus;
}

export interface AvailableCourseDto {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  /** Fase 84: o que ajuda saber antes (vazio = comeca do zero). */
  requirements: string[];
  /** Fase 84: cursos que a Focadu recomenda antes deste - so recomendacao, os cursos sao livres. */
  recommendedBefore: RecommendedCourseDto[];
  /** Fase 84: cursos que recomendam este antes ("Prepara pro Web Security"). */
  preparesFor: string[];
  preparesText: string | null;
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

/**
 * GET /api/system/ai-status (Fase 28) - status de cada provedor de IA externo (hoje so Groq, ver
 * GroqHealthCheckService). `configured=false` (chave ausente) implica `available=false` sem sequer
 * o backend ter tentado a chamada de teste. Alimenta o robozinho de status da IA no GlobalNav - ver AiStatusMenu.tsx.
 */
export interface AiProviderStatusDto {
  provider: string;
  configured: boolean;
  available: boolean;
  errorMessage: string | null;
  checkedAt: string;
}

/**
 * Caderninho de Anotacoes (Fase 29). weekNumber/dayNumber/dailyDate vem do backend (Note nunca
 * duplica isso - so guarda dailyId) - resolvidos pelo caso de uso, pra UI mostrar o vinculo
 * "Semana X, Dia Y" sem precisar de uma 2a chamada.
 */
export interface NoteDto {
  id: string;
  /** Fase 63: nota de Daily OU de Projeto Semanal - exatamente um dos dois vem preenchido. */
  dailyId: string | null;
  weeklyProjectId: string | null;
  weekNumber: number;
  /** Nulo em nota de projeto (Fase 63). */
  dayNumber: number | null;
  /** Data da Daily; em nota de projeto, o dia em que a nota foi criada. */
  dailyDate: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListNotesFilter {
  from?: string;
  to?: string;
  q?: string;
  tag?: string;
  /** Fase 57: so as notas dessa sessao (Daily) - e, se ela for um reforco, as do dia base dele (ver NoteDailyScope no backend). Preferir a `from`/`to`: a Date de uma Daily de reforco e o dia em que foi gerada, nao o dia base. */
  dailyId?: string;
}

/** Suporte Rápido de IA (Fase 32) - POST /api/study-assistant/ask. So o texto de resposta, sem Score/estrutura (nao e avaliacao). */
export interface StudyAssistantAnswerDto {
  answer: string;
}
