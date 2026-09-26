/**
 * API falsa pra desenhar a sessao diaria sem tocar em producao (Fase 68). So roda com
 * `npm run dev:mock` (vite.mock.config.ts) - nunca entra no build.
 *
 * Monta uma Daily EM ANDAMENTO com o conteudo curado real do Dia 1 (secret/curadoria), com estado em
 * memoria: responder, errar, voltar e concluir funcionam como no backend (versao simplificada - sem IA,
 * o Resumo Falado sempre volta com a mesma nota). Reiniciar/pular pra uma etapa ou estado:
 *   /__mock/reset?at=Quiz   (Reading, VoiceSummary, Video, Quiz, Cloze, WordMatch, Roleplay, done)
 *   /__mock/reset?at=Cloze&penalty=2   (comeca com 2 erros no conta-giros)
 *   /__mock/reset?at=bloqueado[&reforco=1]   (sessao de hoje ja feita; com reforco pendente)
 *   /__mock/reset?at=semana&reforco=1         (semana esperando o castelo)
 *   /__mock/reset?at=reforco                  (sessao de reforco, 3 etapas)
 *   /__mock/reset?projeto=pendente|avaliado   (tela do Projeto Semanal)
 *   /__mock/reset?at=ponte                    (Fase 69: a Daily de hoje e a ponte, falta escolher a linguagem)
 *   /__mock/reset?at=Quiz&pausa=1             (Fase 69: streak pausado - projeto da semana aberto)
 *   /__mock/loja?agente=0|1&gemas=60          (Fase 71: loja e agente, ver shopMock.ts)
 *   /__mock/squad?as=membro|lider|nenhum      (Fase 72: QG do Squad em /squad; Perfil em /perfil)
 *   /__mock/semana?estado=andamento|publicacao|trancada   (Fase 74: visao da Semana 2; trancada abre a 3)
 *   /__mock/caderninho                        (Fase 74: Caderninho com notas de exemplo)
 *   /__mock/sair                              (Fase 74: sem sessao - abre o /login; entrar/criar conta loga de novo)
 *   /__mock/onboarding                        (Fase 74: perfil sem entrevista - abre /onboarding)
 * Erros: /start?course=erro-500 | erro-offline | erro-lento (timeout do cliente, ~10s).
 * Ids fixos (MOCK_IDS) pra os links continuarem valendo depois de reiniciar o Vite.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { handleShop, resetShop } from './shopMock';

const TYPE = { Quiz: 0, WordMatch: 1, Cloze: 2, Roleplay: 3, VoiceSummary: 4, Reading: 5, Video: 6 } as const;
type TypeName = keyof typeof TYPE;
const PASSING = 80;
const PENALTY_THRESHOLD = 3;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

interface Curated {
  dayNumber: number;
  curatedContents: { ref: string; type: 'Reading' | 'Video'; title: string; externalUrl: string | null; bodyText: string | null }[];
  activities: Json[];
}

export const MOCK_IDS = {
  user: '00000000-0000-4000-8000-000000000001',
  course: '00000000-0000-4000-8000-000000000002',
  monthly: '00000000-0000-4000-8000-000000000003',
  weekly: '00000000-0000-4000-8000-000000000004',
  daily: '00000000-0000-4000-8000-000000000005',
  reinforcement: '00000000-0000-4000-8000-000000000006',
  project: '00000000-0000-4000-8000-000000000007',
};
const ids = MOCK_IDS;

// Squad (Fases 70/72): squad do aluno do mock - `/__mock/squad?as=membro|lider|nenhum` troca e abre o QG.
type SquadRole = 'membro' | 'lider' | 'nenhum';
let squadRole: SquadRole = 'membro';
let squadCoLeader: string | null = 'u-marina';
const SQUAD_MEMBERS = [
  { userId: 'u-marina', displayName: 'Marina', score: 96.2 },
  { userId: 'u-diego', displayName: 'Diego', score: 91.0 },
  { userId: MOCK_IDS.user, displayName: 'Falves (mock)', score: 87.4 },
  { userId: 'u-bia', displayName: 'Bia', score: 74.8 },
  { userId: 'u-caio', displayName: 'Caio', score: 41.5 },
  { userId: 'u-lu', displayName: 'Lu', score: 21.7 },
];
let squadMembers = [...SQUAD_MEMBERS];

function squadRankingDto() {
  const members = squadMembers.map((m, i) => ({ ...m, position: i + 1, equippedNameColor: null }));
  const total = members.reduce((sum, m) => sum + m.score, 0);
  const owner = squadRole === 'lider' ? ids.user : 'u-diego';
  const coLeader = members.find((m) => m.userId === squadCoLeader) ?? null;
  return {
    squadId: 'squad-1',
    squadName: 'Os Firewalls',
    joinCode: 'X9K2P7QD',
    ownerUserId: owner,
    coLeaderUserId: coLeader?.userId ?? null,
    coLeaderDisplayName: coLeader?.displayName ?? null,
    members,
    currentUserEntry: members.find((m) => m.userId === ids.user) ?? null,
    totalScore: total,
    averageScore: total / members.length,
    totalGems: 1240,
    averageGems: 1240 / members.length,
    page: 1,
    pageSize: 20,
    totalMembers: members.length,
  };
}

// QG do Squad (Fase 72): escalacao com os agentes, meta da semana e feed com GGs em memoria.
let hideScores = false;
const cheers = new Map<string, { count: number; mine: boolean }>();
const LOOKS: Record<string, [number, string, string, string | null, string]> = {
  'u-marina': [4, 'parte-de-cima/camiseta', 'parte-de-baixo/saia', 'cabelo/black-power', 'tenis/cano-alto'],
  'u-diego': [2, 'parte-de-cima/jaqueta', 'parte-de-baixo/jogger', 'cabelo/bone', 'tenis/bota'],
  [MOCK_IDS.user]: [3, 'parte-de-cima/moletom', 'parte-de-baixo/calca', 'cabelo/curto', 'tenis/tenis'],
  'u-bia': [1, 'parte-de-cima/camisa-social', 'parte-de-baixo/calca', 'cabelo/longo', 'tenis/preto'],
  'u-caio': [5, 'parte-de-cima/moletom', 'parte-de-baixo/bermuda', 'cabelo/capacete', 'tenis/tenis'],
  'u-lu': [2, 'parte-de-cima/camiseta', 'parte-de-baixo/jogger', 'cabelo/curto', 'tenis/preto'],
};
const STUDIED_TODAY = new Set(['u-marina', 'u-diego', 'u-bia', 'u-caio']);

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function localIso(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function squadHqDto() {
  const ranking = squadRankingDto();
  const members = squadMembers.map((m, i) => {
    const [skinTone, top, bottom, hair, shoes] = LOOKS[m.userId];
    return {
      userId: m.userId,
      displayName: m.displayName,
      look: { skinTone, top, bottom, hair, shoes },
      studiedToday: STUDIED_TODAY.has(m.userId),
      lastStudiedOn: STUDIED_TODAY.has(m.userId) ? localIso(0) : localIso(m.userId === 'u-lu' ? 3 : 1),
      joinedAt: new Date(Date.now() - (40 - i) * 86_400_000).toISOString(),
    };
  });
  members.sort((a, b) => (a.userId === ranking.ownerUserId ? -1 : b.userId === ranking.ownerUserId ? 1 : a.userId === ranking.coLeaderUserId ? -1 : b.userId === ranking.coLeaderUserId ? 1 : 0));
  const act = (type: string, userId: string, minutesAgo: number, extra: Json = {}) => {
    const key = `${type}:${userId}:${minutesAgo}`;
    const c = cheers.get(key) ?? { count: (minutesAgo % 5) + 1, mine: false };
    if (!cheers.has(key)) cheers.set(key, c);
    const name = squadMembers.find((m) => m.userId === userId)?.displayName ?? '?';
    return { key, type, userId, displayName: name, occurredAt: ago(minutesAgo), dayNumber: null, weekNumber: null, score: null, itemName: null, itemRarity: null, cheers: c.count, cheeredByMe: c.mine, ...extra };
  };
  const feed = [
    act('daily', 'u-marina', 8, { dayNumber: 12, score: 94 }),
    act('project', 'u-diego', 62, { weekNumber: 1, score: 92 }),
    act('reinforcement', 'u-caio', 190, { dayNumber: 9 }),
    act('purchase', 'u-bia', 60 * 26, { itemName: 'Camisa social + gravata', itemRarity: 1 }),
    act('daily', MOCK_IDS.user, 60 * 27, { dayNumber: 10, score: 88 }),
    act('joined', 'u-lu', 60 * 30),
    act('agent', 'u-lu', 60 * 30 - 5),
    act('daily', 'u-bia', 60 * 50, { dayNumber: 11, score: null }),
  ].filter((a) => squadMembers.some((m) => m.userId === a.userId));
  const studiedToday = members.filter((m) => m.studiedToday).length;
  return {
    squadId: 'squad-1',
    name: ranking.squadName,
    joinCode: ranking.joinCode,
    ownerUserId: ranking.ownerUserId,
    coLeaderUserId: ranking.coLeaderUserId,
    createdAt: '2026-08-12T12:00:00Z',
    members,
    weeklyGoal: { completed: 21, target: members.length * 5, studiedToday, weekStart: localIso(3) },
    feed,
  };
}

// Visao da semana (Fase 74): `/__mock/semana?estado=` muda a Semana 2 no detalhe do curso e em
// GET /api/weeklies/w-2 - andamento (dia 11 pela metade, reforco pendente do dia 8) ou publicacao
// (semana fechada com o projeto avaliado e a publicacao do modulo pendente).
// Entrada (Fase 74): sem sessao (/__mock/sair) ou com o perfil ainda sem a entrevista (/__mock/onboarding).
let loggedOut = false;
let profilePending = false;

// Caderninho (Fase 74): notas de exemplo de dias e de projeto, com tags.
function sampleNotes(now: string) {
  const note = (id: string, weekNumber: number, dayNumber: number | null, content: string, tags: string[]) => ({
    id, dailyId: dayNumber === null ? null : `d-${dayNumber}`, weeklyProjectId: dayNumber === null ? `p-${weekNumber}` : null,
    weekNumber, dayNumber, dailyDate: now.slice(0, 10), content, tags, createdAt: now, updatedAt: now,
  });
  return [
    note('n-1', 2, 8, '`alg: none` só passa se o servidor confiar no header. Validar **sempre** com a chave e o algoritmo fixos do lado do servidor.', ['jwt', 'validação']),
    note('n-2', 2, 8, 'Payload não é segredo: é base64, qualquer um lê. Nada de dado sensível no token.', ['jwt']),
    note('n-3', 2, 7, 'HttpOnly bloqueia JS de ler o cookie, mas não impede o navegador de enviar. Contra CSRF quem ajuda é SameSite.', ['cookies', 'csrf']),
    note('n-4', 1, null, 'Scapy: `rdpcap` lê o pcap inteiro; pra arquivo grande usar `PcapReader` (vai pacote a pacote).', ['python', 'projeto']),
  ];
}

type WeekMode = 'padrao' | 'andamento' | 'publicacao';
let weekMode: WeekMode = 'padrao';
const WEEK2_TITLES = ['Cookies, sessões e flags', 'JWT: tokens autocontidos', 'RBAC vs. ABAC', 'Same-Origin Policy e CORS', 'Headers de segurança: CSP e HSTS', 'Do token ao código (PyJWT)'];

const MOCK_CERTS = [
  { certificationCode: 'SEC+', certificationName: 'CompTIA Security+', certifier: 'CompTIA' },
  { certificationCode: 'EJPT', certificationName: 'eJPT', certifier: 'INE Security' },
  { certificationCode: 'CEH', certificationName: 'CEH', certifier: 'EC-Council' },
  { certificationCode: 'PNPT', certificationName: 'PNPT', certifier: 'TCM Security' },
];

function courseDetailDto() {
  const TITLES = ['Fundamentos da Web', 'Injeção e XSS', 'Autenticação e sessão', 'Nuvem e APIs'];
  const monthlies = TITLES.map((title, mi) => ({
    id: mi === 0 ? MOCK_IDS.monthly : `m-${mi + 1}`,
    number: mi + 1,
    title,
    certifications: MOCK_CERTS.filter((_, ci) => !(mi === 1 && ci === 3) && !(mi === 2 && ci === 1) && !(mi === 3 && ci === 2)).map((c) => ({
      ...c,
      coveredDomains: `${c.certificationName}: tópicos do Módulo ${mi + 1} (${title}) que caem no exame - texto de exemplo do mock.`,
    })),
    weeklies: [0, 1, 2].map((wi) => {
      const number = mi * 3 + wi + 1;
      const days = Array.from({ length: 6 }, (_, di) => {
        const dayNumber = (number - 1) * 6 + di + 1;
        const done = dayNumber <= (weekMode === 'publicacao' ? 12 : 10);
        const inProgress = weekMode === 'andamento' && dayNumber === 11;
        return {
          id: number === 1 && di === 0 ? MOCK_IDS.daily : `d-${dayNumber}`,
          dayNumber,
          date: localIso(Math.max(0, 11 - dayNumber)),
          status: done ? 3 : inProgress ? 2 : dayNumber === 11 ? 1 : 0,
          isReinforcement: false,
          totalActivities: 8,
          completedActivities: done ? 8 : inProgress ? 3 : 0,
          title: number === 2 ? WEEK2_TITLES[di] : `Dia ${dayNumber}`,
          isNext: dayNumber === 11 && weekMode !== 'publicacao',
          reinforcementDailyId: weekMode === 'andamento' && dayNumber === 8 ? 'r-8' : null,
          completedToday: false,
        };
      });
      if (weekMode === 'andamento' && number === 2) {
        days.push({ ...days[1], id: 'r-8', status: 1, isReinforcement: true, completedActivities: 0, reinforcementDailyId: null, title: 'Reforço do dia 8' });
      }
      return {
        id: number === 1 ? MOCK_IDS.weekly : `w-${number}`,
        number,
        title: `Semana ${number}`,
        theme: number === 2 ? 'Autenticação e autorização' : null,
        totalDailies: 6,
        completedDailies: days.filter((d) => d.status === 3).length,
        weakDailies: 0,
        hasWeeklyReinforcement: false,
        days,
        requiresPublicationToUnlock: weekMode === 'publicacao' && number === 2,
        isLocked: number > 2,
        projectStatus: number === 1 || (number === 2 && weekMode === 'publicacao') ? 2 : number === 2 ? 0 : null,
      };
    }),
  }));
  return {
    id: MOCK_IDS.course,
    name: 'Web Security',
    status: 1,
    progress: { totalDailies: 72, completedDailies: 10, reinforcementDailies: 0, completionPercentage: 13.9 },
    monthlies,
    dailyReinforcements: [],
    weeklyReinforcements: [],
  };
}

/** GET /api/weeklies/w-N (Fase 74): a semana N do detalhe do curso, no formato da visao da semana. */
function weekViewDto(weekId: string) {
  const course = courseDetailDto();
  const monthly = course.monthlies.find((m) => m.weeklies.some((w) => w.id === weekId));
  const week = monthly?.weeklies.find((w) => w.id === weekId);
  if (!monthly || !week) return null;
  const publicacao = weekMode === 'publicacao' && week.number === 2;
  const weak = (dayNumber: number) => publicacao && (dayNumber === 8 || dayNumber === 9);
  const errors: Record<number, number> = { 8: 1, 9: 2 };
  return {
    id: week.id,
    monthlyId: monthly.id,
    courseId: course.id,
    number: week.number,
    title: week.title,
    theme: week.theme,
    dailies: week.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      date: d.date,
      status: d.status,
      isReinforcement: d.isReinforcement,
      penaltyPoints: d.status === 3 ? errors[d.dayNumber] ?? 0 : 0,
      isWeakDay: weak(d.dayNumber),
      isNext: d.isNext,
      title: d.title,
      totalActivities: 18,
      completedActivities: d.status === 3 ? 18 : d.status === 2 ? 7 : 0,
      passedActivities: d.status === 3 ? 18 - (errors[d.dayNumber] ?? 0) : 0,
    })),
    curatedContents: [],
    project:
      week.projectStatus === null
        ? { ...projectDto({ mode: 'normal', pendingReinforcement: false, project: 'pendente' }), id: `p-${week.number}`, isLocked: true }
        : {
            ...projectDto({ mode: 'normal', pendingReinforcement: false, project: week.projectStatus === 2 ? 'avaliado' : 'pendente' }),
            id: `p-${week.number}`,
            isLocked: week.days.some((d) => !d.isReinforcement && d.status !== 3),
            score: week.projectStatus === 2 ? 88 : null,
          },
    reinforcements: [],
    requiresPublicationToUnlock: week.requiresPublicationToUnlock,
    hasPendingWeeklyReinforcement: publicacao,
    moduleCertifications:
      monthly.number === 1
        ? [
            { certificationCode: 'SECPLUS', certificationName: 'CompTIA Security+', certifier: 'CompTIA', coveredDomains: 'Domínio 1' },
            { certificationCode: 'EJPT', certificationName: 'eJPT', certifier: 'INE', coveredDomains: 'Redes' },
          ]
        : [],
  };
}

// Ranking (Fase 72): top 10 com agentes; no recorte Mes o aluno do mock fica fora do top 10 (27º) e na
// Semana a semana dele ainda nao fechou.
const RANKING_NAMES = ['Marina', 'Diego', 'Falves (mock)', 'Bia', 'Rafa', 'Caio', 'Jess', 'Lu', 'Téo', 'Nina', 'Ana'];
function courseRankingDto(scope: string) {
  const looks = Object.values(LOOKS);
  const base = scope === 'weekly' ? 12 : scope === 'monthly' ? 33 : 96.2;
  const entries = RANKING_NAMES.map((name, i) => {
    const [skinTone, top, bottom, hair, shoes] = looks[i % looks.length];
    const isMe = name === 'Falves (mock)';
    return {
      userId: isMe ? MOCK_IDS.user : `r-${i}`,
      displayName: name,
      score: Math.round((base - i * base * 0.08) * 10) / 10,
      position: i + 1,
      equippedNameColor: null,
      look: { skinTone, top, bottom, hair, shoes },
    };
  });
  const others = entries.filter((e) => e.userId !== MOCK_IDS.user);
  const ranked = scope === 'monthly' ? others.map((e, i) => ({ ...e, position: i + 1 })) : entries;
  const me = scope === 'monthly' ? { ...entries[2], position: 27, score: 4.2 } : entries[2];
  const top = ranked.slice(0, 10);
  const ahead = scope === 'monthly' ? { ...top[9], position: 26, displayName: 'Rui', score: 4.9 } : entries[1];
  return { topEntries: top, currentUserEntry: me, aheadEntry: ahead, totalEntries: 31, currentWeekNumber: 2, currentWeekScored: scope !== 'weekly' };
}

function studyCalendarDto() {
  const pattern = ['studied', 'studied', 'missed', 'studied', 'studied', 'paused', 'paused', 'studied', 'studied', 'rest', 'studied', 'studied', 'studied', 'today'];
  return {
    days: pattern.map((status, i) => ({ date: localIso(13 - i), status })),
    lastSession: { dayNumber: 10, isReinforcement: false, completedAt: ago(60 * 27), score: 88 },
  };
}

function loadCurated(root: string): Curated {
  const path = resolve(root, '../secret/curadoria/web-security/semana-1/dia-1.json');
  if (!existsSync(path)) throw new Error(`[mock] conteudo curado nao encontrado em ${path} (precisa do repo focadu-secret em secret/)`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildState(curated: Curated) {
  const contents = curated.curatedContents.map((c) => ({
    id: randomUUID(),
    ref: c.ref,
    type: c.type === 'Reading' ? 0 : 1,
    title: c.title,
    externalUrl: c.externalUrl,
    bodyText: c.bodyText,
  }));
  const contentIdByRef = new Map(contents.map((c) => [c.ref, c.id]));

  const activities = curated.activities.map((a: Json, orderIndex: number) => {
    const defs = (a.wordMatchPairs ?? []).map((p: Json) => ({ id: randomUUID(), text: p.definition }));
    const terms = (a.wordMatchPairs ?? []).map((p: Json, i: number) => ({ id: randomUUID(), text: p.term, correct: defs[i].id }));
    const nodeIdByKey = new Map<string, string>((a.roleplayNodes ?? []).map((n: Json) => [n.nodeKey, randomUUID()]));
    return {
      id: randomUUID(),
      type: TYPE[a.type as TypeName],
      typeName: a.type as TypeName,
      orderIndex,
      contentId: a.contentRef ? (contentIdByRef.get(a.contentRef) ?? null) : null,
      answerMode: a.answerMode === 'FreeText' ? 1 : 0,
      prompt: a.prompt ?? null,
      expectedAnswer: a.expectedAnswer ?? null,
      quizOptions: (a.quizOptions ?? []).map((o: Json) => ({ id: randomUUID(), text: o.text, correct: !!o.isCorrect })),
      terms,
      // Backend embaralha as definicoes a cada carga; aqui uma vez so, pra tela nao pular.
      definitions: [...defs].sort(() => Math.random() - 0.5),
      roleplayNodes: (a.roleplayNodes ?? []).map((n: Json) => ({
        id: nodeIdByKey.get(n.nodeKey)!,
        nodeKey: n.nodeKey,
        text: n.text,
        isTerminal: !!n.isTerminal,
        terminalQuality: n.terminalQuality === undefined || n.terminalQuality === null ? null : ({ Ideal: 0, Suboptimal: 1, Poor: 2 } as Json)[n.terminalQuality] ?? n.terminalQuality,
        options: (n.options ?? []).map((o: Json) => ({ id: randomUUID(), text: o.text, nextNodeId: o.nextNodeKey ? (nodeIdByKey.get(o.nextNodeKey) ?? null) : null })),
      })),
      responses: [] as Json[],
    };
  });

  return { contents, activities, penaltyPoints: 0, completedAt: null as string | null, notes: [] as Json[] };
}

type State = ReturnType<typeof buildState>;

function score(act: State['activities'][number], body: Json): number {
  switch (act.typeName) {
    case 'Reading':
    case 'Video':
      return 100;
    case 'Quiz':
      return act.quizOptions.find((o) => o.id === body.selectedOptionId)?.correct ? 100 : 0;
    case 'Cloze':
      if (act.answerMode === 0) return act.quizOptions.find((o) => o.id === body.selectedOptionId)?.correct ? 100 : 0;
      return (body.transcript ?? '').trim().toLowerCase() === (act.expectedAnswer ?? '').trim().toLowerCase() ? 100 : 0;
    case 'WordMatch': {
      const matches: Record<string, string> = body.wordMatchMatches ?? {};
      const right = act.terms.filter((t) => matches[t.id] === t.correct).length;
      return act.terms.length ? Math.round((right / act.terms.length) * 100) : 0;
    }
    case 'Roleplay': {
      const q = act.roleplayNodes.find((n) => n.id === body.selectedRoleplayNodeId)?.terminalQuality;
      return q === 0 ? 100 : q === 1 ? 60 : 20;
    }
    default:
      return 0;
  }
}

function respond(state: State, act: State['activities'][number], value: number, extra: Json = {}) {
  const response = {
    id: randomUUID(),
    activityId: act.id,
    attemptNumber: act.responses.length + 1,
    score: value,
    passed: value >= PASSING,
    transcript: null,
    justification: null,
    aiFeedback: null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
  act.responses.push(response);
  if (!response.passed && !state.completedAt) state.penaltyPoints += 1;
  return response;
}

const VOICE_TRANSCRIPT =
  'A requisição passa por três fases: primeiro o DNS traduz o nome pro IP, consultando cache do navegador, do sistema e depois o servidor recursivo. Depois o TCP abre a conexão com o three-way handshake, SYN, SYN-ACK e ACK. Por fim o HTTP manda o pedido e, como ele não guarda estado, usa cookies pra lembrar da sessão.';
const VOICE_FEEDBACK =
  'Boa explicação das três fases, na ordem certa. Faltou dizer por que o handshake existe (garantir que os dois lados estão prontos antes de mandar dados). A parte de cookies e estado ficou clara.';

function fastForward(state: State, at: string, penalty: number) {
  for (const act of state.activities) {
    if (at !== 'done' && act.typeName === at) break;
    respond(state, act, act.typeName === 'VoiceSummary' ? 86 : 100, act.typeName === 'VoiceSummary' ? { transcript: VOICE_TRANSCRIPT, aiFeedback: VOICE_FEEDBACK } : {});
  }
  state.penaltyPoints = penalty;
}

function activityDto(act: State['activities'][number]) {
  const answered = act.responses.length > 0;
  return {
    id: act.id,
    type: act.type,
    orderIndex: act.orderIndex,
    contentId: act.contentId,
    status: answered ? 1 : 0,
    answerMode: act.answerMode,
    prompt: act.prompt,
    // Gabarito so depois de responder (igual ao backend).
    expectedAnswer: answered ? act.expectedAnswer : null,
    quizOptions: act.quizOptions.map((o) => ({ id: o.id, text: o.text, isCorrect: answered ? o.correct : null })),
    wordMatchTerms: act.terms.map((t) => ({ id: t.id, text: t.text, correctDefinitionId: answered ? t.correct : null })),
    wordMatchDefinitions: act.definitions,
    roleplayNodes: act.roleplayNodes.map((n) => ({ ...n, terminalQuality: answered ? n.terminalQuality : null })),
    responses: act.responses,
  };
}

type Mode = 'normal' | 'bloqueado' | 'semana' | 'ponte';
type ProjectState = 'pendente' | 'entregue' | 'avaliado';
interface Scenario {
  mode: Mode;
  pendingReinforcement: boolean;
  project: ProjectState;
  /** Fase 69: streak pausado (projeto aberto) no resumo de gamificacao. */
  paused?: boolean;
}

function dailyDto(state: State, scenario: Scenario, id = ids.daily, isReinforcement = false) {
  const accessMode = isReinforcement
    ? state.completedAt ? 2 : 1
    : scenario.mode === 'bloqueado' ? 4 : scenario.mode === 'semana' ? 5 : scenario.mode === 'ponte' ? 6 : state.completedAt ? 2 : 1;
  return {
    id,
    weeklyId: ids.weekly,
    dayNumber: scenario.mode === 'ponte' && !isReinforcement ? 6 : 1,
    date: new Date().toISOString().slice(0, 10),
    status: scenario.mode === 'ponte' && !isReinforcement ? 0 : state.completedAt || (!isReinforcement && scenario.mode !== 'normal') ? 3 : 2,
    isReinforcement,
    penaltyPoints: state.penaltyPoints,
    penaltyThreshold: PENALTY_THRESHOLD,
    accessMode,
    // Fase 69: sem linguagem escolhida, a ponte vem sem atividades (ver GetTodayUseCase).
    activities: scenario.mode === 'ponte' && !isReinforcement ? [] : state.activities.map(activityDto),
    pendingReinforcementDailyId: scenario.pendingReinforcement && !isReinforcement ? ids.reinforcement : null,
  };
}

function projectDto(scenario: Scenario) {
  const evaluated = scenario.project === 'avaliado';
  return {
    id: ids.project,
    specText:
      '### Analisador de requisições HTTP\n\nEscreva um script que recebe uma URL e mostra as três fases da requisição:\n\n1. **DNS**: o IP resolvido e quem respondeu.\n2. **TCP**: o tempo do handshake.\n3. **HTTP**: status, cabeçalhos e se veio `Set-Cookie`.\n\n- Entregue no repositório do Forgejo.\n- Um `README` curto explicando como rodar.',
    status: evaluated ? 2 : scenario.project === 'entregue' ? 1 : 0,
    isLocked: false,
    submissionUrl: 'http://localhost:3020/aluno/web-security-semana-1',
    score: evaluated ? 78 : null,
    feedback: evaluated
      ? 'O parser cobre DNS e HTTP direitinho, mas não trata redirecionamento 301 — a requisição para no primeiro Location. Boa separação em funções e o README explica bem como rodar.'
      : null,
    forgejoTokenLastEight: 'abcd1234',
    forgejoUsername: 'falves',
    languageStep: scenario.mode === 'ponte' ? 2 : 0,
    language: null,
    supportedLanguages: scenario.mode === 'ponte' ? [1, 2] : [],
    choosableLanguages: scenario.mode === 'ponte' ? [1, 2] : [],
    references: [],
    briefing: [],
    stateLines: {},
  };
}

function weeklyDto(state: State, scenario: Scenario) {
  const today = new Date().toISOString().slice(0, 10);
  const titles = ['Como a Web Funciona', 'HTTP por dentro', 'Cookies e sessão', 'Same-Origin Policy', 'HTTPS e TLS'];
  return {
    id: ids.weekly,
    monthlyId: ids.monthly,
    courseId: ids.course,
    number: 1,
    title: 'Semana 1',
    theme: 'Fundamentos da Web',
    dailies: titles.map((title, i) => ({
      id: i === 0 ? ids.daily : randomUUID(),
      dayNumber: i + 1,
      date: today,
      status: i === 0 ? (state.completedAt || scenario.mode !== 'normal' ? 3 : 2) : scenario.mode === 'semana' ? 3 : 0,
      isReinforcement: false,
      penaltyPoints: i === 0 ? state.penaltyPoints : 0,
      isWeakDay: false,
      isNext: i === 0,
      title: i === 0 ? state.contents[0]?.title ?? title : title,
      totalActivities: i === 0 ? state.activities.length : 18,
      completedActivities: i === 0 ? state.activities.filter((a) => a.responses.length > 0).length : 0,
      passedActivities: i === 0 ? state.activities.filter((a) => a.responses.some((r: Json) => r.passed)).length : 0,
    })),
    curatedContents: state.contents.map(({ ref: _ref, ...c }) => c),
    project: projectDto(scenario),
    reinforcements: [],
    requiresPublicationToUnlock: false,
    hasPendingWeeklyReinforcement: false,
    moduleCertifications: [],
  };
}

async function readBody(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw || !(req.headers['content-type'] ?? '').includes('json')) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.statusCode = status;
  if (body === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function reinforcementState(curated: Curated): State {
  const full = buildState(curated);
  const firstQuiz = full.activities.find((x) => x.typeName === 'Quiz')!;
  const clozes = full.activities.filter((x) => x.typeName === 'Cloze').slice(0, 2);
  const activities = [firstQuiz, ...clozes].map((x, i) => ({ ...x, orderIndex: i, responses: [] as Json[] }));
  return { ...full, activities };
}

export function sessionMock(): Plugin {
  let curated: Curated;
  let state: State;
  let reinforcement: State;
  let scenario: Scenario = { mode: 'normal', pendingReinforcement: false, project: 'pendente' };

  function reset(at = 'Quiz', penalty = 0, extra: Partial<Scenario> = {}) {
    state = buildState(curated);
    reinforcement = reinforcementState(curated);
    const mode: Mode = at === 'bloqueado' ? 'bloqueado' : at === 'semana' ? 'semana' : at === 'ponte' ? 'ponte' : 'normal';
    fastForward(state, mode === 'normal' && at !== 'reforco' ? at : mode === 'ponte' ? 'Reading' : 'done', penalty);
    if (mode !== 'normal' && mode !== 'ponte') state.completedAt = new Date().toISOString();
    scenario = { mode, pendingReinforcement: false, project: 'pendente', ...extra };
  }

  const stateFor = (id: string) => (id === ids.reinforcement ? reinforcement : id === ids.daily ? state : null);

  return {
    name: 'focadu-session-mock',
    configResolved(config) {
      curated = loadCurated(config.root);
      reset();
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://mock');
        const path = url.pathname;
        const method = req.method ?? 'GET';

        if (path === '/__mock/reset') {
          const at = url.searchParams.get('at') ?? 'Quiz';
          const projeto = url.searchParams.get('projeto') as ProjectState | null;
          reset(projeto ? 'semana' : at, Number(url.searchParams.get('penalty') ?? 0), {
            pendingReinforcement: url.searchParams.get('reforco') === '1',
            paused: url.searchParams.get('pausa') === '1',
            ...(projeto ? { project: projeto } : {}),
          });
          res.statusCode = 302;
          res.setHeader(
            'Location',
            projeto
              ? `/start?course=${ids.course}&weekly=${ids.weekly}&project=1`
              : at === 'reforco'
                ? `/hoje?daily=${ids.reinforcement}`
                : '/hoje',
          );
          return res.end();
        }
        if (path === '/__mock/caderninho') {
          state.notes = sampleNotes(new Date().toISOString());
          res.statusCode = 302;
          res.setHeader('Location', `/start?course=${ids.course}&caderninho=1`);
          return res.end();
        }
        if (path === '/__mock/sair' || path === '/__mock/onboarding') {
          loggedOut = path === '/__mock/sair';
          profilePending = path === '/__mock/onboarding';
          res.statusCode = 302;
          res.setHeader('Location', loggedOut ? '/login' : '/onboarding');
          return res.end();
        }
        if (path === '/__mock/semana') {
          const estado = url.searchParams.get('estado') ?? 'andamento';
          weekMode = estado === 'publicacao' ? 'publicacao' : estado === 'trancada' ? 'padrao' : 'andamento';
          res.statusCode = 302;
          res.setHeader('Location', `/start?course=${ids.course}&weekly=${estado === 'trancada' ? 'w-3' : 'w-2'}`);
          return res.end();
        }
        if (path === '/__mock/squad') {
          squadRole = (url.searchParams.get('as') as SquadRole | null) ?? 'membro';
          squadMembers = [...SQUAD_MEMBERS];
          squadCoLeader = 'u-marina';
          res.statusCode = 302;
          res.setHeader('Location', '/squad');
          return res.end();
        }
        if (path === '/__mock/loja') {
          const q = new URL(req.url ?? '', 'http://x').searchParams;
          resetShop(q.get('agente') !== '0', Number(q.get('gemas') ?? 60));
          res.statusCode = 302;
          res.setHeader('Location', '/loja');
          return res.end();
        }
        if (!path.startsWith('/api/')) return next();

        // Telas de erro (Fase 10): 500, sem conexao (socket derrubado) e timeout do cliente (10s).
        if (path.startsWith('/api/courses/erro-500')) return send(res, 500, { error: 'erro_interno', message: 'Erro simulado pelo mock.' });
        if (path.startsWith('/api/courses/erro-offline')) return req.socket.destroy();
        if (path.startsWith('/api/courses/erro-lento')) return void setTimeout(() => send(res, 200, {}), 12_000);

        const body = method === 'GET' ? {} : await readBody(req);
        const now = new Date().toISOString();
        let m: RegExpMatchArray | null;

        if (path === '/api/auth/me' && loggedOut) return send(res, 401, { error: 'nao_autenticado', message: 'Faça login.' });
        if ((path === '/api/auth/login' || path === '/api/auth/register') && method === 'POST') loggedOut = false;
        if (path === '/api/auth/forgot-password' || path === '/api/auth/reset-password') return send(res, 204);
        if (path === '/api/users/me/profile' && method === 'PUT') profilePending = false;
        if (path === '/api/courses/available')
          return send(res, 200, [
            { id: 'c-web', title: 'Web Security', description: 'Do HTTP ao pentest de aplicação: cookies, JWT, injeção, XSS, CORS, nuvem e APIs. Uma Daily por dia e um projeto por semana.', estimatedDuration: '12 semanas · 72 dias' },
            { id: 'c-cloud', title: 'Cloud Security', description: 'IAM, redes na nuvem, containers e detecção. Mesmo formato: Daily, projeto e castelo.', estimatedDuration: '12 semanas · 72 dias' },
          ]);
        if (path === '/api/enrollments' && method === 'POST') return send(res, 200, { id: 'e-1', courseId: body.courseId });
        if (path === '/api/auth/me' || path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/users/me/profile')
          return send(res, 200, {
            id: ids.user,
            email: 'mock@focadu.local',
            displayName: 'Falves (mock)',
            profileCompletedAt: profilePending ? null : now,
            interests: ['Motos esportivas', 'Jogos competitivos'],
            additionalProfileNotes: null,
            preferredLanguages: [1, 2],
            createdAt: '2026-09-02T12:00:00Z',
            hideScoresInSquadFeed: hideScores,
          });
        if (path === '/api/auth/logout') return send(res, 204);
        if (path === '/api/courses') return send(res, 200, [{ id: ids.course, name: 'Web Security', status: 1, monthlyCount: 4 }]);
        const shop = handleShop(path, method, body);
        if (shop) return send(res, shop[0], shop[1]);
        if (path === '/api/users/me/gamification') {
          const pausedUntil = scenario.paused ? new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10) : null;
          return send(res, 200, { totalGems: 12, currentStreak: 3, longestStreak: 7, streakJustBroken: false, streakPausedUntil: pausedUntil, streakRestAvailable: true });
        }
        if (path === '/api/system/ai-status')
          return send(res, 200, [
            { provider: 'Groq', configured: true, available: true, errorMessage: null, checkedAt: now },
            { provider: 'GitHub', configured: true, available: true, errorMessage: null, checkedAt: now },
          ]);

        // Perfil (Fase 70)
        if (path === '/api/users/me/badges')
          return send(res, 200, {
            badges: [
              { code: 'streak_7', achieved: true, progress: 7 },
              { code: 'streak_30', achieved: false, progress: 7 },
              { code: 'easy_weekly', achieved: true, progress: 1 },
              { code: 'embaixador', achieved: false, progress: 0 },
              { code: 'founder', achieved: true, progress: 1 },
            ],
          });
        if (path === '/api/users/me/referral') return send(res, 200, { referralCode: 'K7Q2M9XA', confirmedReferralCount: 0 });
        if (path === `/api/courses/${ids.course}/ranking`) return send(res, 200, courseRankingDto(url.searchParams.get('scope') ?? 'course'));
        if (path === '/api/squads/me/hq')
          return squadRole === 'nenhum'
            ? send(res, 404, { error: 'squad_nao_encontrado', message: 'Você ainda não tem squad.' })
            : send(res, 200, squadHqDto());
        if (path === '/api/squads/me/cheers' && method === 'POST') {
          const key = String(body.activityKey ?? '');
          const current = cheers.get(key) ?? { count: 0, mine: false };
          const next = { count: current.count + (current.mine ? -1 : 1), mine: !current.mine };
          cheers.set(key, next);
          return send(res, 200, { activityKey: key, cheers: next.count, cheeredByMe: next.mine });
        }
        if (path === '/api/users/me/study-calendar') return send(res, 200, studyCalendarDto());
        if (path === '/api/users/me/squad-feed-privacy' && method === 'PUT') {
          hideScores = !!body.hideScores;
          return send(res, 200, { id: ids.user, email: 'mock@focadu.local', displayName: 'Falves (mock)', profileCompletedAt: now, interests: ['Motos esportivas', 'Jogos competitivos'], additionalProfileNotes: null, preferredLanguages: [1, 2], createdAt: '2026-09-02T12:00:00Z', hideScoresInSquadFeed: hideScores });
        }
        // Fase 72: detalhe do curso (trilha, Perfil) - 72 dias em 4 regioes, os 10 primeiros concluidos e o
        // Dia 11 como proximo (Semana 1 fechada com o projeto avaliado).
        if (path === `/api/courses/${ids.course}`) return send(res, 200, courseDetailDto());
        if (path === '/api/squads/me/ranking')
          return squadRole === 'nenhum'
            ? send(res, 404, { error: 'squad_nao_encontrado', message: 'Você ainda não tem squad.' })
            : send(res, 200, squadRankingDto());
        if ((path === '/api/squads' || path === '/api/squads/join') && method === 'POST') {
          squadRole = path === '/api/squads' ? 'lider' : 'membro';
          return send(res, 200, { id: 'squad-1', name: 'Os Firewalls', joinCode: 'X9K2P7QD' });
        }
        if ((m = path.match(/^\/api\/squads\/members\/([^/]+)$/)) && method === 'DELETE') {
          if (m[1] === ids.user) squadRole = 'nenhum';
          else squadMembers = squadMembers.filter((x) => x.userId !== m![1]);
          return send(res, 204);
        }
        if ((m = path.match(/^\/api\/squads\/co-leader(?:\/([^/]+))?$/))) {
          squadCoLeader = method === 'PUT' ? (m[1] ?? null) : null;
          return send(res, 204);
        }

        if (path === '/api/today') return send(res, 200, dailyDto(state, scenario));
        if ((m = path.match(/^\/api\/dailies\/([^/]+)(\/start)?$/))) {
          const target = stateFor(m[1]);
          if (!target) return send(res, 404, { error: 'daily_nao_encontrada', message: 'Daily não encontrada.' });
          return send(res, 200, dailyDto(target, scenario, m[1], m[1] === ids.reinforcement));
        }
        if (path === `/api/weeklies/${ids.weekly}`) return send(res, 200, weeklyDto(state, scenario));
        if ((m = path.match(/^\/api\/weeklies\/(w-\d+)$/))) {
          const week = weekViewDto(m[1]);
          return week ? send(res, 200, week) : send(res, 404, { error: 'Semana não encontrada.' });
        }
        if (path === `/api/weeklies/${ids.weekly}/project/language` && method === 'POST') {
          // Fase 69: escolher a linguagem libera a ponte (no mock, a sessao do Dia 1 faz o papel dela).
          scenario = { ...scenario, mode: 'normal' };
          return send(res, 200, projectDto(scenario));
        }
        if (path === `/api/weeklies/${ids.weekly}/project/submit` && method === 'POST') {
          scenario.project = 'avaliado';
          return send(res, 200, projectDto(scenario));
        }
        if ((m = path.match(/^\/api\/curated-content\/([^/]+)$/))) {
          const c = state.contents.find((x) => x.id === m![1]);
          if (!c) return send(res, 404, { error: 'conteudo_nao_encontrado', message: 'Conteúdo não encontrado.' });
          const { ref: _ref, ...dto } = c;
          return send(res, 200, { ...dto, personalizedAnalogies: [] });
        }
        if ((m = path.match(/^\/api\/dailies\/([^/]+)\/activities\/([^/]+)\/responses(\/audio)?$/)) && method === 'POST') {
          const target = stateFor(m[1]);
          const act = target?.activities.find((a) => a.id === m![2]);
          if (!target || !act) return send(res, 404, { error: 'atividade_nao_encontrada', message: 'Atividade não encontrada.' });
          const response = m[3]
            ? respond(target, act, 86, { transcript: VOICE_TRANSCRIPT, aiFeedback: VOICE_FEEDBACK })
            : respond(target, act, score(act, body), { transcript: body.transcript ?? null });
          return send(res, 200, { response, dailyReinforcementTriggered: false, reinforcementDailyId: null, weeklyReinforcementTriggered: false });
        }
        if ((m = path.match(/^\/api\/dailies\/([^/]+)\/complete$/)) && method === 'POST') {
          const target = stateFor(m[1]);
          if (!target) return send(res, 404, { error: 'daily_nao_encontrada', message: 'Daily não encontrada.' });
          const isReinforcement = m[1] === ids.reinforcement;
          const first = !target.completedAt;
          target.completedAt ??= now;
          const allPassed = target.activities.every((a) => a.responses.at(-1)?.passed);
          return send(res, 200, {
            daily: dailyDto(target, scenario, m[1], isReinforcement),
            dailyReinforcementTriggered: !isReinforcement && target.penaltyPoints >= PENALTY_THRESHOLD,
            reinforcementDailyId: !isReinforcement && target.penaltyPoints >= PENALTY_THRESHOLD ? ids.reinforcement : null,
            weeklyReinforcementTriggered: false,
            weeklyReinforcementId: null,
            gemsEarned: first ? (isReinforcement && allPassed ? 2 : 1) : 0,
            streakAfterCompletion: 4,
            wasReinforcementBonus: isReinforcement && allPassed,
          });
        }
        if ((m = path.match(/^\/api\/(dailies\/[^/]+|weeklies\/[^/]+\/project)\/notes$/)) && method === 'POST') {
          const note = { id: randomUUID(), dailyId: ids.daily, weeklyProjectId: null, weekNumber: 1, dayNumber: 1, dailyDate: now.slice(0, 10), content: body.content ?? '', tags: body.tags ?? [], createdAt: now, updatedAt: now };
          state.notes.unshift(note);
          return send(res, 200, note);
        }
        if ((m = path.match(/^\/api\/notes\/([^/]+)$/))) {
          const note = state.notes.find((n) => n.id === m![1]);
          if (method === 'DELETE') {
            state.notes = state.notes.filter((n) => n.id !== m![1]);
            return send(res, 204);
          }
          if (note && method === 'PUT') Object.assign(note, { content: body.content, tags: body.tags ?? [], updatedAt: now });
          return note ? send(res, 200, note) : send(res, 404, { error: 'nota_nao_encontrada', message: 'Nota não encontrada.' });
        }
        if (path === `/api/courses/${ids.course}/notes`) {
          const tag = url.searchParams.get('tag');
          const q = url.searchParams.get('q')?.toLowerCase();
          return send(res, 200, state.notes.filter((n) => (!tag || n.tags.includes(tag)) && (!q || n.content.toLowerCase().includes(q))));
        }
        if (path === `/api/courses/${ids.course}/notes/tags`) return send(res, 200, [...new Set(state.notes.flatMap((n) => n.tags))]);
        if (path === '/api/study-assistant/ask')
          return send(res, 200, { answer: '(mock) O three-way handshake é a troca SYN, SYN-ACK e ACK que confirma que os dois lados estão prontos antes de mandar dados.' });

        return send(res, 404, { error: 'mock_nao_implementado', message: `Mock sem rota pra ${method} ${path}.` });
      });
    },
  };
}
