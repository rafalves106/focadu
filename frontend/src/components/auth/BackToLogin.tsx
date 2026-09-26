import { Link } from 'react-router-dom';
import backArrow from '../../assets/pixel/voltar.png';

/** "‹ Voltar pro login" das telas de senha (Fase 74). */
export function BackToLogin({ label = 'Voltar pro login' }: { label?: string }) {
  return (
    <Link to="/login" className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-accent hover:brightness-125">
      <img src={backArrow} alt="" className="size-4 pixelated" />
      {label}
    </Link>
  );
}
