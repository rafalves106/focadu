import { api } from '../api/client';
import type { UserDto } from '../api/types';

/**
 * Resolve pra onde mandar um usuario logado (Fase 13b) - unico lugar que sabe a ordem
 * onboarding -> selecao de curso -> /start. Usado por SplashPage e pelo onSuccess de
 * login/registro (LoginPage), pra nunca duplicar essa decisao em dois lugares.
 *
 * Falha ao buscar matriculas (rede fora do ar, etc.) cai em '/start' de proposito: essa rota tem
 * seu proprio tratamento de erro (ApiErrorScreen) - melhor deixar a falha aparecer la do que a
 * Splash travar pra sempre esperando uma resposta que nunca chega.
 */
export async function resolveLandingPath(user: UserDto): Promise<string> {
  if (!user.profileCompletedAt) return '/onboarding';

  try {
    const enrollments = await api.getMyEnrollments();
    return enrollments.length > 0 ? '/start' : '/selecionar-curso';
  } catch {
    return '/start';
  }
}
