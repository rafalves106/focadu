# Resumo — Fase 1: Dominio e Schema (Backend .NET)

## O que foi implementado

- Solucao `.NET 10` em 5 projetos, arquitetura hexagonal (Ports & Adapters) + DDD:
  `Focadu.Domain`, `Focadu.Application`, `Focadu.Infrastructure`, `Focadu.Api`, `Focadu.Tests`.
  `Domain` sem nenhuma dependencia de EF Core ou infraestrutura - C# puro.
- Todas as entidades de dominio da especificacao: `Course`, `Monthly`, `Weekly`, `Daily`,
  `DailyActivity`, `ActivityResponse`, `QuizOption`, `RoleplayNode`, `RoleplayOption`,
  `CuratedContent`, `WeeklyProject`, `WeeklyReinforcement`. Todas com construtores
  privados/controlados e mutacao so via metodos de negocio (sem setters publicos soltos).
- `EvaluationPolicy` centralizando as 3 constantes de negocio: `PassingScore` (80),
  `DailyPenaltyThreshold` (3), `WeeklyWeakDaysThreshold` (2).
- Regras de negocio codificadas no dominio:
  - Calculo de `ActivityResponse.Passed` a partir do `Score` (`>= PassingScore`).
  - `Daily.PenaltyPoints` incrementando a cada resposta reprovada, so na "rodada valendo"
    (antes da primeira conclusao) - repeticoes (replay) nunca geram penalidade nova.
  - Disparo de Daily de reforco (`IsReinforcement = true`) ao atingir 3 pontos de penalidade,
    copiando so as atividades que tiveram ao menos uma resposta reprovada.
  - Disparo de `WeeklyReinforcement` ao acumular 2 "dias fracos" na mesma Weekly, sem
    contar duas vezes dias ja cobertos por um reforco anterior.
  - Regra completa de acesso a uma Daily (`Weekly.EvaluateDailyAccess`): bloqueio de Daily
    futura, bloqueio de segunda Daily "InProgress" no mesmo dia, replay livre de Daily de hoje
    ja concluida, e replay voluntario de Daily de dia anterior so quando nao ha nada
    "InProgress" no momento (sempre restrito a mesma Weekly, estruturalmente).
- Interfaces de repositorio (ports) no `Domain`: `ICourseRepository`, `IMonthlyRepository`,
  `IWeeklyRepository`, `IUnitOfWork`.
- Ports de servico externo no `Application` (sem implementacao, so stubs para os testes/DI
  futura): `IContentEvaluationService`, `IAudioTranscriptionService`. Mais `IClock`, usado para
  tornar testavel a nocao de "hoje" nas regras de acesso.
- 3 casos de uso na `Application`: `StartOrResumeDailyUseCase`, `SubmitActivityResponseUseCase`
  (dispara reforco diario/semanal quando aplicavel), `CompleteDailyUseCase`.
- Implementacoes Postgres/EF Core no `Infrastructure`: `FocaduDbContext`, 12
  `IEntityTypeConfiguration` (uma por entidade), `CourseRepository`, `MonthlyRepository`,
  `WeeklyRepository` (carrega o grafo completo da Weekly), `UnitOfWork`, `SystemClock`
  (implementacao real de `IClock`), `FocaduDbContextFactory` (design-time, para `dotnet ef`).
- Migration inicial (`InitialCreate`) criando o schema completo no Postgres, incluindo a tabela
  associativa `WeeklyReinforcementWeakDailies` com FK real para `Dailies`.
- `Focadu.Api`: composicao de DI (`AddFocaduApplication` + `AddFocaduInfrastructure`) e 4
  endpoints minimos (`/health`, iniciar Daily, submeter resposta, concluir Daily) - so para
  provar que a composicao funciona ponta a ponta, sem desenhar a API real.
- `docker-compose.yml` na raiz, subindo Postgres 16 local para desenvolvimento.
- 21 testes unitarios xUnit no `Focadu.Tests`, todos passando.

## Decisões técnicas tomadas que não estavam no prompt original

Quatro decisoes foram levantadas explicitamente ao Falves antes de implementar (via pergunta
direta), porque afetariam varios arquivos se erradas:

1. **Estrategia de Id**: `Guid` gerado no dominio (nao `int` auto-incremento do banco) -
   confirmado pelo Falves.
2. **Persistencia de `WeeklyReinforcement.WeakDailyIds`**: tabela associativa com FK real para
   `Daily` (nao jsonb/array solto) - confirmado pelo Falves. Implementado com um tipo `internal
   WeakDailyLink` dentro do proprio `WeeklyReinforcement.cs`, existindo so para o EF Core
   mapear; a API publica do dominio continua expondo so `IReadOnlyCollection<Guid>`.
3. **Quais atividades copiar no reforco diario**: qualquer `DailyActivity` com pelo menos 1
   resposta reprovada na Daily de origem (nao so a ultima tentativa) - confirmado pelo Falves.
4. **Semantica de repetir uma Daily**: reaproveitar as mesmas linhas de `DailyActivity`, com o
   historico de tentativas todo em `ActivityResponse.AttemptNumber` (nao clonar a Daily inteira
   a cada repeticao) - confirmado pelo Falves.

Outras decisoes tomadas sem perguntar (por serem detalhes de implementacao com baixo risco de
retrabalho, ou por terem uma resposta razoavelmente obvia dado o resto da especificacao):

- Enums persistidos como `string` no Postgres, nao `int` default - mais legivel em queries
  manuais.
- Todas as navegacoes (colecoes e referencias unicas) do modelo EF configuradas globalmente
  para usar acesso via campo privado (`PropertyAccessMode.Field`) em `OnModelCreating`, porque
  todas as entidades expoem so `IReadOnlyCollection<T>`/getters sem setter publico, de
  proposito (mutacao so via metodo de negocio).
- Propriedades computadas (`HasEverCompleted`, `IsWeakDay`, `HasFailedAtLeastOnce`,
  `WeakDailyIds`) explicitamente marcadas `Ignore(...)` nas configurations do EF, para nunca
  virarem coluna por engano.
- `DailyActivity.ContentId -> CuratedContent` com `OnDelete: SetNull` (perder a referencia ao
  conteudo curado nao pode apagar em cadeia o historico de respostas da atividade).
- `RoleplayOption.NextNodeId -> RoleplayNode` com `OnDelete: Restrict` (evita apagamento em
  cadeia dentro do proprio grafo de dialogo).
- `Daily.Start()` nao valida a data - so `Weekly.EvaluateDailyAccess`/`StartOrResumeDaily`
  checam "hoje", porque so a Weekly enxerga as Dailies irma. Decisao de camada: mantem `Daily`
  testavel isoladamente, mas significa que o unico caminho "seguro" para abrir uma Daily e
  sempre passar pela Weekly (o que a Application ja faz).
- `Daily.ReinforcementTriggered` (flag booleana nova, nao pedida explicitamente na
  especificacao) para impedir que a mesma Daily dispare mais de uma Daily de reforco se o
  usuario continuar errando depois de passar dos 3 pontos de penalidade, dentro da mesma
  sessao.
- `Weekly.ShouldTriggerWeeklyReinforcement()` usa os ids ja cobertos por reforcos anteriores
  para nao contar os mesmos dias fracos duas vezes, caso a regra seja avaliada mais de uma vez.
- `IClock.Today()` usa hora local do servidor (nao UTC) - "hoje" segue o dia de calendario
  vivido pelo usuario. Os timestamps de auditoria (`CreatedAt`, `CompletedAt`, `TriggeredAt`)
  continuam em UTC. Essa mistura e intencional, mas vale reconfirmar se o app crescer para
  multiplos fusos horarios.
- `Focadu.Api` recebeu so 4 endpoints minimos (nao um design completo de API), por entender que
  desenho de API e um prompt tecnico separado - o objetivo aqui era provar que a composicao de
  DI funciona.
- Credenciais do Postgres no `docker-compose.yml` e na connection string default
  (`focadu`/`focadu`) sao so para desenvolvimento local, nunca para producao.

## Estrutura de arquivos criada

```
Focadu.slnx
docker-compose.yml
.gitignore
docs/
  ARQUITETURA.md
  CONVENCOES.md
  fase-1/resumo-implementacao-fase-1.md
src/
  Focadu.Domain/          (Common, Exceptions, Policies, Enums, Courses, Monthlies, Weeklies,
                            Dailies, Activities, Content, Repositories)
  Focadu.Application/     (Ports, Dailies/*UseCase.cs + Dtos.cs, DependencyInjection.cs)
  Focadu.Infrastructure/  (Persistence/Configurations, Persistence/Repositories,
                            Persistence/Migrations, Services, DependencyInjection.cs)
  Focadu.Api/              (Program.cs, appsettings*.json)
tests/
  Focadu.Tests/            (Dailies, Weeklies, Policies, TestHelpers)
```

Arvore completa e comentada em `docs/ARQUITETURA.md`.

## Testes

21 testes unitarios xUnit em `Focadu.Tests`, todos passando (`dotnet test` -> `Aprovado: 21,
Com falha: 0`). Cobertura:

- **Calculo de `Passed`**: 4 casos (`SubmitActivityResponse_CalculatesPassedFromScore`, scores
  0/79/80/100) confirmando o corte em 80.
- **Historico de tentativas**: `SubmitActivityResponse_NeverOverwritesPreviousAttempts` -
  multiplas tentativas na mesma atividade nunca se sobrescrevem.
- **Penalidade**: `SubmitActivityResponse_FailingResponses_IncrementPenaltyPoints`.
- **Reforco diario**: `ShouldTriggerDailyReinforcement_BecomesTrue_AtThreePenaltyPoints`,
  `CreateDailyReinforcement_OnlyClonesActivitiesThatFailed_AndMarksSourceAsTriggered`,
  `CreateDailyReinforcement_Throws_WhenPenaltyThresholdNotReached`.
- **Replay sem penalidade**: `Replay_AfterFirstCompletion_NeverAddsNewPenalty`.
- **Reforco semanal**: `ShouldTriggerWeeklyReinforcement_BecomesTrue_AtTwoWeakDailies`,
  `TriggerWeeklyReinforcement_Throws_WhenThresholdNotReached`,
  `ShouldTriggerWeeklyReinforcement_DoesNotDoubleCountDaysAlreadyCovered`.
- **Acesso a Daily** (`EvaluateDailyAccess`): bloqueio de Daily futura, Start liberado para hoje
  nao iniciada, bloqueio de segunda Daily InProgress no mesmo dia, replay de Daily de hoje
  concluida, replay voluntario de Daily passada quando nada esta InProgress, read-only de Daily
  passada quando ha algo InProgress, read-only de Daily passada nunca concluida.
- **Sanidade de policy**: `EvaluationPolicyTests.Thresholds_MatchSpecification` (80/3/2).

O que **nao** foi testado nesta fase: a camada `Application` (casos de uso) e a camada
`Infrastructure` (repositorios EF, mapeamento real) nao tem testes automatizados ainda - so
foram validadas por build bem-sucedido e pela geracao da migration (que exige o EF montar o
modelo inteiro com sucesso). Nao houve teste de integracao contra um Postgres real rodando (ver
secao de pontos abertos).

## Dúvidas ou pontos abertos para a próxima fase

- **Docker nao disponivel no ambiente desta sessao**: o schema foi validado gerando a migration
  e revisando o SQL resultante manualmente, mas nunca testado contra um Postgres real via
  `docker compose up` + `dotnet ef database update`. Recomendo rodar isso manualmente antes de
  confiar 100% no schema, e sinalizar aqui se algo precisar de ajuste.
- **Arquivos de scaffolding do `dotnet new` nao puderam ser apagados**: `Class1.cs` (em
  `Focadu.Domain`, `Focadu.Application`, `Focadu.Infrastructure`) e `UnitTest1.cs` (em
  `Focadu.Tests`) continuam no repositorio, esvaziados (so um comentario) - a permissao de
  delete de arquivo foi bloqueada nesta sessao. Vale remove-los manualmente quando possivel.
- **Sem conceito de usuario no dominio**: nenhuma entidade tem `UserId` (nem `Course`). Isso foi
  intencional para esta fase (usuario fixo/hardcoded, unico usuario-teste), mas se uma fase
  futura precisar de multi-usuario real, e uma mudanca de schema que toca varias entidades - vale
  decidir isso cedo se estiver no roadmap.
- **Timing de desbloqueio de Daily (`Locked` -> `Available`)**: o dominio tem o metodo
  `Daily.Unlock()`, mas nada dispara isso automaticamente ainda (nenhum scheduler/cron). Hoje,
  `Daily.Start()` aceita tanto `Locked` quanto `Available` como ponto de partida, entao isso nao
  bloqueia nada na pratica - mas se o produto quiser um desbloqueio "as X da manha" ou
  condicionado a Daily anterior concluida, isso precisa ser desenhado (provavelmente na camada
  Application/Infrastructure, via job agendado).
- **Mistura de fuso horario**: `IClock.Today()` usa hora local, mas timestamps de auditoria
  (`CreatedAt`, `CompletedAt`, `TriggeredAt`) usam UTC. Funciona bem para um unico
  usuario/servidor no mesmo fuso, mas merece atencao se isso mudar.
- **Design da API real**: os 4 endpoints atuais sao so uma prova de composicao, nao um desenho
  de API (sem validacao de request, sem DTOs de erro padronizados, sem autenticacao). Se a
  proxima fase for a API/Frontend, esse desenho precisa acontecer.
- **`IContentEvaluationService` / `IAudioTranscriptionService`**: existem so como interface, sem
  nenhuma implementacao nem registro no container de DI. A proxima fase que tratar de voz/IA
  provavelmente implementa esses adapters e os registra em `Focadu.Infrastructure`.
