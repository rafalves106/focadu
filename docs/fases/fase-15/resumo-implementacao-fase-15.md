# Resumo — Fase 15: Conta-Giros Visual + Bônus de Superação

## Contexto

Fechamento, não construção do zero. O sistema de penalidade/reforço (`EvaluationPolicy`,
`Daily.ShouldTriggerDailyReinforcement`, `Weekly.CreateDailyReinforcement`,
`WeeklyReinforcement`) já existia e funcionava tecnicamente desde a Fase 4 - faltava só a
metáfora visual do "conta-giros" que o Documento Mestre sempre previu, e o "Bônus de Superação"
(Gems por completar um reforço com sucesso), que ficou de fora da Fase 14 porque aquela fase só
cobriu conclusão normal de Daily/Weekly/Monthly. `EvaluationPolicy` (80/3/2) não foi tocada -
confirmada correta na auditoria, esta fase é visual + bônus, não recalibração de negócio.

## Sem referência de Figma

Confirmado no prompt: o "conta-giros de penalidade" nunca apareceu desenhado no inventário
original de telas - é um elemento de feedback discreto, não uma tela própria. Reaproveitada a
linguagem visual já estabelecida (`ProgressBar`, Fase 8 - trilho + preenchimento arredondado),
adaptando a cor pra representar risco em vez de avanço, em vez de inventar uma metáfora nova.

## O que foi implementado

### Domínio

- **`EvaluationPolicy.ReinforcementBonusGems = 2`** - constante explícita (não hardcoded solto),
  mesma convenção das outras 3 constantes de negócio já existentes no arquivo.
- **`Daily.AllActivitiesPassed()`** (novo): true quando toda Activity da Daily tem resposta e a
  tentativa **mais recente** foi aprovada (permite corrigir por retry, não trava no primeiro
  erro). Só faz sentido pra Dailies de reforço (cada Activity ali já é uma que o usuário errou
  originalmente), mas é um método genérico de `Daily` - não checa `IsReinforcement` sozinho.
- **`WeeklyReinforcement.IsResolved(dailies)`** (novo): true quando toda Daily fraca em
  `WeakDailyIds` já tem sua Daily de reforço (`ReinforcementDailyId`) com `Status == Completed`.
  Recebe a coleção `Weekly.Dailies` como parâmetro - `WeeklyReinforcement` não navega pra `Daily`
  diretamente, só guarda os `Guid`s (mesma decisão de design documentada desde a Fase 1 pra
  `WeakDailyIds`). Só leitura/exibição, não muda a lógica de disparo existente.
- **`Weekly.HasPendingWeeklyReinforcement()`** (novo): `_reinforcements.Any(r => !r.IsResolved(_dailies))`
  - o que o frontend de fato consome.
- **`UserGemBalance.CreditReinforcementBonus`** (novo, Fase 14 atualizada): credita
  `ReinforcementBonusGems` (+2) na **mesma categoria/cap** de `CreditDaily` normal
  (`GemsFromDailiesThisMonth`, 20/mês) - não ganhou cap próprio, confirmando a diretriz do prompt
  de manter a arquitetura da Fase 14 simples. Isso expôs uma lacuna no `Credit` privado
  compartilhado: antes da Fase 15, as 3 chamadas existentes (+1/+5/+30) sempre dividiam
  exatamente seus próprios caps (20/20/30), então checar "já bati o cap? credita tudo ou nada"
  dava o mesmo resultado que clampar. Com dois valores diferentes (+1 e +2) na mesma categoria,
  isso deixou de ser verdade - um usuário a 19/20 gems de Dailies no mês, ao ganhar um bônus de
  +2, precisa receber só +1 (nunca estourar o cap por 1). `Credit` foi refeito pra **clampar**
  (`Math.Min(amount, remaining)`) em vez de tudo-ou-nada - mesmo resultado nos casos antigos,
  correto no caso novo. Coberto por teste (`CreditReinforcementBonus_SharesCapWithNormalDailyCredit`).

### Aplicação

- **`CompleteDailyUseCase`**: captura `wasReinforcementBonus = daily.IsReinforcement &&
  daily.AllActivitiesPassed()` antes de creditar - se true, chama `CreditReinforcementBonus` **em
  vez de** `CreditDaily` (substitui, nunca soma os dois). Reforço concluído sem sucesso total
  continua recebendo o crédito normal de Daily (só sem o bônus) - "reforço nunca gera penalidade
  adicional, só deixa de dar o bônus extra", exatamente como o prompt especificou.
- **DTOs**: `DailyStateDto` ganhou `PenaltyThreshold` (`PenaltyPoints` já existia desde antes da
  Fase 14 - conferido antes de assumir que precisava adicionar, per a nota do prompt).
  `WeeklyDetailDto` ganhou `HasPendingWeeklyReinforcement`. `CompleteDailyResult` ganhou
  `WasReinforcementBonus` (elegibilidade ao bônus, independente de quantas Gems o cap
  efetivamente permitiu - o frontend só usa isso pra escolher a COPY quando `GemsEarned > 0`).
- Nenhuma migration nova - nada persistido mudou (só métodos computados/DTOs novos).

### Frontend

- **`PenaltyGauge.tsx`** (`components/gamification/`): trilho + preenchimento arredondado (mesma
  linguagem do `ProgressBar`), cor por faixa - neutro (0) → amarelo (1) → laranja (2,
  `--color-project`) → vermelho (limite, `--color-alert`). Fixo no HUD de `TodayPage`, canto
  oposto ao botão de configurações, sempre visível durante a sessão (não só nas telas
  Reading/Video que usam `SessionTopBar` - as atividades que de fato mexem em `PenaltyPoints`
  são Quiz/Cloze/WordMatch/Roleplay, então o HUD precisa estar em `TodayPage`, não dentro de um
  componente que só metade dos tipos de atividade usa).
- **`ReinforcementIntroScreen.tsx`**: reaproveita `IntroCard` (Fase 9) - badge/título/descrição/
  regras/CTA, sem componente novo de verdade. Gate local em `TodayPage` (`daily.isReinforcement
  && !reinforcementIntroDismissed`), mesmo padrão de "started" já usado pelas intros de
  atividade - só mostra numa sessão de reforço genuinamente nova (nenhuma atividade respondida
  ainda), não reaparece a cada reload de uma sessão já em andamento/replay.
- **`WeeklyReinforcementBadge.tsx`**: puramente apresentacional (mesmo padrão de
  `StatusBadge`/`GemBadge`/`StreakIndicator`) - sem link embutido, quem usa decide se embrulha
  num `<Link>`. Integrado em `StartDashboard` (linkado pra `/start?weekly=`) e
  `WeeklyDetailPage` (só exibido, já na página certa).
- **`CompletionSummary.tsx`**: "🎯 Bônus de Superação: +N 💎" no lugar do texto padrão quando
  `wasReinforcementBonus` - mesmo tratamento discreto (texto pequeno, sem popup/confete) do "+N
  💎" da Fase 14, só a copy muda.

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **125 aprovados** (115 pré-existentes + 10 novos -
  `AllActivitiesPassed` (4 casos: todas aprovadas, alguma reprovada, usa tentativa mais recente,
  atividade nunca respondida), `HasPendingWeeklyReinforcement`/`IsResolved` (3 casos: pendente,
  resolvido após completar os reforços, nunca disparado), `CreditReinforcementBonus` (3 casos:
  crédito normal de +2, clamp perto do cap compartilhado, zero após cap já atingido)).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- **Verificação ao vivo** (Postgres real, API + Vite dev server, Playwright dirigindo um Chromium
  headless, fluxo 100% via clique real na UI onde fazia sentido):
  - Usuário registrado → matriculado → Dailies da semana "viajadas no tempo" pra hoje (mesma
    técnica das Fases 13b/14 - sem mecanismo de `IClock` fake no processo rodando).
  - Day 2 (Reading/Vídeo/Quiz/Ligar Palavras x2 - sem áudio/roleplay, os únicos 2 tipos difíceis
    de automatizar) respondido via clique real: Reading/Vídeo normalmente, Quiz e os 2 termos de
    WordMatch **errados de propósito** (opção incorreta identificada via consulta direta ao
    Postgres, já que o gabarito só é revelado depois de responder). Screenshot confirmando o
    `PenaltyGauge` em `1/3`, cor amarela, exatamente como especificado.
  - 3ª resposta errada disparou o reforço diário (`penaltyPoints=3/3` confirmado via Api). Day 2
    concluído (crédito normal de +1 Gem, mesmo com penalidade - reforço não afeta o crédito da
    Daily original).
  - Navegado pra `/hoje?daily={reinforcementId}` → `ReinforcementIntroScreen` renderizada de
    verdade ("SESSÃO DE REFORÇO" / "Hora de revisar" / regras / "COMEÇAR REVISÃO") →
    confirmado o `PenaltyGauge` em `0/3` (Daily nova, neutro) ao entrar na 1ª atividade clonada.
  - As 3 atividades clonadas (Quiz + 2 WordMatch, mesmo conteúdo que foi errado antes)
    respondidas **certas desta vez** via clique real (opção correta, também via consulta direta
    ao Postgres) → "3 de 3 corretas", "🏆 Conceito Dominado", **"🎯 Bônus de Superação: +2 💎"**
    confirmado renderizando na `CompletionSummary` de verdade.
  - `GET /api/users/me/gamification` confirmado em **3 Gems** (1 da conclusão normal do Day 2 +
    2 do Bônus de Superação) - matemática exata, nenhum crédito duplicado nem faltando.
  - Segunda Daily fraca (Day 3, via Api) disparou o `WeeklyReinforcement` (2+ dias fracos) -
    `hasPendingWeeklyReinforcement=true` confirmado, e o `WeeklyReinforcementBadge`
    ("📋 Revisão semanal disponível") confirmado renderizando tanto no `StartDashboard` quanto na
    `WeeklyDetailPage` (esta última também mostrando "Penalidades ativas: 6 ponto(s)" e o aviso
    "pelo menos um dia com penalidade" já existentes desde a Fase 8, coerentes com os 2 dias
    fracos reais).
  - `console --errors`: limpo, exceto um 409 esperado da própria simulação de "viagem no tempo"
    (2 Dailies datadas no mesmo dia "hoje" comprimido, cada uma tentando ficar `InProgress`
    simultaneamente - artefato só desta técnica de teste, nunca aconteceria organicamente com 1
    dia real de cada vez; corrigido no próprio script completando a 2ª Daily antes de prosseguir).

## Dúvidas ou pontos abertos

- Nenhum - checklist do prompt fechado integralmente, incluindo a checagem de duplicação de
  crédito ao criar `GamificationCreditor`/`CreditReinforcementBonus` (já coberta pelo raciocínio
  documentado na Fase 14 sobre "só existe 1 momento em que a condição vira true").
- `ReinforcementBonusGems = 2` mantido conforme proposto no prompt - não pareceu desbalanceado
  frente ao cap de 20/mês de Dailies (10 bônus completos já estourariam o cap sozinhos, mas isso
  é um teto alto o suficiente pra não ser alcançado organicamente num mês normal de estudo, e o
  clamp agora garante que nunca estoura por 1 Gem mesmo perto do limite).
