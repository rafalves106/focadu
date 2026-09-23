import { ActivityType, AnswerMode, TerminalQuality } from '../api/types';

/**
 * Falas padrao da Focada na sessao diaria (Fase 68, Figma "Daily — redesign proposto"). Mesma ideia
 * das falas do mapa (lib/focadaMapLines.ts): texto fixo por situacao, na voz de
 * secret/curadoria/GUIA-DE-VOZ-FOCADA.md (trata o aluno por "agente", frase curta, acolhe o erro sem
 * drama). A curadoria nao precisa escrever nada; se um dia quiser sobrescrever por dia/semana, e aqui
 * que o dado entraria.
 */

/** Apresentacao de um bloco novo de atividades (substitui o antigo IntroCard). */
export function blockIntro(type: ActivityType, answerMode: AnswerMode, count: number, threshold: number): { title: string; text: string; rules: string[] } {
  const reinforcementTail = `Errou ${threshold} na sessão? Eu separo essas num reforço curtinho pra você.`;
  switch (type) {
    case ActivityType.Quiz:
      return {
        title: 'Hora do quiz',
        text: `${count === 1 ? 'Uma pergunta' : `${count} perguntas`} sobre o que você acabou de ler e ver. Uma tentativa cada — a certa aparece logo depois. ${reinforcementTail}`,
        rules: [`${count} ${count === 1 ? 'questão' : 'questões'}`, '1 tentativa', 'Teclas 1–4 + Enter'],
      };
    case ActivityType.Cloze:
      return answerMode === AnswerMode.FreeText
        ? {
            title: 'Complete a lacuna',
            text: 'Falta uma palavra em cada frase. Você digita — maiúscula ou minúscula tanto faz, o que vale é a grafia. Uma tentativa por lacuna.',
            rules: [`${count} ${count === 1 ? 'lacuna' : 'lacunas'}`, '1 tentativa', 'Enter confirma'],
          }
        : {
            title: 'Complete a frase',
            text: 'Escolha o termo que fecha a frase. Uma tentativa cada — a certa aparece logo depois.',
            rules: [`${count} ${count === 1 ? 'frase' : 'frases'}`, '1 tentativa', 'Teclas 1–4 + Enter'],
          };
    case ActivityType.WordMatch:
      return {
        title: 'Ligar palavras',
        text: 'Toque num termo e depois na definição que combina. Ligou errado? Toca de novo pra desfazer. Só confirma quando todos os pares estiverem ligados.',
        rules: [`${count} ${count === 1 ? 'grupo' : 'grupos'}`, '1 tentativa por grupo'],
      };
    case ActivityType.Roleplay:
      return {
        title: 'Roleplay',
        text: 'Agora é com você no meio da situação. Cada escolha leva pra um caminho diferente e não tem volta — pensa antes de agir.',
        rules: ['Decisões sem volta', 'Vale o desfecho'],
      };
    default:
      return { title: 'Próxima etapa', text: 'Bora pra próxima, agente.', rules: [] };
  }
}

/** Escolha estavel entre variantes (mesma atividade = mesma fala a cada render). */
function pick(list: string[], seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return list[Math.abs(hash) % list.length];
}

const PASS = [
  'Isso aí, agente! Na mosca.',
  'Certinho. Pode seguir que você tá afiado.',
  'Boa! Essa você não esquece mais.',
];

const FAIL = [
  'Quase! Dá uma olhada na certa ali em cima — ela vai voltar no reforço se precisar.',
  'Essa escapou. Tudo bem: repara na resposta certa e segue.',
  'Não foi dessa vez. O importante é entender o porquê — confere a certa acima.',
];

const ROLEPLAY: Record<TerminalQuality, string> = {
  [TerminalQuality.Ideal]: 'Desfecho ideal, agente. Foi exatamente o que um profissional faria.',
  [TerminalQuality.Suboptimal]: 'Funcionou, mas não do melhor jeito. Repara no que o caminho ideal teria feito diferente.',
  [TerminalQuality.Poor]: 'Esse caminho deu ruim. Acontece — é pra errar aqui e não em produção.',
};

/** Reacao da Focada ao resultado de uma etapa avaliada. */
export function feedbackLine(passed: boolean, seed: string, roleplayQuality?: TerminalQuality | null): string {
  if (roleplayQuality !== undefined && roleplayQuality !== null) return ROLEPLAY[roleplayQuality];
  return pick(passed ? PASS : FAIL, seed);
}

export const REINFORCEMENT_CREATED = 'Tudo bem errar, agente — é pra isso que o reforço existe. Termina a sessão que depois a gente revisa junto.';

export const SESSION_DONE_LINE = 'Tudo respondido! Fecha a sessão pra garantir a gema e o streak de hoje.';

export function completionLine(passedCount: number, total: number): string {
  if (total > 0 && passedCount === total) return 'Gabaritou o dia, agente! Isso aqui ninguém copia de IA — foi você explicando com a própria cabeça.';
  return 'Dia no bolso! O que escapou hoje volta no reforço — é assim que fixa. Amanhã tem mais.';
}

export const REINFORCEMENT_INTRO =
  'Só as que escaparam, agente. Acerta todas e o bônus de superação vale +2 gemas no lugar de +1.';

export const BLOCKED_TODAY =
  'Por hoje acabou, agente. Uma sessão por dia é de propósito: o cérebro consolida dormindo. A de amanhã abre à meia-noite.';
