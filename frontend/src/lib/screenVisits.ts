import { request } from '../api/client';
import { guideScreenFor } from './guiaTelas';

/**
 * Fase 103, medicao de produto: chave da tela aberta, a mesma do guia das telas, com "hoje" (escolha do dia, `/hoje`
 * sem `?daily=`) separada de "sessao" (a Daily aberta). A Api confere contra a mesma lista (`ScreenVisit.KnownScreens`)
 * e grava no maximo 1 linha por aluno, dia, tela e aparelho. Telas fora do app (login, senha, aceite) nao contam.
 */
export function screenVisitKey(pathname: string, search: string): string | null {
  const screen = guideScreenFor(pathname, search);
  if (screen === 'sessao') return new URLSearchParams(search).has('daily') ? 'sessao' : 'hoje';
  if (!screen || ['login', 'senha', 'confirmar', 'aceite'].includes(screen)) return null;
  return screen;
}

// Ja avisado hoje nesta aba do navegador: evita uma chamada a cada clique (a Api ignora repetida de qualquer jeito).
const sent = new Set<string>();

export function recordScreenVisit(screen: string) {
  const key = `${new Date().toDateString()}|${screen}`;
  if (sent.has(key)) return;
  sent.add(key);
  // Medicao nunca atrapalha o aluno: erro e engolido (e libera pra tentar de novo na proxima troca de tela).
  request<void>('/api/visits', { method: 'POST', body: JSON.stringify({ screen }) }).catch(() => sent.delete(key));
}
