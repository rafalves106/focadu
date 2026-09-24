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
 * Erros: /start?course=erro-500 | erro-offline | erro-lento (timeout do cliente, ~10s).
 * Ids fixos (MOCK_IDS) pra os links continuarem valendo depois de reiniciar o Vite.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

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
        if (!path.startsWith('/api/')) return next();

        // Telas de erro (Fase 10): 500, sem conexao (socket derrubado) e timeout do cliente (10s).
        if (path.startsWith('/api/courses/erro-500')) return send(res, 500, { error: 'erro_interno', message: 'Erro simulado pelo mock.' });
        if (path.startsWith('/api/courses/erro-offline')) return req.socket.destroy();
        if (path.startsWith('/api/courses/erro-lento')) return void setTimeout(() => send(res, 200, {}), 12_000);

        const body = method === 'GET' ? {} : await readBody(req);
        const now = new Date().toISOString();
        let m: RegExpMatchArray | null;

        if (path === '/api/auth/me')
          return send(res, 200, {
            id: ids.user,
            email: 'mock@focadu.local',
            displayName: 'Falves (mock)',
            profileCompletedAt: now,
            interests: ['Motos esportivas', 'Jogos competitivos'],
            additionalProfileNotes: null,
            preferredLanguages: [1, 2],
          });
        if (path === '/api/auth/logout') return send(res, 204);
        if (path === '/api/courses') return send(res, 200, [{ id: ids.course, name: 'Web Security', status: 1, monthlyCount: 4 }]);
        if (path === '/api/marketplace/catalog') return send(res, 200, { totalGems: 12, items: [] });
        if (path === '/api/users/me/gamification') {
          const pausedUntil = scenario.paused ? new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10) : null;
          return send(res, 200, { totalGems: 12, currentStreak: 3, longestStreak: 7, streakJustBroken: false, streakPausedUntil: pausedUntil, streakRestAvailable: true });
        }
        if (path === '/api/system/ai-status')
          return send(res, 200, [
            { provider: 'Groq', configured: true, available: true, errorMessage: null, checkedAt: now },
            { provider: 'GitHub', configured: true, available: true, errorMessage: null, checkedAt: now },
          ]);

        if (path === '/api/today') return send(res, 200, dailyDto(state, scenario));
        if ((m = path.match(/^\/api\/dailies\/([^/]+)(\/start)?$/))) {
          const target = stateFor(m[1]);
          if (!target) return send(res, 404, { error: 'daily_nao_encontrada', message: 'Daily não encontrada.' });
          return send(res, 200, dailyDto(target, scenario, m[1], m[1] === ids.reinforcement));
        }
        if (path === `/api/weeklies/${ids.weekly}`) return send(res, 200, weeklyDto(state, scenario));
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
        if (path === `/api/courses/${ids.course}/notes`) return send(res, 200, state.notes);
        if (path === `/api/courses/${ids.course}/notes/tags`) return send(res, 200, [...new Set(state.notes.flatMap((n) => n.tags))]);
        if (path === '/api/study-assistant/ask')
          return send(res, 200, { answer: '(mock) O three-way handshake é a troca SYN, SYN-ACK e ACK que confirma que os dois lados estão prontos antes de mandar dados.' });

        return send(res, 404, { error: 'mock_nao_implementado', message: `Mock sem rota pra ${method} ${path}.` });
      });
    },
  };
}
