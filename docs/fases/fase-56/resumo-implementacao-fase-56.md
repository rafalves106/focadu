# Resumo — Fase 56: Botão de sessão de reforço visível enquanto ela não for concluída

## O que foi implementado

Pedido do dono, logo depois das Fases 54 e 55: o botão "Ir para a sessão de reforço" precisa ficar
visível **enquanto a sessão de reforço não for concluída**.

Motivo de fundo: até aqui o único caminho até um reforço era o link da `CompletionSummary`, que aparece
**uma vez só**, logo ao concluir a Daily de origem. A trilha e a semana escondem os reforços
(`!isReinforcement`; a trilha só os conta em "Sessões de reforço"). Se o aluno saísse daquela tela, ou o
clique falhasse (foi o caso da Fase 54), não havia como voltar sem montar a URL na mão.

- **Backend:** `DailySequencing.FindPendingReinforcement` acha a Daily de reforço não concluída da matrícula
  (qualquer `Status` ≠ `Completed`; a `InProgress` primeiro, depois a da Weekly mais antiga, e nela a de menor
  `DayNumber`). `GetTodayUseCase` devolve o id em `DailyStateDto.PendingReinforcementDailyId`
  (novo campo opcional no fim do record, `null` por padrão) em **todas** as respostas de `GET /api/today`,
  seja qual for o `AccessMode`. Nenhum endpoint novo.
- **Frontend:** novo componente `PendingReinforcementCard` (mesma linguagem visual do aviso "Sessão de reforço
  gerada" da `CompletionSummary`), mostrado:
  - no `StartDashboard`, **acima** do card de hoje;
  - dentro dos dois avisos de "Hoje" bloqueado da `TodayPage` (`Blocked` — cota diária gasta — e
    `WeekPendingClosure` — semana esperando o projeto), que são exatamente onde o aluno cai depois de concluir a
    Daily do dia.
  Some sozinho quando o reforço é concluído. O texto vira "Continuar a sessão de reforço" quando o próprio alvo de
  hoje é o reforço em andamento.

## Decisões técnicas tomadas que não estavam no prompt original

- **O servidor diz qual é o reforço pendente** (campo no DTO de `/today`) em vez de o cliente varrer a trilha
  atrás de dias com `isReinforcement && status ≠ Completed`. O dashboard até teria os dados (a trilha vem com os
  dias), mas os avisos de `TodayPage` não têm o curso carregado, e o reforço pode estar numa Weekly diferente da
  do alvo de hoje (Dia 5 da Semana 1 concluído, alvo de hoje = Dia 6 da Semana 2). Uma fonte só evita duas regras
  de "pendente".
- **Campo só em `GET /api/today`.** `getDaily`, `startDaily` e `completeDaily` devolvem `null`: é o atalho que
  descreve "o que mostrar agora". Adicionar o campo lá seria custo sem uso.
- **O botão aparece também com o reforço em andamento** (texto "Continuar…"), mesmo que o card de hoje já leve
  a ele. Explícito é melhor que implícito: o card de hoje diz "Dia 6 de 5" nesse caso (ver pontos abertos).
- **Posição acima do card de hoje:** reforço é o que ficou pendente do dia anterior; o card de hoje descreve o
  que vem depois.
- **Sem aviso de reforço dentro da sessão** (durante uma atividade) nem no `GlobalNav`: fora do que foi pedido,
  e o aluno em sessão já está fazendo o que importa.

## Estrutura de arquivos criada

```
frontend/src/components/PendingReinforcementCard.tsx      (novo)
```

Alterados:

```
backend/src/Focadu.Application/Dailies/DailySequencing.cs   (FindPendingReinforcement)
backend/src/Focadu.Application/Dailies/Dtos.cs               (DailyStateDto.PendingReinforcementDailyId)
backend/src/Focadu.Application/Dailies/GetTodayUseCase.cs
backend/tests/Focadu.Tests/Dailies/DailySequencingTests.cs
frontend/src/api/types.ts
frontend/src/routes/StartDashboard.tsx
frontend/src/routes/TodayPage.tsx
docs/ARQUITETURA.md, CLAUDE.md, docs/fase-56/resumo-implementacao-fase-56.md (este arquivo)
```

## Testes

- `dotnet test`: 401 aprovados, 0 falhas (eram 397; 4 novos em `DailySequencingTests`). No CI, que não roda os 76
  testes que dependem de `secret/`, devem aparecer 325.
- **Checagem por mutação:** tratando reforço concluído como pendente, 1 teste fica vermelho; tirando a prioridade
  do reforço em andamento, 1 fica vermelho. `DailySequencing.cs` restaurado e conferido byte a byte. (Uma primeira
  tentativa da mutação A não foi aplicada — o trecho aparecia duas vezes e meu `assert` abortou; refeita com o trecho
  exato.)
- `tsc -b` limpo; `oxlint` nos arquivos alterados: só o aviso `set-state-in-effect` que já existia em `TodayPage`.
- **Conferido em navegador real** (Playwright + Chromium headless) contra ambiente descartável: Postgres
  temporário restaurado do estado atual do banco, backend novo com chave JWT própria e o frontend novo servido por
  um proxy mínimo na mesma origem. Capturas de tela e dump apagados depois. Verificado:
  - dashboard com reforço pendente → card "Sessão de reforço pendente" + botão "Ir para a sessão de reforço" acima
    do card de hoje ("PROJETO PENDENTE", "Dia 5 de 5", "Semana 1 de 12");
  - `/hoje` com semana esperando o projeto → aviso "Semana concluída - falta o projeto" com o botão;
  - `/hoje` com a cota diária gasta → aviso "Sessão de hoje já concluída" com o botão;
  - **clicar no botão abre a sessão de reforço** ("Hora de revisar / Começar revisão"), sem o 409 do print
    original; depois disso o dashboard passa a dizer "Continuar a sessão de reforço";
  - com o reforço `Completed` o botão some (`pendingReinforcementDailyId = null` na API);
  - de quebra, a trilha da Fase 55 vista de verdade: Semana 1 em destaque, Semanas 2, 3, 4… "🔒 Bloqueado".
  - console do navegador sem erros em todos os passos.
- **Armadilha achada no teste:** `frontend/.env.local` define `VITE_API_BASE_URL` apontando para o backend ao vivo
  (`:5282`), e o `vite build` local o embute. Meu primeiro build descartável chamou o backend ao vivo (o navegador
  barrou por CORS no preflight; nenhuma chamada real chegou lá e o token descartável não valeria de qualquer forma,
  a chave é outra). Refeito com `VITE_API_BASE_URL=""`, conferindo que `5282` não aparece no bundle. O bundle ao vivo
  (build de contêiner) não tem o problema. Quem repetir esse tipo de teste precisa fazer o mesmo.

## Dúvidas ou pontos abertos para a próxima fase

- **Card de hoje com o reforço como alvo:** quando o reforço está em andamento ele vira o "alvo de hoje" e o card
  mostra "Dia 6 de 5" e "COMEÇAR HOJE" (o total de dias exclui reforço, o número do dia não). Já era assim antes;
  ficou um pouco redundante com o botão novo em cima. Esconder ou reescrever esse card nesse caso é decisão de UX.
- **Contagens que incluem o reforço:** a trilha mostra "5 de 6 dias" na Semana 1 (o total conta a Daily de
  reforço, os chips só mostram 1–5) e o dashboard mostra "0 de 12 semana(s) completa(s)" e "0% completo" porque uma
  semana com reforço pendente nunca conta como completa (`completedDailies === totalDailies`). Já existia; não mexi.
- O botão não aparece **dentro** de uma sessão em andamento nem no `GlobalNav`.
