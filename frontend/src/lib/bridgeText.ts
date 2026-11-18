import { ActivityType, type DailyActivityDto } from '../api/types';
import { isCommentLine, type BridgePosition } from './bridgeSteps';

/**
 * Textos fixos da ponte intercalada (Fase 113), tirados dos quadros aprovados da página `108:2`: a Fala do topo de cada
 * etapa (uma por tela, só antes de responder) e o eyebrow do cartão.
 */

/**
 * Tipo de Fazer, pela ajuda que o passo dá (a ajuda diminui de bloco em bloco): código inicial só com comentários (e
 * linhas vazias, que podem vir marcadas como lacuna, quadro `119:3363`) é "só a estrutura"; com código de verdade é a
 * lacuna do bloco 1; sem código inicial próprio (o passo "refaz" parte do trecho anterior) é "sozinho".
 */
export function fazerKind(activity: DailyActivityDto): 'lacuna' | 'estrutura' | 'sozinho' {
  const step = activity.codeStep;
  if (!step?.codeStarter || step.replaces) return 'sozinho';
  const lines = step.codeStarter.split('\n').filter((l) => l.trim() !== '');
  return lines.every(isCommentLine) ? 'estrutura' : 'lacuna';
}

export function bridgeEyebrow(position: BridgePosition, activity: DailyActivityDto): string {
  if (position.part === 'abertura') return 'Abertura';
  if (position.part === 'final') return 'Voz final';
  const block = `Bloco ${position.block}`;
  switch (position.subStep) {
    case 'Explicação':
      return `${block} · Explicação`;
    case 'Prever':
      return `${block} · Prever · 1 pergunta`;
    case 'Ordenar':
      return `${block} · Ordenar as linhas`;
    case 'Corrigir':
      return `${block} · Corrigir o erro`;
    case 'Voz':
      return `${block} · Voz curta · até 1 min`;
    default: {
      const kind = fazerKind(activity);
      return `${block} · ${kind === 'lacuna' ? 'Fazer · código inicial pronto' : kind === 'estrutura' ? 'Fazer · só a estrutura' : 'Fazer sozinho'}`;
    }
  }
}

/** A Fala do topo da etapa (nula depois de responder: a devolutiva fica no cartão). */
export function bridgeFala(position: BridgePosition, activity: DailyActivityDto): string | null {
  if (activity.responses.length > 0) return null;
  if (position.part === 'abertura') return 'Hoje é code comigo: três blocos curtos, e o editor fica do seu lado o tempo todo.';
  if (position.part === 'final') return 'Última voz: conte o que o seu script achou e por que isso importa.';
  switch (position.subStep) {
    case 'Explicação':
      return position.block === 1 ? 'Uma explicação curta, só do que o próximo passo usa.' : 'Mais uma peça. Curta, e já vai pro código.';
    case 'Prever':
      return 'Antes de rodar, aposte.';
    case 'Ordenar':
      return 'Agora sem código pronto. Primeiro você ordena as linhas do for, depois escreve.';
    case 'Corrigir':
      return 'Rodei com outro endereço do laboratório e a saída mentiu. Ache o porquê.';
    case 'Voz':
      return 'Agora com a sua voz. O código fica ao lado para você olhar enquanto fala.';
    default: {
      const kind = fazerKind(activity);
      if (kind === 'lacuna') return 'Quase tudo já está no editor. Falta uma linha, a sua.';
      if (kind === 'estrutura') return 'Agora só a estrutura: os comentários dizem o que vai em cada linha.';
      return activity.type === ActivityType.CodeStep ? 'Agora é com você: as linhas que você ordenou já estão no editor.' : null;
    }
  }
}
