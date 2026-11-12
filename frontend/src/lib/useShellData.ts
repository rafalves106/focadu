import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { agentLook, type AgentLook } from './agentSprites';
import { pickCourse } from './courseChoice';
import { onSquadRequestsChanged } from './squadRequestsEvents';

export interface ShellData {
  /** Agente do aluno; null = ainda não criou (nav mostra o contorno tracejado). undefined = carregando. */
  look: AgentLook | null | undefined;
  gems: number | null;
  streak: number | null;
  /**
   * Já fechou o 1º dia (decisão do dono, direcao.md §6.2): só então aparecem Squad, Ranking, Loja e os
   * números do agente. Enquanto carrega, conta como "ainda não" (nada aparece e some depois). Se a
   * consulta falhar, conta como "sim": esconder destino por erro de rede seria pior.
   */
  firstDayDone: boolean;
  /** Curso de Trilha, Ranking, Caderninho e Certificações (o último aberto, senão o primeiro). */
  courseId: string | null;
  /** Pedidos de entrada no squad em aberto (só líder e colíder recebem mais que 0). */
  squadRequests: number;
}

/**
 * Dados da casca do redesign v1 (Fase 109): nav superior, barra inferior e menu do agente. Busca de novo
 * a cada troca de tela, pra o número de gems e o "1º dia fechado" mudarem quando o aluno volta do dia.
 * "1º dia fechado" sai do calendário de estudo: `lastSession` só existe depois de um dia concluído.
 */
export function useShellData(): ShellData {
  const { pathname } = useLocation();
  const [requestsVersion, setRequestsVersion] = useState(0);
  useEffect(() => onSquadRequestsChanged(() => setRequestsVersion((v) => v + 1)), []);

  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const { data: catalog, error: catalogError } = useApiResource(() => api.getMarketplaceCatalog(), [pathname]);
  const { data: gamification } = useApiResource(() => api.getGamification(), [pathname]);
  const { data: calendar, error: calendarError } = useApiResource(() => api.getStudyCalendar(), [pathname]);
  const { data: requestCount } = useApiResource(
    () => api.getSquadJoinRequestCount().then((r) => r.count).catch(() => 0),
    [pathname, requestsVersion],
  );

  return {
    look: catalog ? agentLook(catalog) : catalogError ? null : undefined,
    gems: gamification?.totalGems ?? null,
    streak: gamification?.currentStreak ?? null,
    firstDayDone: calendar ? calendar.lastSession !== null : calendarError !== null,
    courseId: pickCourse(courses)?.id ?? null,
    squadRequests: requestCount ?? 0,
  };
}
