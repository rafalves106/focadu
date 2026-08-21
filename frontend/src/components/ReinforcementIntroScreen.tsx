import { IntroCard } from './activities/IntroCard';

/**
 * Tela de transição para uma sessão de reforço (Fase 15) - primeira coisa que aparece ao abrir
 * uma Daily de reforço (`daily.isReinforcement`), antes de qualquer atividade clonada. Reaproveita
 * IntroCard (Fase 9, mesmo padrão de badge/título/descrição/regras/CTA das intros de
 * Quiz/WordMatch) - sem inventar um componente novo. Sem alarmismo (princípio do produto: erro é
 * "rota de revisão", não falha) - copy neutra, foco no que vai ser reforçado.
 */
export function ReinforcementIntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <IntroCard
      badge="Sessão de reforço"
      title="Hora de revisar"
      description="Alguns pontos de hoje precisam de mais atenção - essa sessão extra foca só neles, sem repetir o que você já domina."
      rules={[
        'As atividades aqui são as mesmas que você errou, com uma nova chance.',
        'Acertar todas concede um Bônus de Superação em Gems.',
      ]}
      ctaLabel="COMEÇAR REVISÃO"
      onStart={onStart}
    />
  );
}
