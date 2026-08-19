# Resumo — Fase 4: Autoria de Conteúdo, Conclusão da Daily e Telas Restantes

## O que foi implementado

**Parte 0 — Commit pendente e convenção**

- O trabalho inteiro da Fase 3 (backend + frontend) estava com `git status` sujo - commitado
  agora num único commit (`feat: fase 3 - ...`).
- `docs/CONVENCOES.md` atualizado: fechamento de fase agora é explicitamente 3 passos (resumo +
  `ARQUITETURA.md` + commit), não 2. Documentado também que o commit de fechamento não precisa de
  confirmação separada a cada vez - é parte do próprio fechamento.

**Parte 1 — Autoria de conteúdo curado**

- `POST /api/curated-content` e `PUT /api/curated-content/{id}` (`CreateCuratedContentUseCase`,
  `UpdateCuratedContentUseCase`, novo namespace `Focadu.Application.Content`). `Type` é string
  (`"Reading"/"Video"/"Diagram"`, case-insensitive) no request - mais legível pra quem cura
  conteúdo manualmente do que o número que a Api usa nas respostas de leitura.
- `CuratedContent` ganhou `Update(title, externalUrl, bodyText)` no domínio (antes só existia o
  construtor - não havia nenhuma forma de mutar um `CuratedContent` já criado).
- `IWeeklyRepository.GetCuratedContentByIdAsync` - busca direta, sem carregar o grafo completo da
  Weekly (mesmo padrão de `GetByDateAsync`, adicionado na Fase 2).
- As 4 leituras da Semana 1 tiveram o texto completo carregado via `PUT /api/curated-content/{id}`
  (script Python usando `urllib`, descartado após o uso - os textos já estão no banco).

**Parte 2 — Conclusão da Daily no frontend**

- `POST .../complete` agora devolve `CompleteDailyResult` (não mais só `DailyStateDto`): inclui
  `dailyReinforcementTriggered`/`reinforcementDailyId` e
  `weeklyReinforcementTriggered`/`weeklyReinforcementId`. O reforço, quando existe, já foi
  disparado *antes* (durante alguma `SubmitActivityResponse` anterior, resposta a resposta) - o
  `complete` só reporta o estado final, não recalcula nada.
- `Daily.ReinforcementDailyId` (Guid?, nova coluna) - fecha um buraco que existia desde a Fase 1:
  `Daily.ReinforcementTriggered` virava `true`, mas não havia como descobrir *qual* Daily de
  reforço foi gerada a partir dela. `Weekly.CreateDailyReinforcement` agora grava esse link.
- `/hoje`: botão "Concluir sessão" aparece quando todas as atividades da Daily já têm resposta.
  Tela de conclusão (`CompletionSummary`) mostra reforço diário (com link direto pra sessão de
  reforço) e reforço semanal (com link pra tela da semana), quando disparados.
- `/hoje?daily=` - parâmetro opcional novo na mesma rota (não uma rota nova), usado só pra
  reaproveitar toda a tela de estudo ao navegar pra uma sessão de reforço recém-gerada.

**Parte 3 — Telas de WordMatch, Cloze e Roleplay**

- **WordMatch**: modelagem confirmada com o Falves antes de implementar (ver seção de decisões) -
  1 termo por `DailyActivity` (`Prompt` = termo, `QuizOptions` = definições candidatas). O
  frontend agrupa todas as `DailyActivity` WordMatch da mesma Daily numa única tela de associação.
- **Cloze**: `MultipleChoice` reaproveita o mesmo mecanismo de opção (`SelectedOptionId`) de
  Quiz/WordMatch. `FreeText` (código): campo de texto livre + campo de justificativa (armazenada,
  sem avaliação de IA), comparado no servidor contra `ExpectedAnswer`.
- **Roleplay**: navegação 100% client-side pelo grafo (todos os nodes/opções já vêm no
  `DailyActivityDto`); só ao atingir um node terminal é que o frontend envia
  `SelectedRoleplayNodeId`, e o Score é calculado a partir do `TerminalQuality` alcançado.
- **Score no servidor para todo tipo de atividade** (fecha de vez a lacuna que a Fase 3 deixou
  aberta só pra Cloze/Roleplay - `SubmitActivityResponseUseCase.ResolveScore` agora cobre os 4
  tipos, e o campo `Score` sumiu do contrato de request: não há mais nenhum caminho onde o
  cliente manda uma nota pronta).
- Seed estendido: 2 `DailyActivity` WordMatch (Dia 2), Cloze/MultipleChoice + Cloze/FreeText
  (Dia 3), Roleplay com árvore de 3 níveis e os 3 valores de `TerminalQuality` (Dia 4).

## Decisões técnicas tomadas que não estavam no prompt original

1. **Modelagem do WordMatch confirmada com o Falves antes de implementar** (a ambiguidade que o
   prompt já antecipava): o schema atual (`DailyActivity.Prompt` + N `QuizOption`, exatamente 1
   correta) só modela "1 termo com várias definições candidatas", não "vários termos simultâneos
   com pares independentes" numa única atividade. Confirmado: 1 termo = 1 `DailyActivity`
   WordMatch (exatamente o que o comentário original de `QuizOption`, desde a Fase 1, já
   descrevia) - zero mudança de schema, reaproveita 100% `ResolveScore` de Quiz. A alternativa
   (schema novo com pares reais numa única atividade) foi descartada por escopo bem maior sem
   ganho de UX real.
2. **`Score` removido do contrato de `POST .../responses`.** Depois que Cloze/FreeText (comparação
   textual) e Roleplay (`TerminalQuality`) ganharam cálculo de Score no servidor, não sobrou
   nenhum tipo de atividade que ainda precisasse de `Score` vindo do cliente - mantê-lo teria
   reaberto exatamente a brecha de segurança que a Fase 3 fechou pra Quiz/WordMatch (cliente podia
   mandar `score: 100` pra qualquer atividade).
3. **Cloze/FreeText: comparação textual simples (trim + case-insensitive), sem IA.** Documentado
   como simplificação deliberada (`SubmitActivityResponseUseCase.ScoreFromFreeTextAnswer`) - upgrade
   natural é `IContentEvaluationService`, quando existir um adapter concreto.
4. **Mapeamento `TerminalQuality` → Score no Roleplay, decidido nesta fase**: Ideal = 100 (único
   que passa do `PassingScore` de 80), Suboptimal = 60, Poor = 20 - dá pra diferenciar "quase lá"
   de "resposta ruim" no histórico, mesmo os dois reprovando.
5. **`Justification` como campo novo em `ActivityResponse`** (não reaproveitar `AiFeedback`, que é
   semanticamente "feedback da IA sobre a resposta", não "justificativa do próprio usuário"). O
   texto da resposta em si (Cloze/FreeText) reaproveita `Transcript`, que já existia desde a Fase 1
   com esse propósito genérico ("o que o usuário respondeu", voz ou texto).
6. **`/hoje?daily=` como parâmetro opcional, não uma rota nova.** Deep-link pra uma sessão de
   reforço precisa de toda a mesma lógica de `/hoje` (buscar, iniciar se necessário, andar pelas
   atividades, concluir) - criar uma rota irmã duplicaria a tela inteira. `DailyView` (Fase 3, em
   `/start?...&daily=`) continua sendo o modo *somente leitura*; `/hoje?daily=` é o modo
   *interativo* pra uma Daily específica.
7. **Bug de UX descoberto e corrigido durante a verificação ao vivo no navegador**: a última
   atividade de cada sessão (ou o último termo de um grupo WordMatch) tinha seu feedback
   engolido - o componente pai trocava de tela assim que os dados atualizavam, sem o usuário ter
   tempo de ver "Acertou!"/"Errou" antes de já estar na tela seguinte. Corrigido com um "pino" de
   passo atual (`TodayPage`'s `Step` state) que só avança quando o usuário clica "Continuar" -
   nunca automaticamente ao reagir a uma resposta refetchada. Não fazia parte do prompt original,
   mas sem isso a Parte 3 não estaria de fato "funcionando de ponta a ponta" (o próprio critério
   de aceite pedido).
8. **`Daily.ReinforcementDailyId` como coluna nova** (não tentar inferir a Daily de reforço por
   heurística, ex: "a última `IsReinforcement=true` criada"). O prompt pedia pro backend "ajustar
   o DTO... se ainda não expõe essas informações" - decidi que a forma correta de expor isso era
   guardar o link de verdade no domínio, não fingir com uma busca frágil.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/
  Activities/ActivityResponse.cs        (alterado: + Justification)
  Activities/DailyActivity.cs           (alterado: RecordResponse + justification, AddQuizOption aceita Cloze/MultipleChoice)
  Activities/QuizOption.cs              (alterado: comentario atualizado)
  Content/CuratedContent.cs             (alterado: + Update)
  Dailies/Daily.cs                      (alterado: + ReinforcementDailyId, SubmitActivityResponse + justification)
  Weeklies/Weekly.cs                    (alterado: CreateDailyReinforcement grava ReinforcementDailyId)
  Repositories/IWeeklyRepository.cs     (alterado: + GetCuratedContentByIdAsync)

backend/src/Focadu.Application/
  Content/CreateCuratedContentUseCase.cs   (novo)
  Content/UpdateCuratedContentUseCase.cs   (novo)
  Shared/ContentDtos.cs                     (novo: CuratedContentDto movido de Weeklies/Dtos.cs)
  Dailies/Dtos.cs                       (alterado: + Justification, + CompleteDailyResult)
  Dailies/SubmitActivityResponseUseCase.cs  (reescrito: ResolveScore cobre os 4 tipos)
  Dailies/CompleteDailyUseCase.cs       (reescrito: retorna CompleteDailyResult)
  DependencyInjection.cs                (alterado: + 2 novos use cases)
  Seed/SeedWebSecurityCourseUseCase.cs  (alterado: + WordMatch/Cloze/Roleplay nos Dias 2-4)

backend/src/Focadu.Infrastructure/
  Persistence/Configurations/ActivityResponseConfiguration.cs  (alterado: + Justification)
  Persistence/Configurations/DailyConfiguration.cs              (alterado: + ReinforcementDailyId FK)
  Migrations/20260819013849_Fase4SchemaChanges.cs               (nova migration)

backend/src/Focadu.Api/
  Contracts/CuratedContentRequests.cs   (novo)
  Contracts/SubmitActivityResponseRequest.cs  (alterado: - Score, + SelectedRoleplayNodeId, + Justification)
  Program.cs                            (alterado: + 2 endpoints de curated-content)
  Focadu.Api.http                       (atualizado)

backend/tests/Focadu.Tests/
  Dailies/SubmitActivityResponseScoreTests.cs  (reescrito: cobre os 4 tipos)
  Dailies/DailyTests.cs                 (alterado: + assert ReinforcementDailyId)

frontend/src/
  api/types.ts                          (alterado: + Justification, + CompleteDailyResult, consts pra ActivityStatus/AnswerMode/TerminalQuality)
  api/client.ts                         (alterado: SubmitActivityResponseBody novo shape, completeDaily retorna CompleteDailyResult)
  components/OptionsAnswer.tsx          (novo, substitui QuizActivity.tsx - reaproveitado por Quiz/WordMatch/Cloze-MultipleChoice)
  components/ClozeFreeTextActivity.tsx  (novo)
  components/RoleplayActivity.tsx       (novo)
  components/CompletionSummary.tsx      (novo)
  components/Layout.tsx                 (alterado: + ActivityScreen)
  routes/TodayPage.tsx                  (reescrito: orquestra os 4 tipos + fluxo de conclusao)

docs/
  CONVENCOES.md                         (alterado: fechamento de fase = 3 passos)
  ARQUITETURA.md                        (atualizado)
  fase-4/resumo-implementacao-fase-4.md (este arquivo)
```

## Testes

**Backend (unitários, xUnit):** 44 testes passando (37 herdados da Fase 3 + 7 novos/reescritos em
`SubmitActivityResponseScoreTests` cobrindo Cloze/MultipleChoice, Cloze/FreeText - normalização e
ausência de resposta -, e Roleplay - os 3 valores de `TerminalQuality`, node não encontrado, node
não terminal -, mais 1 assert novo em `DailyTests` confirmando `Daily.ReinforcementDailyId`).

**Validação end-to-end contra Postgres real** (banco resetado do zero mais de uma vez durante a
fase, pra testar o seed e os fluxos sempre a partir de um estado limpo):

- As 3 migrations (`InitialCreate`, `AddPromptToDailyActivity`, `Fase4SchemaChanges`) aplicam sem
  erro em sequência num banco novo.
- `POST /api/curated-content` e `PUT /api/curated-content/{id}` testados via `curl`: sucesso,
  `weekly_id_obrigatorio`, `tipo_invalido`, `conteudo_obrigatorio`, `semana_nao_encontrada`,
  `conteudo_nao_encontrado`, `titulo_obrigatorio` - todos com o status/código esperado.
- As 4 leituras da Semana 1 carregadas de ponta a ponta via `PUT` (script Python descartável),
  confirmado no banco (`length(BodyText)` batendo com o texto original).
- Fluxo de reforço diário testado via `curl`: 3 respostas erradas seguidas na mesma atividade
  disparam `dailyReinforcementTriggered` na 3ª submissão; `POST .../complete` chamado depois
  reporta corretamente o mesmo `reinforcementDailyId`, mesmo o gatilho tendo acontecido antes.
- **Frontend verificado ao vivo no navegador**, ponta a ponta, pros 4 tipos de atividade: Quiz,
  WordMatch (2 termos, cada um pontuando independente, botão "Continuar" combinado só depois dos
  2 respondidos), Cloze/MultipleChoice, Cloze/FreeText (resposta + justificativa, gabarito
  revelado), Roleplay (navegação em 2 níveis até um node terminal `Poor`, label "Fraco" exibido
  corretamente), fluxo de conclusão (`Concluir sessão` → `Sessão concluída!`) e o deep-link
  `/hoje?daily=` pra uma sessão de reforço real. Foi exatamente essa verificação ao vivo que
  revelou e permitiu corrigir o bug de UX descrito no item 7 da seção de decisões.

## Dúvidas ou pontos abertos para a próxima fase

- **Frontend ainda não tem tela de autoria de conteúdo** - os endpoints de `POST/PUT
  /api/curated-content` existem e foram usados via script/curl, mas não há UI no frontend pra
  cadastrar/editar conteúdo curado. Continua um fluxo "de bastidor" (curl/script), como o prompt
  desta fase já antecipava.
- **CORS ainda hardcoded pra `localhost:5173`** (pendência já registrada na Fase 3) - não mexido
  nesta fase.
- **`IContentEvaluationService` continua sem adapter concreto.** Cloze/FreeText usa comparação
  textual simples (sem IA); Roleplay usa o mapeamento fixo de `TerminalQuality`. Nenhum dos dois
  é uma "avaliação inteligente" de verdade - ambos documentados como simplificação deliberada.
- **Sem tela de resumo falado/microfone, menu de configurações ou captura de voz real** - segue
  fora de escopo, não mencionado nesta fase.
- **`GET /api/today` ainda pode ficar ambíguo se houver 2+ Dailies com a mesma Data na Weekly**
  (ex: uma Daily normal e uma Daily de reforço geradas no mesmo dia, já que
  `CreateDailyReinforcement` usa `IClock.Today()` como data) - `weekly.Dailies.First(d => d.Date ==
  today)` não tem ordem garantida nesse cenário. Não foi um problema prático nesta fase porque o
  link direto `reinforcementDailyId` (retornado por `POST .../complete`) permite navegar pra
  sessão de reforço sem depender de `/api/today` resolver "o dia certo" sozinho - mas a ambiguidade
  em si continua existindo no caso geral, e pode valer a pena revisitar numa fase futura.
- **Autoria de Course/Monthly/Weekly/Daily continua só via seed** (confirmado como fora de escopo
  no prompt desta fase - "é estrutural e muda com pouca frequência").
