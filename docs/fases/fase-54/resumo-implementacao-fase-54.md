# Resumo — Fase 54: Travas de acesso — reforço iniciável no mesmo dia, "1 Daily por dia" na matrícula inteira e projeto semanal libera a próxima semana

## O que foi implementado

Três bugs reais, relatados ao vivo em 21/09/2026 ao fechar a Daily 5 (a última da Semana 1), todos no
mesmo ponto: `Weekly.EvaluateDailyAccess` e o que `GET /api/today` faz com ele.

1. **"Ir para a sessão de reforço" dava 409 ("Algo Deu Errado").** O reforço nasce na mesma Weekly da
   Daily de origem, que acabara de gastar a cota diária (`daily_limite_diario_atingido`). A tela de
   conclusão oferece o botão na hora, então o fluxo nunca poderia funcionar no mesmo dia. Agora o
   reforço **não é barrado pela cota diária** (continua barrado por "uma Daily em andamento por vez").
2. **"Hoje" abria a Daily 6 (Semana 2) no mesmo dia.** "1 Daily por dia" e "1 em andamento por vez"
   eram checadas só dentro da própria Weekly, que não enxerga as irmãs. `EvaluateDailyAccess` e
   `StartOrResumeDaily` ganharam o parâmetro opcional `otherWeekliesDailies`; `GetTodayUseCase`,
   `GetDailyStateUseCase` e `StartOrResumeDailyUseCase` passam as Dailies das outras Weeklies
   (`DailySequencing.DailiesOfOtherWeeklies`). `null` (default) mantém o comportamento de antes.
3. **A Semana 2 abria sem o projeto da Semana 1.** A única trava entre semanas
   (`RequiresPublicationToUnlock`) só ligava com o projeto **já avaliado**; com o projeto `Pending`
   nada segurava a semana seguinte. Novo `Weekly.RequiresProjectToUnlock()` (Dailies todas concluídas
   e projeto ainda não `Evaluated`); `StartOrResumeDailyUseCase` recusa com o novo
   `projeto_semana_anterior_pendente` (409).

Para o item 3 não virar um 409 genérico toda vez que o aluno termina a última Daily de uma semana:

- Novo `DailyAccessMode.WeekPendingClosure` (valor 5). Se a Weekly anterior à da Daily-alvo ainda não
  fechou (projeto não avaliado **ou** publicação não validada — `DailySequencing.FindPendingClosureBefore`),
  `GET /api/today` devolve a **última Daily original dessa Weekly** (já `Completed`) com esse modo. O
  cliente cai na Weekly certa, onde está o card do projeto. Essa checagem vem **antes** da cota diária:
  "volte amanhã" não resolveria.
- Frontend: `TodayPage` ganhou o aviso "Semana concluída - falta o projeto" (CTA leva à semana);
  `StartDashboard` mostra o badge "PROJETO PENDENTE"/"PUBLICAÇÃO PENDENTE" no card de hoje, o texto e o
  botão "Ver a semana", e "Semana X de Y" passa a mostrar a semana em foco em vez de `+1`.
- Frontend: recusa de regra de negócio (HTTP 409) ao abrir uma Daily agora mostra o **motivo** ("Não dá
  para abrir essa sessão agora" + texto por código) em vez de `GenericError` ("Algo Deu Errado /
  Tentar Novamente" — tentar de novo nunca muda o resultado de uma regra de negócio).

## Decisões técnicas tomadas que não estavam no prompt original

- **A cota diária continua contando qualquer conclusão de hoje, inclusive a de um reforço.** Só mudou
  *quem é barrado* por ela (o reforço deixou de ser), não *quem a consome*. Consequência que já existia
  e não mexi: concluir um reforço primeiro, num dia em que ainda não se fez a Daily do dia, gasta a cota
  e a Daily do dia fica para amanhã. Tirar o reforço da contagem também é uma decisão de produto
  separada (ver "pontos abertos").
- **`otherWeekliesDailies` opcional em vez de mudar a assinatura** (ou de mover a regra para a
  Application): mantém a regra dentro do domínio (única fonte de "concluída hoje", com o comentário de
  UTC vs. hora local) e deixa os testes de domínio existentes compilando e passando sem edição.
- **`GET /api/today` devolve a última Daily original da Weekly pendente, não um DTO novo.** Evita mudar o
  contrato de `DailyStateDto` (nenhum campo novo) e faz o dashboard, que escolhe a Weekly por
  `daily.weeklyId`, abrir sozinho na semana que falta fechar. O preço: o payload leva as atividades
  (já respondidas) dessa Daily, que o cliente ignora nesse modo.
- **`RequiresProjectToUnlock` é falso enquanto as Dailies não estão todas concluídas** e falso sem projeto
  definido. No primeiro caso quem segura é a sequência (`daily_bloqueada`); no segundo, travar o curso
  para sempre por dado ausente seria pior do que deixar passar (a matrícula sempre inicializa o projeto).
- **Uma Daily `InProgress` em outra Weekly agora bloqueia iniciar o reforço** (`daily_em_andamento`), por
  consequência direta do item 2. Não há mais como chegar nesse estado pela Api.
- O trecho do `EvaluateDailyAccess` para Daily `Completed` (`ReadOnly` quando há outra `InProgress`)
  continua olhando só a própria Weekly. Não foi pedido e é sobre replay, não sobre entrada nova.
- Número da fase: 54. As Fases 52 e 53 foram commitadas por outra sessão no mesmo checkout enquanto esta
  trabalhava; os comentários que eu tinha marcado como "Fase 52" foram renumerados.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Alterados:

```
backend/src/Focadu.Domain/Weeklies/Weekly.cs                     (EvaluateDailyAccess/StartOrResumeDaily + RequiresProjectToUnlock)
backend/src/Focadu.Domain/Enums/DailyAccessMode.cs                (WeekPendingClosure = 5)
backend/src/Focadu.Application/Dailies/DailySequencing.cs         (FindPreviousWeekly, DailiesOfOtherWeeklies, FindPendingClosureBefore)
backend/src/Focadu.Application/Dailies/GetTodayUseCase.cs
backend/src/Focadu.Application/Dailies/GetDailyStateUseCase.cs
backend/src/Focadu.Application/Dailies/StartOrResumeDailyUseCase.cs
backend/src/Focadu.Api/ErrorHandling/ApiExceptionHandler.cs       (projeto_semana_anterior_pendente -> 409)
backend/tests/Focadu.Tests/Weeklies/WeeklyTests.cs
backend/tests/Focadu.Tests/Dailies/DailySequencingTests.cs
backend/tests/Focadu.Tests/TestHelpers/DailyFixtures.cs           (NewWeekly(number = 1))
frontend/src/api/types.ts                                         (DailyAccessMode.WeekPendingClosure)
frontend/src/routes/TodayPage.tsx
frontend/src/routes/StartDashboard.tsx
docs/ARQUITETURA.md, CLAUDE.md, docs/fase-54/resumo-implementacao-fase-54.md (este arquivo)
```

## Testes

- `dotnet test`: 392 aprovados, 0 falhas (eram 371; 21 novos: 14 em `WeeklyTests`, 7 em
  `DailySequencingTests`).
- **Checagem por mutação:** desligando só a isenção do reforço, 2 testes novos ficam vermelhos; fazendo
  as travas voltarem a olhar só a própria Weekly, 3 ficam vermelhos. O `Weekly.cs` foi restaurado e
  conferido byte a byte depois.
- `tsc -b` limpo. `oxlint` nos arquivos alterados: um único aviso (`set-state-in-effect`), que já
  existe no arquivo original em `git HEAD` (mesma linha antes do meu bloco).
- **Ponta a ponta, em ambiente descartável:** Postgres temporário restaurado do backup do estado real do
  bug + o backend novo (chave JWT própria, nada do ambiente ao vivo). Com o estado quebrado
  (Dia 5 concluído hoje, reforço `Locked`, Dia 6 `InProgress`):
  - `GET /api/today` → `accessMode = 5`, Dia 5 da Semana 1 (não abre o Dia 6);
  - `POST .../start` do Dia 6 → 409 `projeto_semana_anterior_pendente`, Dia 6 continua `Locked`;
  - `GET /api/dailies/<reforço>` → 409 `daily_em_andamento` com o Dia 6 travado, e `Start` (o 409 do
    print original resolvido) depois de reverter o Dia 6 para `Locked` — o que confirma que o reparo do
    dado é necessário;
  - `POST .../start` do reforço → 200 `InProgress`; `GET /api/today` com ele em andamento → `Resume`;
  - projeto avaliado sem publicação → ainda `WeekPendingClosure` e 409 `modulo_bloqueado_por_publicacao`;
  - semana fechada (projeto + publicação), Dia 5 concluído hoje → `Blocked` (`accessMode = 4`) e 409
    `daily_limite_diario_atingido`; com o Dia 5 concluído "ontem" → `Start` e `POST .../start` → 200.
- Backup antes de tudo: `_backups/focadu-antes-fase54-20260921-152743.dump` (fora do repo).
- **Não testei no navegador** (sem browser automatizado aqui): as telas novas foram validadas por
  `tsc`, lint e pelo contrato da API acima, não visualmente.

## Dúvidas ou pontos abertos para a próxima fase

- **O banco ao vivo ainda tem o dado deixado pelo bug — e isso bloqueia o reforço até ser corrigido.** O
  Dia 6 (`1e3ee121-9374-423d-b4b6-8ccc6c462ffb`, Semana 2) está `InProgress` com 0 respostas. Com o
  código novo no ar, ele faz `GET /api/dailies/<reforço>` recusar com `daily_em_andamento`. A escrita foi
  negada pelo classificador de permissões desta sessão, então **não foi aplicada**. Conferido só com
  `SELECT` que o `UPDATE` abaixo atinge exatamente 1 linha (rollback: `SET "Status"='InProgress'`):

  ```sql
  UPDATE "Dailies" d SET "Status"='Locked'
  WHERE d."Id"='1e3ee121-9374-423d-b4b6-8ccc6c462ffb' AND d."DayNumber"=6 AND d."IsReinforcement"=false
    AND d."Status"='InProgress' AND d."CompletedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "ActivityResponses" r WHERE r."DailyId"=d."Id");
  ```
- **Push pendente (decisão do dono).** Os containers locais já rodam o código novo (rebuild manual, como
  na Fase 43), mas nada foi enviado ao GitHub. O `deploy.yml` faz `git reset --hard origin/main` neste
  diretório, e o push também leva os commits das Fases 52 e 53.
- **Reforço deve consumir a cota diária?** Hoje consome (sem mudança). Se o aluno fizer o reforço antes
  da Daily do dia, a Daily do dia é adiada para amanhã. Produto: manter, ou tirar o reforço da contagem?
- A trilha do curso (`CourseDetailPage`) só tranca a Semana N+1 quando a N `requiresPublicationToUnlock`.
  Com o projeto pendente a Semana 2 aparece destrancada na trilha, e clicar numa Daily dela agora mostra o
  aviso do 409 (não abre mais a sessão). Trancar visualmente exigiria um campo novo no DTO da trilha.
- `DailyRefusedNotice` usa textos fixos por código de erro (4 códigos); um código novo cai no texto do
  backend, que não tem acento.
