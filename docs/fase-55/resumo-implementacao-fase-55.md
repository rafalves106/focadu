# Resumo — Fase 55: Reforço fora da cota diária e projeto pendente bloqueia todas as semanas seguintes

## O que foi implementado

Duas decisões do dono, dadas logo depois da Fase 54 (`docs/fase-54/`):

1. **A conclusão de um reforço não consome a cota de "1 Daily por dia".** Na Fase 54 o reforço deixou de
   ser *barrado* pela cota, mas a conclusão dele ainda contava: fazer o reforço de um dia fraco antes da
   Daily do dia gastava a cota e adiava a Daily do dia para amanhã. Agora `Weekly.EvaluateDailyAccess` só
   conta conclusões de Dailies **originais** (`!IsReinforcement`) ao aplicar a cota.
   - Sobre o motivo dado ("senão seria impossível fazer um reforço logo após a daily"): fazer o reforço
     logo após a Daily já funcionava desde a Fase 54. O que esta fase muda é o outro lado — o reforço deixa
     de *gastar* a cota.
2. **"Se existe um projeto, todas as semanas seguintes ficam bloqueadas, do mesmo curso."** Até a Fase 54,
   `StartOrResumeDailyUseCase` só olhava a semana imediatamente anterior (`Number - 1`). Agora
   `DailySequencing.FindPendingClosureBefore` procura entre **todas** as Weeklies anteriores da matrícula
   (= mesmo curso) a **mais antiga** que ainda não fechou (`RequiresProjectToUnlock` ou
   `RequiresPublicationToUnlock`). É a mesma função que `GET /api/today` usa para devolver
   `WeekPendingClosure`, então "Hoje" passa a apontar para a semana mais antiga que falta fechar.
   `FindPreviousWeekly` (Fase 54) ficou sem uso e foi removida.
3. **A trilha do curso usa a mesma regra.** Novo `WeeklyOverviewDto.IsLocked` em
   `GET /api/courses/{courseId}`, calculado no servidor por `FindPendingClosureBefore`. O
   `CourseDetailPage` deixou de decidir isso sozinho (só a semana `N+1` e só por
   `requiresPublicationToUnlock`), o que fechava um item em aberto da Fase 54: com o projeto pendente as
   semanas seguintes apareciam destrancadas.

Mensagens/textos ajustados de "a semana anterior" para "uma semana anterior" (backend e
`DAILY_REFUSAL_COPY` em `TodayPage`).

## Decisões técnicas tomadas que não estavam no prompt original

- **Trava transitiva sem mudar `RequiresProjectToUnlock`.** Ele continua exigindo as Dailies da semana
  concluídas. Para uma semana anterior com Dailies pendentes, quem segura as seguintes é a sequência
  (`daily_bloqueada`); manter isso preserva o texto de `WeekPendingClosure` ("semana concluída, falta o
  projeto"), que seria falso se a semana ainda tivesse Dailies por fazer.
- **Publicação também ficou transitiva**, pelo mesmo helper. O pedido falou só de projeto, mas as duas
  travas compartilham a função e o mesmo motivo (semana anterior não fechada).
- **Devolve a mais antiga pendente**, não a mais próxima: é a que o aluno precisa fechar primeiro.
- **`IsLocked` no servidor em vez de derivar no cliente:** a regra é a mesma do 409; reimplementá-la no
  front era exatamente o que deixou a trilha errada. `requiresPublicationToUnlock` continua no DTO (contrato),
  mas o `CourseDetailPage` não o usa mais.
- **Os testes de cota usam reflexão para recuar `CompletedAt`** (`DailyFixtures.BackdateCompletion`):
  `Daily.Complete()` grava sempre "agora", e sem isso não há como montar "a Daily original foi concluída
  ontem, só o reforço hoje". Mesmo padrão já usado em `LeaveSquadUseCaseTests`.
- **Nenhum dado do banco ao vivo foi alterado por esta fase.**

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Alterados:

```
backend/src/Focadu.Domain/Weeklies/Weekly.cs                  (cota so conta Dailies originais)
backend/src/Focadu.Application/Dailies/DailySequencing.cs     (FindPendingClosureBefore transitivo; FindPreviousWeekly removida)
backend/src/Focadu.Application/Dailies/StartOrResumeDailyUseCase.cs
backend/src/Focadu.Application/Dailies/GetTodayUseCase.cs     (so comentario)
backend/src/Focadu.Application/Courses/Dtos.cs                (WeeklyOverviewDto.IsLocked)
backend/src/Focadu.Application/Courses/GetCourseDetailUseCase.cs
backend/tests/Focadu.Tests/Weeklies/WeeklyTests.cs
backend/tests/Focadu.Tests/Dailies/DailySequencingTests.cs
backend/tests/Focadu.Tests/TestHelpers/DailyFixtures.cs       (BackdateCompletion)
frontend/src/api/types.ts                                     (WeeklyOverviewDto.isLocked)
frontend/src/routes/CourseDetailPage.tsx
frontend/src/routes/TodayPage.tsx                             (so texto)
docs/ARQUITETURA.md, CLAUDE.md, docs/fase-55/resumo-implementacao-fase-55.md (este arquivo)
```

## Testes

- `dotnet test`: 397 aprovados, 0 falhas (eram 392: −2 de `FindPreviousWeekly` removidos, +3 de cota em
  `WeeklyTests`, +4 de regra transitiva em `DailySequencingTests`). O CI não roda 76 testes (as classes
  `CuratedContentAllFilesTests` e `CertificationCoverageFileTests`, que dependem de `secret/`; ver o
  `--filter` em `.github/workflows/ci.yml`), então lá devem aparecer 321.
- **Checagem por mutação:** voltando a conclusão do reforço a consumir a cota, 2 testes novos ficam
  vermelhos; voltando a trava a olhar só a semana imediatamente anterior, 2 ficam vermelhos. Os dois
  arquivos foram restaurados e conferidos byte a byte.
- `tsc -b` limpo (pegou um parâmetro `index` que sobrou no `CourseDetailPage`; removido). `oxlint` nos
  arquivos alterados: só o aviso `set-state-in-effect` que já existe em `TodayPage` na `main`.
- **Ponta a ponta, em ambiente descartável** (Postgres temporário restaurado do estado atual do banco ao
  vivo + backend novo com chave JWT própria; tudo apagado depois, inclusive o dump):
  - estado real (projeto da semana 1 pendente): trilha com `S1` livre e `S2`…`S12` trancadas;
  - semana 1 fechada, Dia 5 concluído "ontem" e **só o reforço concluído hoje**: `GET /api/today` →
    `accessMode = 0` (Daily 6 liberada) e `POST .../start` → 200; trilha toda livre;
  - regra transitiva: semana 1 volta a `Pending` com a **semana 2 toda concluída e fechada**:
    `GET /api/today` → `accessMode = 5` apontando para a semana 1 (não segue para a Daily 11);
    `POST .../start` da 1ª Daily da semana 3 → 409 `projeto_semana_anterior_pendente`; trilha com `S1`
    livre e `S2`, `S3`, `S4`… trancadas (a `S2` inclusive, embora fechada).
- **Não testei no navegador**; as telas foram validadas por `tsc`, lint e pelo contrato da API acima.

## Dúvidas ou pontos abertos para a próxima fase

- **O `UPDATE` da Daily 6 continua pendente** (ver `docs/fase-54/`). Sem ele o reforço ainda é recusado
  com `daily_em_andamento`; esta fase não o resolve nem o altera.
- **Push pendente** para esta fase (a Fase 54 já foi enviada por outra sessão). O deploy faz
  `git reset --hard origin/main` no diretório de trabalho.
- `WeeklyDetailPage` (semana aberta direto pela URL) não mostra aviso de "semana trancada"; clicar numa
  Daily dela cai no aviso do 409. Trancar a página exigiria expor `IsLocked` também em `WeeklyDetailDto`.
- O destaque de "semana atual" na trilha (`findCurrentWeekId`) continua ignorando semanas com todas as
  Dailies feitas; com o projeto pendente nenhuma semana é destacada (mesmo comportamento que já existia
  para a publicação pendente).
