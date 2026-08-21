# Resumo — Fase 14: Motor de Gems + Streak

## Contexto

Primeira fase real de gamificação. Até aqui, todo elemento visual de Gems/Streak que apareceu nos
designs do Figma foi deliberadamente descartado (Fases 8, 9, 13b) por não existir dado real por
trás. Esta fase constrói o backend que dá sentido a esses elementos e reativa exatamente o que foi
cortado nos 3 nodes já conhecidos - sem gerar telas novas.

O prompt apontou `Daily.OnFirstCompleted`/`OnReplayCompleted` (hooks propositalmente vazios desde
a Fase 4) como "ponto de entrada natural". Na prática, não foi por aí - ver "Onde a decisão de
negócio mora" abaixo.

## Validação de design

Os 3 nodes revisitados (já usados em fases anteriores, nenhum link novo) foram conferidos contra
o que existe de verdade no domínio hoje:

| Node | Rótulo esperado | O que foi reativado | Divergência que permanece |
|---|---|---|---|
| `3-286` (Fase 8) | Dashboard Start | Badge `💎 N` (`GemBadge`) + `🔥 N dias` (`StreakIndicator`) no header, com saldo/streak real via `GET /api/users/me/gamification` | Nível/XP do mockup continuam de fora - não existem no domínio (confirmado explicitamente fora de escopo nesta fase, ver "Notas Especiais" do prompt) |
| `31-409` (Fase 9) | Quiz 7 — Resultado Final | `+N 💎` discreto em `CompletionSummary` quando `gemsEarned > 0` - texto pequeno, sem popup/confete | Contador de tempo total do mockup continua de fora - o domínio não rastreia duração de sessão |
| `19-1648` (Fase 13b) | Empty State — Primeiro Acesso | `StreakIndicator` com `currentStreak={0}` fixo (sem chamada a API - quem não se matriculou nunca tem streak) | "Sessões completas 0/100%", dica de guilda ("Squad"), nível/gems no card do curso continuam de fora - Squad não é uma rota real, XP/Level seguem fora de escopo |

## O que foi implementado

### Domínio (`Focadu.Domain.Gamification`, novo)

- **`UserGemBalance`**: `TotalGems` + 3 contadores mensais (`GemsFromDailiesThisMonth`/
  `WeekliesThisMonth`/`MonthlyThisMonth`) + `CurrentMonthPeriod`. `CreditDaily`/`CreditWeekly`/
  `CreditMonthly` respeitam o cap da própria categoria (20/20/30 - 70 no total) e resetam os
  contadores quando o mês calendário (`Year`/`Month` de `today`, parâmetro explícito - nunca
  `IClock` injetado no domínio) muda. Devolvem quanto foi creditado de verdade (0 se o cap já foi
  atingido) - o chamador nunca precisa checar o cap antes de creditar.
- **`UserStreak`**: `CurrentStreak`/`LongestStreak`/`LastCompletedDate?`. `RegisterCompletion`
  reinicia a contagem (em vez de incrementar) se detectar, no momento da chamada, que o streak já
  tinha quebrado - idempotente pra 2 conclusões na mesma data (Daily original + reforço no mesmo
  dia, por exemplo, contam 1x só). `CurrentStreakAsOf(today)` é o streak "ao vivo" - nunca precisa
  de uma escrita nova pra reportar `0` corretamente (ver nota de design do prompt: quebra por
  inatividade é ausência de evento, resolvida sob demanda, mesmo princípio já usado em
  `DailyStatus.Locked`).
- **`Weekly.IsPerfect()`** (novo): `IsModuleComplete()` e nenhuma Daily original com
  `PenaltyPoints > 0`.
- `ponytail`: streak usa "1 dia útil" como proxy de calendário (fins de semana não quebram) em vez
  de checar as Dailies agendadas de verdade - um hiato legítimo maior que isso quebraria o streak
  incorretamente. Sem curso real com esse tipo de gap hoje; upgrade natural fica documentado no
  código (`UserStreak.cs`) e em `docs/ARQUITETURA.md`.

### Onde a decisão de negócio mora - não foi nos hooks

`Daily.OnFirstCompleted`/`OnReplayCompleted` continuam **vazios, sem uso**. `Daily` não tem acesso
a `UserGemBalance`/`UserStreak` (aggregates diferentes - dar a `Daily` um repositório quebraria a
arquitetura hexagonal), e o projeto **não tem nenhum mecanismo de Domain Events** (conferido - o
prompt pediu explicitamente pra verificar isso antes de inventar um). Resolvido na camada de
aplicação (`CompleteDailyUseCase`), como o próprio prompt já antecipava como alternativa aceitável.

### `GamificationCreditor` (`Focadu.Application.Gamification`, novo) - por que credita em 2 lugares

`Weekly.IsPerfect()` só fica `true` quando **ambas** as condições batem: todas as Dailies
completas E o projeto avaliado. No fluxo típico do produto (a própria verificação ao vivo da Fase
13a fez nessa ordem: "concluir a Daily → submeter e avaliar o projeto"), quem de fato **fecha** a
Weekly é a avaliação do projeto, não a última Daily - se o bônus de Weekly/Monthly perfeita só
fosse checado dentro de `CompleteDailyUseCase` (a leitura literal do hook sugerido no prompt), ele
nunca dispararia nesse fluxo comum. `GamificationCreditor.CreditWeeklyAndMonthlyIfPerfectAsync` é
chamado a partir de **`CompleteDailyUseCase`** (quando a última Daily original completa) **e** de
**`EvaluateWeeklyProjectUseCase`** (quando o projeto é avaliado) - qualquer um dos dois pode ser o
evento que observa `IsPerfect()` virar `true` pela primeira vez. Seguro contra crédito duplicado:
`WeeklyProject.Evaluate()` já rejeita ser chamado 2x, e uma Daily só tem "primeira conclusão" uma
vez - só existe 1 momento em que `IsPerfect()` vira `true`, não importa qual dos 2 chamadores
observa. Verificado ao vivo (ver "Testes" abaixo).

### `CompleteDailyUseCase` (atualizado)

Captura `isFirstCompletion = !daily.HasEverCompleted` **antes** de chamar `daily.Complete()` (a
única forma de distinguir 1ª conclusão de replay depois que o status muda). Em 1ª conclusão:
credita +1 Gem (Daily), registra streak **só se `daily.Date == hoje`** (replay nunca chega aqui,
mas a checagem fica explícita, espelhando a regra tal como descrita), e chama o
`GamificationCreditor` pro bônus de Weekly/Monthly. `CompleteDailyResult` ganhou `GemsEarned`
(quanto **esta** conclusão gerou - 0 em replay/cap atingido) e `StreakAfterCompletion` (sempre o
streak "ao vivo", mesmo quando esta conclusão não mexeu nele).

### `GET /api/users/me/gamification` (`GetGamificationSummaryUseCase`, novo)

`GamificationSummaryDto(TotalGems, CurrentStreak, LongestStreak)`. `UserGemBalance`/`UserStreak`
são lazy (só existem depois da 1ª conclusão que gera Gems/streak) - usuário sem nenhuma linha
ainda devolve o estado zerado normalmente (200, nunca 404).

### Migration

`AddGamification` - `UserGemBalances`/`UserStreaks`, 1:1 com `Users` (índice único em `UserId`,
`OnDelete Cascade`), mesmo padrão de `Enrollments`. Só aditiva - aplicada contra o Postgres de dev
existente sem precisar recriar o banco.

### Frontend

- **`components/gamification/`**: `GemBadge.tsx` (ícone + contador, mesmo padrão pill de
  `StatusBadge`) e `StreakIndicator.tsx` (`🔥 N dias`).
- **`StartDashboard.tsx`**: busca `GET /api/users/me/gamification` junto com `today`/`weekly`/
  `courses` (`Promise.all`), renderiza os 2 badges no header.
- **`CompletionSummary.tsx`**: `+N 💎` discreto (texto pequeno, sem popup/confete) quando
  `result.gemsEarned > 0` - pode ser +1 (só a Daily), +5 (também fechou a Weekly) ou +30 (também
  fechou o Monthly), sempre o total creditado por **esta** conclusão.
- **`EmptyStateStartPage.tsx`**: `StreakIndicator` com `currentStreak={0}` fixo, sem chamada a API.
- `api/types.ts`/`api/client.ts`: `GamificationSummaryDto`, `CompleteDailyResult.gemsEarned`/
  `.streakAfterCompletion`, `api.getGamification()`.

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **115 aprovados** (96 pré-existentes + 19 novos -
  `UserGemBalanceTests` cobrindo crédito por categoria, cap mensal, cap independente por
  categoria, reset de período calendário; `UserStreakTests` cobrindo incremento consecutivo,
  tolerância de fim de semana, quebra ao pular um dia útil, idempotência na mesma data, recorde
  preservado após quebra, `CurrentStreakAsOf` reportando `0` sem escrita nova; +3 em `WeeklyTests`
  pra `IsPerfect()`).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- **Verificação ao vivo** (Postgres real, API + Vite dev server, Playwright dirigindo um Chromium
  headless):
  - Usuário registrado → onboarding → matriculado em "Web Security". Gamificação inicial
    confirmada zerada (`GET /api/users/me/gamification` → `{0, 0, 0}`).
  - As 4 Dailies da semana "viajaram no tempo" via `UPDATE "Dailies" SET "Date" = CURRENT_DATE`
    direto no Postgres (só progresso do usuário, nunca currículo/seed) - sem isso, exercitar a
    semana inteira exigiria esperar 4 dias úteis reais (não há mecanismo de `IClock` fake no
    processo rodando). Completadas as 4 via `POST .../start` + `.../complete` reais: `gemsEarned=1`
    em cada uma, `streakAfterCompletion=1` em todas (4 conclusões na mesma data real contam 1x só,
    conforme esperado). Total após as 4: **4 Gems**, streak **1**.
  - Projeto submetido + avaliado (`POST .../project/submit` + `.../evaluate`) - exercita
    especificamente o caminho novo em `EvaluateWeeklyProjectUseCase`. Total após avaliar: **39
    Gems** (4 + 5 Weekly perfeita + 30 Monthly perfeito, curso "Web Security" tem só 1 Monthly com
    1 Weekly - fechar a única Weekly fecha o Monthly inteiro também).
  - Dashboard (`/start`) screenshot confirmando `💎 39` / `🔥 1 dia` no header, renderizado de
    verdade a partir do saldo real.
  - Segundo usuário, fluxo 100% via clique real na UI (Reading → Vídeo → Quiz → Ligar Palavras,
    sem VoiceSummary/Roleplay - os únicos 2 tipos que exigiriam áudio/grafo de diálogo pra um
    teste automatizado) até "Concluir sessão" - `CompletionSummary` renderizou `+1 💎` de verdade,
    discreto, sem popup (screenshot em `docs/fase-14/` não anexado, conferido na sessão).
  - `console --errors` do browser: limpo nas 2 sessões.
  - Empty State (`/start` sem matrícula): `StreakIndicator` mostrando `🔥 0 dias` confirmado
    visualmente, sem round-trip de API.

## Dúvidas ou pontos abertos

- **Streak usa heurística de dia útil, não o calendário real do curso** - ver `ponytail:` em
  `UserStreak.cs`/`docs/ARQUITETURA.md`. Sem efeito prático hoje (o único curso seedado não tem
  gaps no meio de uma Weekly), mas vale revisitar se um curso futuro tiver.
- **Cap mensal (20/20/30) não foi exercitado ao vivo** - só existe 1 Weekly no curso seedado
  (4 Dailies, 1 bônus de Weekly, 1 de Monthly), longe dos 20/20/30 pra bater o teto num mês real.
  Coberto exaustivamente por `UserGemBalanceTests` (domínio puro), mesma convenção já usada pra
  regras que exigiriam cenários difíceis de montar ao vivo (ver Fase 4, Score no servidor).
- **Nenhuma tela de "Streak Perdido" dedicada** - não foi pedida nesta fase; o streak quebrado só
  aparece como `0` no `StreakIndicator` normal, mesmo tratamento de "Empty State" (sem alarmismo).
