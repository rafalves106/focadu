import { WeeklyProjectStatus, type FocadaStateKey, type WeeklyProjectDto } from '../api/types';

/**
 * Falas da Focada no Projeto Semanal (Fase 64, ver secret/rascunhos/projeto-semanal-dialogo-de-jogo.md).
 * O briefing vem da curadoria (WeeklyProjectDto.briefing); as falas de ESTADO sao estas padrao,
 * iguais em toda semana - uma semana so troca alguma via `falasDeEstado` no projeto.json (chega em
 * `stateLines`). Voz: secret/curadoria/GUIA-DE-VOZ-FOCADA.md (sarcastica no texto, acolhe na nota
 * baixa, chama o aluno de "agente", max. 200 caracteres). `{nota}` vira a nota do projeto.
 */
export type FocadaExpression = 'neutra' | 'comemorando' | 'acolhedora';

export interface FocadaLine {
  text: string;
  expression: FocadaExpression;
}

/** Nota a partir da qual a Focada comemora (abaixo, acolhe). Projeto nao tem aprovado/reprovado - e so o tom da fala. */
export const FOCADA_HIGH_SCORE = 70;

export const DEFAULT_STATE_LINES: Record<FocadaStateKey, string> = {
  repositorio: 'Seu repositório está pronto, agente. Clone, commite e entregue quando terminar. Estou de olho nos seus commits.',
  entregue: 'Entrega recebida. A avaliação está lendo seu código agora. Vá pegar um café, eu aviso.',
  avaliadoAlta: 'Nota {nota}. Confesso: não esperava tanto. Missão cumprida, agente.',
  avaliadoBaixa: 'Nota {nota}. Não foi dessa vez, e tudo bem. Leia o feedback com calma: ele é o mapa da próxima missão.',
};

function currentState(project: WeeklyProjectDto): { key: FocadaStateKey; expression: FocadaExpression } | null {
  if (project.status === WeeklyProjectStatus.Evaluated) {
    const high = (project.score ?? 0) >= FOCADA_HIGH_SCORE;
    return high ? { key: 'avaliadoAlta', expression: 'comemorando' } : { key: 'avaliadoBaixa', expression: 'acolhedora' };
  }
  if (project.status === WeeklyProjectStatus.Submitted) return { key: 'entregue', expression: 'neutra' };
  if (project.submissionUrl) return { key: 'repositorio', expression: 'neutra' };
  return null;
}

/** Briefing (neutra) + a fala do estado atual do projeto, se houver. */
export function buildFocadaLines(project: WeeklyProjectDto): FocadaLine[] {
  // `?? []`/`?? {}`: backend anterior a Fase 64 nao manda os campos - sem briefing, sem dialogo.
  const lines: FocadaLine[] = (project.briefing ?? []).map((text) => ({ text, expression: 'neutra' }));
  if (lines.length === 0) return [];
  const state = currentState(project);
  if (state) {
    const text = (project.stateLines?.[state.key] ?? DEFAULT_STATE_LINES[state.key]).replaceAll('{nota}', String(project.score ?? ''));
    lines.push({ text, expression: state.expression });
  }
  return lines;
}
