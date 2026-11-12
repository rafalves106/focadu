import navHoje from '../assets/pixel/nav-hoje.png';
import navRanking from '../assets/pixel/nav-ranking.png';
import navSquad from '../assets/pixel/nav-squad.png';
import navTrilhas from '../assets/pixel/nav-trilhas.png';
import { guideScreenFor } from './guiaTelas';

export type ShellDestination = 'hoje' | 'trilha' | 'squad' | 'ranking';

export interface ShellLink {
  key: ShellDestination;
  label: string;
  to: string;
  /** Sprite 16x16 da barra inferior do celular (a nav do desktop é só rótulo). */
  icon: string;
}

/**
 * Destinos da casca do redesign v1 (Fase 109; sistema.md §2 regra 5): Hoje · Trilha · Squad · Ranking.
 * Squad e Ranking só depois do 1º dia fechado (nav com 2 destinos, barra inferior com 3). Hoje é o
 * Início (`/start`); Trilha e Ranking abrem o curso do aluno, ou caem no Início se ainda não há curso.
 */
export function shellLinks(courseId: string | null, firstDayDone: boolean): ShellLink[] {
  const links: ShellLink[] = [
    { key: 'hoje', label: 'Hoje', to: '/start', icon: navHoje },
    { key: 'trilha', label: 'Trilha', to: courseId ? `/start?course=${courseId}` : '/start', icon: navTrilhas },
  ];
  if (firstDayDone) {
    links.push({ key: 'squad', label: 'Squad', to: '/squad', icon: navSquad });
    links.push({ key: 'ranking', label: 'Ranking', to: courseId ? `/start?course=${courseId}&ranking=1` : '/start', icon: navRanking });
  }
  return links;
}

/** Destino ativo pela URL. Perfil, Loja, Caderninho e Certificações moram no menu do agente: nenhum ativo. */
export function activeDestination(pathname: string, search: string): ShellDestination | null {
  switch (guideScreenFor(pathname, search)) {
    case 'start':
    case 'sessao':
      return 'hoje';
    case 'trilha':
    case 'semana':
    case 'projeto':
      return 'trilha';
    case 'squad':
      return 'squad';
    case 'ranking':
      return 'ranking';
    default:
      return null;
  }
}
