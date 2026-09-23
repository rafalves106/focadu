import { PixelLink } from './session/PixelButton';
import reinforcementIcon from '../assets/pixel/mapa/badge-reforco.png';

/**
 * Reforco pendente (Fase 56, pedido do dono) - fica visivel enquanto existir uma Daily de reforco nao
 * concluida (`DailyStateDto.pendingReinforcementDailyId`, de GET /api/today). Fase 68: pixel art, e
 * sempre lembra que o reforco nao gasta a sessao do dia (ele fica fora da cota, Fase 55).
 *
 * `resume` = a sessao de reforco ja esta em andamento - so troca o texto.
 */
export function PendingReinforcementCard({ dailyId, resume = false }: { dailyId: string; resume?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-2 border-alert bg-base px-4 py-3">
      <img src={reinforcementIcon} alt="" className="size-8 shrink-0 pixelated" />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
        <p className="font-pixel-label text-[10px] text-alert">Reforço esperando</p>
        <p className="font-pixel text-lg leading-tight text-secondary">Uma sessão curta só com o que escapou. Não gasta a sessão do dia — dá pra fazer agora.</p>
      </div>
      <PixelLink to={`/hoje?daily=${dailyId}`} tone="alert">
        {resume ? 'Continuar reforço ›' : 'Fazer reforço ›'}
      </PixelLink>
    </div>
  );
}
