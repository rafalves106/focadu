import ajudaIcon from '../../assets/pixel/ajuda.png';

/**
 * Botao "?" do guia das telas (Fase 75, Figma "Guia das telas — v2", quadros 01 e 08): fixo no canto
 * de baixo, na margem das telas pixel art. Na sessao diaria no celular sobe acima da barra de
 * ferramentas fixa (`h-12`). Na 1a visita a uma tela pisca e mostra a dica uma vez.
 */
export function HelpButton({
  onClick,
  active,
  pulse,
  aboveSessionBar,
}: {
  onClick: () => void;
  active: boolean;
  pulse: boolean;
  aboveSessionBar: boolean;
}) {
  return (
    <div className={`fixed right-4 z-40 lg:right-4 lg:bottom-6 ${aboveSessionBar ? 'bottom-16' : 'bottom-4'}`}>
      {pulse && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 animate-guide-pulse border-2 border-accent/60" />
          <span aria-hidden="true" className="pointer-events-none absolute -inset-3 animate-guide-pulse border-2 border-accent/30" />
          <p
            role="status"
            className="absolute right-full bottom-1 mr-4 w-max max-w-[min(20rem,calc(100vw-6rem))] border-2 border-accent bg-base px-3 py-2 font-pixel text-lg leading-tight text-primary"
          >
            Primeira vez aqui? Aperte <span className="text-accent">?</span> e eu explico a tela.
          </p>
        </>
      )}
      <button
        type="button"
        data-guia="ajuda"
        onClick={onClick}
        aria-label="Guia da tela (tecla ?)"
        title="Guia da tela (?)"
        className={`relative flex size-10 items-center justify-center lg:size-12 border-2 border-[#1c9e3e] shadow-[4px_4px_0_0_#1c9e3e] hover:brightness-125 ${active ? 'bg-accent' : 'bg-base'}`}
      >
        <img src={ajudaIcon} alt="" className="size-8 pixelated" />
      </button>
    </div>
  );
}
