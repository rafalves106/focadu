## Modelo de dominio

### Template vs Instancia (Fase 13)

Ate a Fase 12, o dominio era um curriculo unico e global: `Weekly`/`Daily` eram ao mesmo tempo
"o que existe" (estrutura) e "o progresso de alguem nisso" (so fazia sentido enquanto so havia 1
usuario). A partir da Fase 13, isso virou dois grafos separados, casados por Id:

```
TEMPLATE (curriculo, admin-authored - seed / futuramente /admin/conteudo, muda raramente)
Course (Draft/Active/Archived, Description)
└── Monthly (Number, Title)
    └── WeeklyTemplate (Number, Title, Theme, WeeklyProjectSpecText, WeeklyProjectBriefing, WeeklyProjectStateLines)
        ├── DailyTemplate (DayNumber, Language?)      [WeeklyTemplateId NULL = sintetico, ver reforco abaixo; Language = variante da ponte, Fase 69]
        │   └── DailyActivity (Type, OrderIndex, AnswerMode, Prompt?, ContentId?, ExpectedAnswer?)
        │       ├── QuizOption (Text, IsCorrect)                  [Quiz, Cloze/MultipleChoice]
        │       ├── WordMatchPair (Term, DefinitionId, Definition)     [WordMatch, Fase 23]
        │       └── RoleplayNode (NodeKey, Text, IsTerminal, TerminalQuality?)  [Roleplay]
        │           └── RoleplayOption (Text, NextNodeId?)
        └── CuratedContent (Type, Title, ExternalUrl?, BodyText?)

INSTANCIA (progresso por usuario, criada na matricula - EnrollUserInCourseUseCase)
User (Email, PasswordHash, DisplayName, Interests, AdditionalProfileNotes, ProfileCompletedAt)
└── Enrollment (UserId, CourseId, EnrolledAt)
    └── Weekly (EnrollmentId, WeeklyTemplateId, StartDate)  [Number/Title/Theme/MonthlyId = pass-through pro Template]
        ├── Daily (WeeklyId, DailyTemplateId, DayNumber, Date, Status, IsReinforcement,
        │         PenaltyPoints, ReinforcementDailyId?)     [Activities = pass-through pro Template]
        │   └── ActivityResponse (ActivityId [aponta pro DailyActivity template], AttemptNumber,
        │                          Score, Passed, Transcript?, CorrectedTranscript? [Fase 39],
        │                          Justification?, AiFeedback?)
        ├── WeeklyProject (Status, SubmissionUrl?)          [1:1 com Weekly - SpecText fica no Template]
        ├── WeeklyReinforcement (TriggeredAt, WeakDailyIds)
        └── ModulePublication (Status, Platform?, SubmittedUrl?, GeneratedDraft?,
                                ValidationError?)            [1:1 com Weekly, Fase 11 - criada sob demanda]
```

**Por que `ActivityResponse` mudou de dono.** Antes da Fase 13, `ActivityResponse` pertencia a
`DailyActivity` (fazia sentido: so existia 1 instancia global). Com `DailyActivity` virando
curriculo compartilhado por N usuarios matriculados, isso pararia de fazer sentido - uma unica
lista de respostas compartilhada por todo mundo. `ActivityResponse` agora pertence a `Daily`
(instancia), so referenciando `ActivityId` (o `DailyActivity` que ela responde) - `AttemptNumber`
conta dentro do `_responses` da propria Daily-instancia. O indice unico no banco precisou incluir
o dono (`DailyId`, shadow property) alem de `(ActivityId, AttemptNumber)` - sem isso, o 2º usuario
a responder a mesma `DailyActivity` colidiria com o `AttemptNumber = 1` do 1º (bug pego em design,
verificado ao vivo com 2 usuarios reais que nao colidem - ver `docs/fase-13a/`).

**Reforco diario e `DailyTemplate` "sintetico".** Reforco (Fase 4) gera atividades novas, por
usuario, copiadas da Daily de origem - nunca foi curriculo real. Em vez de dar a `DailyActivity`
uma 2ª FK opcional, `DailyTemplate.WeeklyTemplateId` e **nullable**:
`DailyTemplate.CreateSynthetic(dayNumber)` cria um DailyTemplate orfao (nunca adicionado a
nenhuma `WeeklyTemplate.DailyTemplates`) so pra guardar as atividades clonadas daquele reforco
especifico. Assim toda `Daily`-instancia sempre tem exatamente 1 `DailyTemplateId` (curricular ou
sintetico) e todo `DailyActivity` sempre pertence a exatamente 1 `DailyTemplate` - nenhum
consumidor (`daily.Activities`, mappers, use cases) precisa saber a diferenca.

`Weekly` (instancia) continua o **aggregate root operacional**: e ele quem concentra as regras de
negocio que precisam comparar Dailies entre si (acesso a Daily passada/futura, reforco diario,
reforco semanal) - migrou praticamente inalterada do antigo `Weekly` (rename + split de dados
estruturais), so trocando a fonte dos campos curriculares (`Number`/`Title`/`Theme`/`MonthlyId`
viraram pass-through computados pra `Template`, nunca duplicados). `IWeeklyRepository` carrega o
grafo completo TEMPLATE+INSTANCIA fundido (Dailies com seus DailyTemplate.Activities.QuizOptions/
RoleplayNodes/Options + Responses, WeeklyTemplate.CuratedContents, WeeklyProject,
WeeklyReinforcements, ModulePublication) - `AsSplitQuery()` novo na Fase 13, a fusao dos dois
grafos ficou grande demais pra um JOIN unico sem risco de explosao cartesiana. `GetByIdAsync`/
`GetByDailyIdAsync` agora recebem `userId` e filtram pela Enrollment dona na propria query -
ver "Autenticacao" abaixo.

`IWeeklyTemplateRepository` (novo) e o lado leitura do curriculo (usado pela autoria de
`CuratedContent`, `/admin/conteudo`) - sem filtro de usuario, curriculo e compartilhado.
`ICourseRepository.GetFullTemplateGraphAsync` (novo) carrega o grafo TEMPLATE completo (ate
`DailyTemplate.Activities.QuizOptions/RoleplayNodes`) - so `EnrollUserInCourseUseCase` precisa
disso; `GetByIdAsync`/`GetAllAsync` continuam mais rasos (so `Monthlies.WeeklyTemplates`,
estrutural) pras leituras mais leves (`ListCoursesUseCase`, `GetCourseDetailUseCase`).

**`User` (Fase 12) ganhou `Enrollment` (Fase 13)** - `IEnrollmentRepository`, UserId+CourseId
unico (checado na Application antes de criar + indice unico no banco, mesmo padrao de
`email` unico). `EnrollUserInCourseUseCase` e o unico jeito de criar instancias
(`Weekly`/`Daily`/`WeeklyProject`) - sem matricula, nao ha progresso pra ver. Ver "Matricula"
abaixo pro fluxo completo.

**`DailySequencing` (Application/Dailies, Fase 38b) substitui `Weekly.GetDailyByDate(date)` (Fase
5, removido):** resolve "qual Daily vem a seguir" cruzando TODAS as Weeklies da matricula
(`FindNext` = a Daily nao-reforco de menor `DayNumber` ainda nao concluida; `FindInProgress` =
qualquer Daily `InProgress` em qualquer Weekly, sempre prioridade). Reforco continua de fora da
sequencia principal por construcao (`FindNext` filtra `!IsReinforcement`) - acesso a ela e sempre
via link explicito (`Daily.ReinforcementDailyId`), nunca pelo atalho "/hoje". Ver "Acesso a uma
Daily" e "GET /api/today" abaixo pro motivo da troca (`Daily.Date` fixado na matricula nunca
acompanhava o ritmo real do aluno).

**`DailyActivity.Prompt` (Fase 3):** enunciado/pergunta da propria atividade (pergunta do Quiz,
contexto do Cloze/Roleplay) - sempre visivel ao cliente (nunca redigido, e o que o usuario precisa
ler pra responder). Faltava na Fase 1: so existiam `QuizOption` (as opcoes) e `ExpectedAnswer`
(gabarito do Cloze), sem nenhum campo pra guardar o texto da pergunta em si. Descoberto ao
escrever o seed de conteudo real da Fase 3 e confirmado com o Falves antes de mexer no schema -
ver `docs/fase-3/resumo-implementacao-fase-3.md`. WordMatch (Fase 23) normalmente nao usa este
campo - o "enunciado" e o proprio conjunto de `WordMatchPair`, ver abaixo.

**WordMatch: reforma completa do contrato na Fase 23 (revisita a decisao da Fase 4, ver
`docs/fase-9/resumo-implementacao-fase-9.md` pra por que ficou pendente ate aqui).** Ate a Fase
21: 1 termo = 1 `DailyActivity`, `Prompt` era o termo e `QuizOptions` eram as definicoes
candidatas (exatamente 1 correta) - o mesmo mecanismo de Quiz, reaproveitado; varias
`DailyActivity` WordMatch na mesma `Daily` formavam, juntas (so do ponto de vista do frontend), um
unico exercicio - cada termo continuava pontuando/penalizando independente pro dominio. A partir
da Fase 23, 1 `DailyActivity` WordMatch guarda o grupo de pares INTEIRO
(`DailyActivity.WordMatchPairs`, ver `WordMatchPair`) - submetido/pontuado de uma vez so
(`SubmitActivityResponseUseCase.ScoreFromWordMatchMatches`), nao mais 1 `ActivityResponse` por
termo. Pontuacao e parcial (percentual de pares certos, arredondado), nao tudo-ou-nada - reusa o
mesmo `EvaluationPolicy.PassingScore` (80) de qualquer outra atividade pra decidir `Passed`, entao
grupos pequenos (2-3 pares) na pratica exigem acertar quase tudo e grupos maiores (4+) toleram 1
erro, sem precisar de uma regra separada. `WordMatchPair.DefinitionId` e um Guid DELIBERADAMENTE
separado do `Id` do proprio par (que identifica o termo) - se o termo e a definicao saissem pro
cliente com o mesmo id, a correspondencia (o gabarito) vazaria so de olhar o JSON, sem jogar (ver
`DailyStateMapper`, que tambem embaralha a ordem das definicoes a cada carga pelo mesmo motivo).
Reforco (`CloneForReinforcement`) clona a atividade inteira, todos os pares - nao ha
granularidade menor que "o grupo todo" (mesma logica de "reforco nao clona so a alternativa
errada" do Quiz). `docs/fase-23/resumo-implementacao-fase-23.md` tem o detalhe completo.

**`Daily.ReinforcementDailyId` (Fase 4):** Guid? preenchido junto com `ReinforcementTriggered`
(`Weekly.CreateDailyReinforcement` grava o Id da Daily de reforco recem-criada na Daily de
origem). Antes da Fase 4, `ReinforcementTriggered` virava `true` mas nao havia como descobrir
*qual* Daily foi gerada a partir dela sem heuristica - agora e um link direto.

**`ActivityResponse.Justification` (Fase 4):** texto livre opcional, pedido no Cloze/FreeText
antes de revelar se a resposta esta certa - so armazenado, sem avaliacao de IA. Distinto de
`Transcript` (que carrega a resposta em si, seja ela transcrita de voz ou digitada) e de
`AiFeedback` (feedback vindo de uma avaliacao de IA sobre a resposta).

**`ActivityType.VoiceSummary` (Fase 5):** resumo falado sobre um `CuratedContent`. Diferente dos
outros 4 tipos: `ContentId` e **obrigatorio** na criacao (`DomainException` senao - e o texto de
referencia que a IA usa pra avaliar), `Prompt` e a instrucao ("Explique com suas palavras..."), e
nunca usa `QuizOption` nem `ExpectedAnswer` - a resposta e sempre `ActivityResponse.Transcript`
(a transcricao do audio), com `Score`/`AiFeedback` vindos inteiramente da avaliacao por IA (ver
"Score no servidor" abaixo). `AnswerMode` usado pro seed e `FreeText` (nao ha nocao de multipla
escolha pra um resumo falado).

**`ActivityType.Reading`/`Video` (Fase 7):** etapas de consumo de um `CuratedContent` - mesma regra
de `ContentId` obrigatorio do `VoiceSummary` (generalizada em `DailyActivity.ctor`), mas sem
avaliacao nenhuma: concluir a etapa e o proprio "acerto". `SubmitActivityResponseUseCase.
ResolveScore` sempre devolve 100 pra esses dois tipos - a `ActivityResponse` e gravada pelo mesmo
`Daily.SubmitActivityResponse`/`ActivityResponseRecorder` que os outros 4 tipos usam (mesma tabela,
mesmo pipeline de conclusao), so que nunca reprova (Score 100 >= `PassingScore`), entao nunca soma
`PenaltyPoints` nem dispara reforco. O request de `POST .../responses` pra esses tipos vai vazio
(nenhum campo de `SubmitActivityResponseRequest` e usado). Preencheu a lacuna que existia desde a
Fase 3: antes so havia tela pras atividades avaliaveis, nunca pro texto/video em si.

### Gamificacao: Gems e Streak (Fase 14, Bonus de Superacao na Fase 15)

Primeira fase real de gamificacao - ate aqui, todo elemento de Gems/Streak que apareceu nos
designs do Figma (Fases 8, 9, 13b) foi deliberadamente descartado por nao ter dado real por
tras. Dois aggregates novos, ambos **1:1 com `User`, criados sob demanda (lazy)** - nunca no
registro (`RegisterUserUseCase` continua sem tocar neles), so na primeira conclusao que gera
Gems/streak:

```
Focadu.Domain.Gamification
UserGemBalance (UserId, TotalGems, GemsFromDailiesThisMonth, GemsFromWeekliesThisMonth,
                GemsFromMonthlyThisMonth, CurrentMonthPeriod)
UserStreak (UserId, CurrentStreak, LongestStreak, LastCompletedDate?, LastRestDate?, BrokenAt?)
```

**Gems**: +1 por Daily completa pela primeira vez, +5 por Weekly perfeita (`Weekly.IsPerfect()` -
`IsModuleComplete()` e nenhuma Daily original com `PenaltyPoints > 0`), +30 por Monthly perfeito
(todas as `WeeklyTemplates` do Monthly com Weekly-instancia perfeita). Cap mensal **por
categoria** (20/20/30 = 70 no total), resetado quando o mes calendario (`Year`/`Month` de
`IClock.Today()`) muda - `UserGemBalance.CreditDaily/CreditWeekly/CreditMonthly` devolvem quanto
foi creditado de verdade (0 se o cap da categoria ja foi atingido nesse mes). Nunca expira,
acumula indefinidamente.

**Streak**: dias consecutivos com pelo menos 1a conclusao de Daily no dia (`CompleteDailyUseCase`
so chama `RegisterCompletion` na 1a conclusao - replay nunca conta, nem soma nem quebra). Ate a
Fase 38b isso era condicionado a `Daily.Date == hoje` (comparando com o calendario hipotetico
fixado na matricula) - removido: uma 1a conclusao so pode mesmo acontecer "agora" (a acao e
sincrona), entao a checagem so servia pra parar de contar o streak de quem estivesse fora do
ritmo assumido na matricula, o mesmo bug de fundo do atalho "/hoje" (ver "GET /api/today" abaixo).
"Quebrar por inatividade" e deteccao de AUSENCIA de
evento, nao presenca - sem job/cron no projeto (mesmo principio ja usado pra `DailyStatus.Locked`,
resolvido sob demanda comparando datas no momento do acesso). Resolvido em 2 pontos:
`RegisterCompletion` reinicia a contagem (em vez de incrementar) se detectar que ja tinha
quebrado antes desta conclusao; `CurrentStreakAsOf(today)` (usado em toda LEITURA) nunca precisa
esperar uma escrita futura pra reportar `0`. A 1a leitura que observa a quebra marca `BrokenAt` e
**zera o `CurrentStreak` persistido** (desde 23/09/2026 - antes o valor antigo ficava ate a proxima
conclusao, e depois do `acknowledge-broken` a leitura seguinte remarcava a quebra: o aviso "Streak
Perdido" voltava a cada abertura da tela de start).

**Folga movel e pausa (Fase 69, substituiu a tolerancia de "1 dia util").** O curso deixou de seguir
o calendario (semana de 6 Dailies, secret/rascunhos/ofensiva-conta-trabalho-no-projeto.md):
- **Folga movel**: a ofensiva quebra com 2 dias sem estudo dentro de qualquer janela de 7. 1 dia sem
  estudo e coberto pela folga, gasta sozinha e sem acumular - `LastRestDate` guarda o dia coberto
  (gravado na conclusao seguinte; a leitura so consulta) e ela volta 7 dias depois
  (`UserStreak.IsRestAvailableOn`).
- **Pausa**: `RegisterCompletion`/`CurrentStreakAsOf` recebem `IReadOnlyCollection<StreakPause>` e
  ignoram os dias dentro delas (nem quebram nem gastam a folga). `StreakPauseWindows` (Application)
  calcula na hora, a partir das Weeklies de todas as matriculas do aluno: do dia seguinte a conclusao
  da ultima Daily original de uma semana ate a semana fechar (projeto `Evaluated` + publicacao
  `Validated`, que e quando a proxima semana libera - `WeeklyProject.EvaluatedAt`/
  `ModulePublication.ValidatedAt`), no maximo 14 dias. Qualquer projeto aberto pausa, de qualquer
  curso (decisao do dono). Projeto avaliado antes da Fase 69 nao tem `EvaluatedAt` - a pausa dele nao e
  reconstruida (ja passou).
- `GamificationSummaryDto` ganhou `StreakPausedUntil` (ultimo dia da pausa que cobre hoje) e
  `StreakRestAvailable`; o `AgentCard` da tela de start mostra os dois.

**Onde a decisao mora - por que nao nos hooks `Daily.OnFirstCompleted`/`OnReplayCompleted`.**
Esses hooks (`protected virtual`, ja existiam desde a Fase 4, propositalmente vazios) pareciam o
ponto de entrada natural, mas `Daily` nao tem acesso a `UserGemBalance`/`UserStreak` (aggregates
diferentes - dar a `Daily` um repositorio quebraria a arquitetura hexagonal), e o projeto **nao
tem nenhum mecanismo de Domain Events** (confirmado - nenhuma fase anterior introduziu esse
padrao). Resolvido na camada de aplicacao (`CompleteDailyUseCase`), a abordagem mais simples que
ja se encaixa no estilo do projeto - os hooks continuam vazios, sem uso.

**`GamificationCreditor` - por que credita em 2 lugares diferentes.** `Weekly.IsPerfect()` so
fica `true` quando AMBAS as condicoes batem: todas as Dailies completas E o projeto avaliado
(`IsModuleComplete()`). No fluxo tipico (confirmado na propria verificacao ao vivo da Fase 13a:
"concluir a Daily -> submeter e avaliar o projeto"), o projeto e avaliado **depois** de todas as
Dailies - ou seja, o evento que de fato "fecha" a Weekly costuma ser a avaliacao do projeto, nao a
ultima Daily. Um `GamificationCreditor` extraido (`Focadu.Application.Gamification`) e chamado a
partir de `CompleteDailyUseCase` **e** de `EvaluateWeeklyProjectUseCase` - qualquer um dos dois
pode ser quem observa `IsPerfect()` virar `true` pela primeira vez, dependendo da ordem que o
aluno segue. Seguro contra credito duplicado: `WeeklyProject.Evaluate()` ja rejeita ser chamado
2x (`DomainException` se `Status != Submitted`), e uma Daily so tem "primeira conclusao" uma vez -
entao, pra qualquer Weekly, so existe 1 momento em que `IsPerfect()` vira `true` pela primeira
vez, nao importa qual dos 2 chamadores observa esse momento (verificado ao vivo, ver "Testes"
abaixo).

**Bonus de Superacao (Fase 15).** Concluir uma Daily de reforco (`IsReinforcement`) com **todas**
as atividades aprovadas (`Daily.AllActivitiesPassed()` - usa a tentativa MAIS RECENTE de cada
Activity, nunca a primeira, permitindo corrigir por retry) credita
`UserGemBalance.CreditReinforcementBonus` (`EvaluationPolicy.ReinforcementBonusGems = 2`) **em vez
de** `CreditDaily` normal (nunca os dois juntos) - substitui, nao soma. Um reforco concluido sem
sucesso total continua ganhando o credito normal de Daily (so sem o bonus) - "reforco nunca gera
penalidade adicional, so deixa de dar o bonus". A categoria/cap e a MESMA de Dailies normais
(`GemsFromDailiesThisMonth`, 20/mes) - de proposito, pra nao criar uma 4a categoria de cap so pra
isso. Isso expos um caso que `UserGemBalance.Credit` (privado, compartilhado pelas 4 chamadas
publicas desde a Fase 15) precisou passar a **clampar** em vez de tudo-ou-nada: com 2 valores
diferentes (+1 Daily, +2 bonus) na mesma categoria, um usuario a 19/20 no mes pode legitimamente
receber so +1 de um bonus de +2 (nunca estourar o cap por 1) - antes da Fase 15, os 3 valores
(1/5/30) sempre dividiam exatamente os proprios caps (20/20/30), entao tudo-ou-nada e clamping
davam o mesmo resultado; a partir de agora nao dariam mais.

**`WeeklyReinforcement.IsResolved(dailies)`/`Weekly.HasPendingWeeklyReinforcement()` (Fase 15) -
so leitura, nao mudam a logica de disparo existente (Fase 4).** Um `WeeklyReinforcement` (2+ dias
fracos) esta "atendido" quando toda Daily fraca que o disparou (`WeakDailyIds`) ja tem sua Daily
de reforco (`Daily.ReinforcementDailyId`) com `Status == Completed`. `WeeklyReinforcement` nao
navega pra `Daily` diretamente (so guarda `Guid`s) - `IsResolved` recebe a colecao `Weekly.Dailies`
de quem chama como parametro. Usado so pro indicador visual "Revisao semanal disponivel"
(`WeeklyReinforcementBadge`, sem bloquear nada).

**Conta-giros de penalidade (Fase 15) - sem node Figma.** O "conta-giros" nunca apareceu desenhado
no inventario original de telas - reaproveitada a linguagem visual ja estabelecida (`ProgressBar`,
Fase 8: trilho + preenchimento arredondado), so com a cor subindo por faixa de risco em vez de uma
tonalidade fixa por chamador (`PenaltyHeaderBadge`, `components/gamification/` - ate a Fase 35 era
`PenaltyGauge`, ver "Fase 36" na secao Frontend): neutro (0) -> amarelo (1) -> laranja (2,
`--color-project`) -> vermelho (limite atingido, `--color-alert`). Alimentado pelo
`PenaltyPoints`/`PenaltyThreshold` que ja vem no `DailyStateDto` - nenhum dado novo do backend so
pra isso, so exibicao.

### Score de Estudo e Ranking (Fase 16)

Diferenca fundamental de Gems: Gems recompensam CONSISTENCIA (concluir - Fase 14), Score
recompensa QUALIDADE (o quao bem). Um usuario pode ter Gems altas (estuda todo dia) e Score baixo
(entende mal), e vice-versa - as duas metricas convivem sem se misturar.

**Composicao (tudo calculado sob demanda, nunca persistido - mesmo padrao ja estabelecido pra
`DailyStatus`/`Weekly.Number` desde a Fase 13a, reforcado explicitamente no prompt desta fase):**

```
Daily.CalculateScore()   = media ponderada de ActivityResponse.Score (tentativa MAIS RECENTE de
                            cada Activity avaliavel) - pesos em EvaluationPolicy.ActivityScoreWeight:
                            VoiceSummary 2x, Roleplay 1.5x, Cloze 1.5x, Quiz/WordMatch 1x.
                            Reading/Video excluidos (sempre 100, ruido artificial). Dailies de
                            reforco (IsReinforcement) SEMPRE null - ja tem recompensa propria em
                            Gems (Bonus de Superacao, Fase 15); contar no Score incentivaria errar
                            de proposito pra "score duplo".

Weekly.CalculateScore()  = 0.7 * media(Daily.CalculateScore() das Dailies originais) +
                            0.3 * WeeklyProject.Score - null enquanto o modulo nao esta completo
                            (mesmo criterio de IsModuleComplete()) - NUNCA um score parcial de
                            semana em andamento (evita rankear quem ainda esta no meio da semana
                            como se tivesse tirado nota zero).

Score do Course (Ranking) = soma cumulativa (snowball) de Weekly.CalculateScore() de cada Weekly
                            completa da Enrollment - so no escopo "course" (ver abaixo).
```

**Tela do Ranking em pixel art (Fase 73, Figma "Ranking — v2", nodes 133:4503/134:6707).** "Placar de
fliperama": podio com os 3 primeiros (agente de frente em cima dos blocos) + recorte e a regra do Score
a esquerda; a direita o placar HIGH SCORE (top 10, mini agente, linha pontilhada, 1º em ambar, a linha
do aluno em verde com cursor) e os cartoes "Proximo alvo" e "Como subir". Quem esta fora do top 10
aparece preso no pe do placar, depois de "· · ·". `RankingResultDto` ganhou `AheadEntry` (quem esta
logo acima do aluno, mesmo fora do top 10 - `GetCourseRankingUseCase.EntryAhead`), `TotalEntries`,
`CurrentWeekNumber` e `CurrentWeekScored`: com o recorte Semana e a semana do aluno ainda aberta, a
tela avisa que ela so entra no placar quando o projeto for avaliado (decisao tomada na implementacao:
manter o recorte e avisar, em vez de trocar por "semana passada"). `RankingEntryDto` ganhou `Look`
(`AgentLookDto`, `Application/Shared/AgentLooks.cs`, o mesmo do QG do Squad), preenchido tambem no
ranking do squad.

**`WeeklyProject` ganhou `Score`/`Feedback`.** Antes da Fase 16, `WeeklyProject.Evaluate()` nao
tinha parametro nenhum (so aprovar por status). Passou a exigir `Evaluate(int score, string?
feedback)` - `score` (0-100) alimenta 30% do Score da Weekly; `feedback` so armazenado, sem uso em
calculo nenhum. Continua sem UI propria (app nao tem papel de "revisor").

**Fase 21: avaliacao automatica por IA.** `score`/`feedback` deixaram de vir do corpo da requisicao
(nao ha mais chamador humano decidindo a nota) - `EvaluateWeeklyProjectUseCase` busca o conteudo do
repositorio publico via `IGitHubService.GetContentSnapshotAsync` (Git Trees API recursiva + leitura
de cada blob - o codigo de verdade, nao so nomes de arquivo/README; filtrado por extensao e
limitado em quantidade/tamanho pra caber no prompt, ver `GitHubService.CodeExtensions`/`MaxFiles`/
`MaxTotalChars`) e pede pro Groq (`IProjectEvaluationService`/`GroqProjectEvaluationService`, port a
parte de `IContentEvaluationService` por ter prompt proprio) comparar contra
`WeeklyTemplate.WeeklyProjectSpecText`. `POST /api/weeklies/{weeklyId}/project/evaluate` (voltou a
ser `POST` sem corpo, era `PUT {score,feedback}` na Fase 16) - so funciona se `SubmissionUrl` for
um repositorio GitHub (parseado por `GitHubUrlParser`, compartilhado com `SubmitPublicationUseCase`);
outros formatos (ex: link do LinkedIn) nao tem conteudo pra IA analisar.

**Ranking - 3 recortes, "Weekly"/"Monthly" por POSICAO no curriculo, nao calendario real
(decisao confirmada com o usuario).** Como cada Course tem 1 curriculo compartilhado mas cada
Enrollment se matricula em dias diferentes, "a semana atual" de um aluno pode cair numa data bem
diferente da de outro - comparar por posicao relativa (ex: "semana 1 de cada um") e o que faz um
ranking justo, sem exigir nenhuma logica de corte por calendario:

- `course`: soma TODAS as Weeklies completas da Enrollment (snowball completo, sem depender de
  posicao nenhuma) - o unico recorte "definitivo".
- `monthly`: soma as Weeklies completas que pertencem ao MESMO Monthly da "Weekly atual" da
  Enrollment.
- `weekly`: so o Score da "Weekly atual" da Enrollment.
- **"Weekly atual"** (`GetCourseRankingUseCase.ResolveCurrentWeekly`): a de maior `Number` que ja
  tem ao menos 1 `Daily` datada em hoje-ou-antes (mesmo criterio de "hoje" que `GetTodayUseCase`/
  `EvaluateDailyAccess` usam no resto do app) - cai pra Weekly de menor Number se nenhuma comecou
  ainda (defensivo).
- **Weekly incompleta conta como `0` no ranking (nunca `null`)** - unica excecao deliberada ao
  "nunca mostrar score parcial": um ranking PRECISA de um numero ordenavel; "ainda nao pontuou
  neste recorte" e razoavelmente `0` aqui, diferente do aviso que vale pras telas de progresso do
  proprio usuario (`Weekly.CalculateScore()` continua `null` em qualquer outro contexto).

**`GetCourseRankingUseCase`**: busca todas as `Enrollment` do Course (`IEnrollmentRepository.
GetByCourseIdAsync`, novo), calcula o Score de cada uma no recorte pedido, ordena decrescente
(empate: quem matriculou primeiro), devolve os 10 primeiros + a posicao real do usuario chamador
(mesmo se fora do top 10 - `CurrentUserEntry` so e `null` se o chamador nao tem Enrollment neste
Course). `ComputeScore`/`ResolveCurrentWeekly`/`RankEntries` sao `internal static` e testados
direto, sem repositorio nenhum (mesmo padrao de `SubmitActivityResponseUseCase.ResolveScore`).

**Tela: `RankingPage` (Fase 16, tela 13 do inventario original - finalmente ganha funcao real).**
Ancorada em `CourseDetailPage` ("🏆 Ver Ranking"), de proposito - o Documento Mestre original ja
dizia "ranking fica ancorado na visualizacao global do Course, pra nao distrair o aluno durante a
Daily". `/start?course=&ranking=1` (mais um flag na query string do `/start`, mesmo padrao de
`?project=`).

### Marketplace de Cosmeticos, Troféus/Badges e Indicação (Fase 17)

Fecha o ciclo economico da gamificacao - Gems (Fase 14) finalmente tem onde ser gastas. Sem node
Figma validado pra "Loja de Cosmeticos"/"Perfil — Conquistas" ainda (confirmado com o usuario) -
cor por raridade (Comum=cinza, Raro=azul, Epico=roxo) como placeholder visual, sem ilustracao
nenhuma, mesma paleta escura/neon ja estabelecida.

```
Focadu.Domain.Cosmetics
CosmeticItem (Name, Slot, Rarity, PriceGems, AssetUrl?, IsAnimated=false) - catalogo fixo, seed
UserCosmeticInventory (UserId, CosmeticItemId, AcquiredAt) - posse permanente, "sem usar e perder"
UserEquippedCosmetics (UserId, EquippedFrameId?, EquippedNameColorId?, EquippedBannerId?) - 1:1
                        com User, lazy - Equip(slot, itemId) so sobrescreve o campo do slot
                        (desequipa o anterior automaticamente, sem passo separado)

Focadu.Domain.Referrals
Referral (ReferrerUserId, ReferredUserId, CreatedAt, ConfirmedAt?) - Confirm() idempotente
```

**`UserGemBalance.TrySpend`** (novo) - gasto NUNCA mexe nos contadores mensais de cap
(`GemsFromDailiesThisMonth`/etc): caps controlam quanto se GANHA por mes, nao quanto se pode
GASTAR do saldo acumulado - sistemas independentes de proposito.

**Marketplace - toda acao devolve o catalogo inteiro recalculado.** `GetMarketplaceCatalogUseCase`
monta `MarketplaceCatalogDto` (Owned/Equipped ja resolvidos por item) e e reaproveitado por
`Purchase`/`Equip`/`UnequipCosmeticItemUseCase` - cada um so muda o estado e delega a leitura de
volta, pra nunca duplicar a montagem do DTO em 4 lugares. `PurchaseCosmeticItemUseCase` reaproveita
`GamificationCreditor.GetOrCreateGemBalanceAsync` (Fase 14) - mesmo criterio de "so cria a linha
quando precisa mexer nela de verdade".

**Fase 71 - agente em pixel art, roupas e vitrine semanal.** A cor-por-raridade placeholder acima
saiu: `RARITY_STYLE` usa a paleta pixel (Comum metal, Raro verde, Epico ambar, Lendario vermelho) e a
Loja vende roupas do agente em pixel art. Regras decididas pelo dono em
`secret/rascunhos/loja-raridade-e-vitrine.md`.

```
CosmeticSlot   + Top, Bottom, Hair, Shoes (camadas do agente; ordem da pilha: Bottom, Shoes, Top, Hair)
CosmeticRarity + Legendary (reservada pra pets/auras/animados)
CosmeticItem   + Code? (chave do sprite "<slot>/<peca>", indice unico filtrado) + IsStarter (kit basico)
               IsSoldInShop = Code != null && !IsStarter
UserEquippedCosmetics + EquippedTopId?/BottomId?/HairId?/ShoesId? + SkinTone? (1-5; nulo = sem agente)
               Top/Bottom/Shoes nunca ficam vazios (IsRequiredSlot) - Unequip lanca
AgentStarter   KitCodes (moletom, calca, tenis) + NaturalHairCodes (curto, longo, black-power)
ShopShowcase   Draw(catalogo, ownedBeforeWeek, userId, hoje) - ate 6 itens, deterministico
```

- **Agente**: `CreateAgentUseCase` (pele + kit basico + 1 cabelo natural opcional, gratis, uma vez so;
  entra no inventario e sai equipado) e `UpdateAgentSkinToneUseCase` (troca livre). Roupa so se equipa e
  se compra com o agente criado (409 `agente_nao_criado`).
- **Vitrine**: sorteio por usuario + semana ISO (FNV-1a + Mulberry32, estavel entre versoes do .NET),
  renova toda segunda (`WeekStart`), pesos 60/30/9/1 renormalizados entre as raridades com item elegivel,
  >= 2 Comuns, <= 2 por slot, so `IsSoldInShop`. "Ja tem" = adquirido antes da segunda
  (`OwnedBeforeWeek`): comprar durante a semana nao muda a vitrine (senao seria um rerolar). Sem rerolar.
  `PurchaseCosmeticItemUseCase` recusa item com Code fora da vitrine (409 `item_fora_da_vitrine`) e peca
  do kit (409 `item_do_kit_basico`). Os 8 itens da Fase 17 (sem Code) ficam fora do sorteio ate o redesenho.
- **`MarketplaceCatalogDto`** ganhou `Agent` (`{ SkinTone }` ou nulo), `ShowcaseItemIds` (ordem do
  sorteio) e `ShowcaseRenewsOn` (proxima segunda); `CosmeticItemDto` ganhou `Code` e `IsStarter`.
- **Seed** (`SeedCosmeticCatalogUseCase`): os 8 itens legados so num banco vazio; as pecas em pixel art por
  Code, inserindo so as que faltam (leva nova = linha nova + seed, que o deploy ja roda).
- **Frontend**: folhas de sprite 192x48 por camada em `assets/pixel/personagem/` (5 vistas 32x32 + 12
  quadros mini 16x16), geradas por `secret/curadoria/scripts/personagens/exportar-frontend.js`;
  `lib/agentSprites.ts` + `components/agent/AgentSprite.tsx` recortam por `background-position` em escala
  inteira. Ver `docs/fase-71/`.

**Sistema de Indicacao - confirmado so na matricula, nunca no registro.** Todo `User` ganha um
`ReferralCode` unico (8 caracteres, alfabeto sem `0/O/1/I` pra evitar confusao visual), gerado
lazy na 1a consulta (`GetReferralInfoUseCase`, unicidade checada contra o repositorio antes de
atribuir). `POST /api/auth/register` aceita `referralCode` opcional - se corresponder a um User de
verdade, cria um `Referral` AINDA NAO confirmado (codigo invalido/de ninguem so e ignorado,
silenciosamente, nunca bloqueia o registro). A confirmacao de verdade (`ConfirmedAt`) so acontece
em `EnrollUserInCourseUseCase` - prova de uso real (o indicado de fato se matriculou), nao so
cadastro vazio. `/login?ref=CODIGO` (deep link) pula a `LoginPage` direto pra aba de registro e
preenche `referralCode` automaticamente.

**Troféus/Badges - tudo calculado sob demanda, nada persistido** (mesmo principio ja usado desde a
Fase 13a pra `DailyStatus`/`Weekly.Number`). `GetUserBadgesUseCase` le `UserStreak.LongestStreak`,
conta `Weekly.IsPerfect()` do historico (todas as Enrollments do usuario), indicacoes confirmadas
(`Referral.ConfirmedAt != null`) e posicao de registro (`IUserRepository.
IsAmongFirstRegisteredAsync`, ordem total deterministica por `(CreatedAt, Id)` pra nunca empatar
ambiguamente). O nucleo (`ComputeBadges`) e `internal static`, testado direto com os 4 numeros ja
resolvidos - mesmo padrao de `SubmitActivityResponseUseCase.ResolveScore`/`GetCourseRankingUseCase.
ComputeScore`. 5 badges, `code` estavel (`streak_7`/`streak_30`/`easy_weekly`/`embaixador`/
`founder`) - label/icone/descricao/meta sao so apresentacao no frontend (`lib/badgeInfo.ts` desde a
Fase 70; era o `BadgeGrid`).

**Onde Badges/ReferralCard moram.** `/conquistas` era rota propria (`AchievementsPage`) nesta fase -
virou a aba "Conquistas" do Perfil na Fase 18 (`/conquistas` agora so redireciona).
`MarketplacePage` (`/loja`) acessivel clicando no `GemBadge` do header do `StartDashboard` (ficou
clicavel nesta fase).

**Aplicacao visual dos cosmeticos equipados** ficou pra Fase 18 (cor do nome no Ranking, moldura no
avatar do header) - esta fase so constroi comprar/equipar/guardar estado.

### Perfil, 3 Abas (Fase 18)

Fase de consolidacao - nenhum sistema novo, so compoe dado que ja existia (`GetGamificationSummaryUseCase`/
`GetUserBadgesUseCase`/`GetReferralInfoUseCase`/`GetMarketplaceCatalogUseCase`/`User.Interests`,
Fases 14-17). `/perfil`, abas via query string `?tab=info|customizacao|conquistas|squad` (default
`info` - mesmo padrao de `/start?weekly=`). **Fase 24: 4a aba "Squad"** adicionada (decisao tomada
olhando `ProfileTabs.tsx` na hora - as 3 abas existentes sao leitura+acao pontual sobre o proprio
usuario, Squad tem fluxo proprio de criar/entrar/sair/remover + uma classificacao, entao ganhou aba
nova em vez de forcar dentro de Conquistas) - ver "Squad (Fase 24)" abaixo.

**Sem endpoint consolidado novo** (`GET /api/users/me/profile-summary` era opcional no prompt) -
`ProfilePage` faz `Promise.all([getGamification, getMarketplaceCatalog, getUserBadges,
getReferralInfo])` (Fase 70: badges e indicacao subiram pra pagina porque aparecem fora das abas) e a
ficha do agente busca cursos + ranking do curso ativo sozinha; so a aba Squad busca o proprio dado -
mais simples que orquestrar isso no backend pra uma tela que e so composicao de leitura.

**Pixel art (Fase 70, Figma "Perfil — redesign proposto", node 85:4502).** Mesma casca da sessao
diaria: a partir de `lg`, 3 colunas sem rolagem externa, cada uma com `ScrollArea` - esquerda a
**ficha do agente** (`AgentSheet`: avatar com moldura, nome na cor equipada, cursos, recorde, score e
posicao no curso ativo, vitrine das badges, atalhos pro ranking e Configuracoes), centro o cartao das
abas, direita a **Focada** (fala por aba; a do Squad vem do `SquadTab` via `onSay`, depende da
posicao/lideranca) e o **Indique um amigo** (`ReferralPanel`, saiu da aba Conquistas pra ficar sempre
visivel). Gems e streak viraram HUD no topo, no lugar do conta-giros da Daily. Abaixo de `lg`, tudo
empilhado com rolagem normal e abas em 2x2. Conquistas virou lista com barra em blocos ate a meta;
Squad mostra o selo LIDER pra todos e as acoes do dono ficam na linha de cada membro. Mock:
`npm run dev:mock` + `/perfil`, squad por `/__mock/squad?as=membro|lider|nenhum`.

**Fase 72 - "tela do agente" (Figma "Perfil + Squad — v2", node 120:4503; o dono nao gostou das
abas da Fase 70).** `/perfil` nao tem mais abas: a esquerda o **palco** (`AgentStage`: agente em 8x no
desktop largo e alto, 6x no resto, holofote e piso, os 4 slots do que esta vestindo - clicar abre o
guarda-roupa -, nome, curso ativo com a regiao e o progresso em blocos, "Trocar visual" e
Configuracoes); a direita, rolando por dentro a partir de `lg` (`ProfileCards`): ofensiva/score/
posicao/gems, **estante de trofeus** (era a aba Conquistas), atalho do QG do Squad, **ultimos 14 dias**
(`GET /api/users/me/study-calendar`) e **dossie** (era a aba Informacoes). Guarda-roupa
(`CustomizationTab`) e a lista de conquistas (`ConquestsTab`) viraram modais abertos por
`?abrir=guarda-roupa|conquistas`; os `?tab=` antigos continuam valendo (`tab=squad` redireciona pra
`/squad`). A Focada e o "Indique um amigo" sairam do Perfil (o segundo foi pro QG). A pagina busca
gamificacao, catalogo, badges, cursos e, do curso ativo, `GET /api/courses/{id}` (progresso/regiao) +
ranking; o atalho do squad e o calendario buscam o proprio dado. Mock: `npm run dev:mock` + `/perfil`.
**Sem rolagem nas telas de desktop comuns (ajuste da Fase 72, pedido do dono).** Duas variantes de
altura em `index.css`: `short:` (janela abaixo de 880px) e `tight:` (abaixo de 760px), sempre junto
com `lg:`. Elas compactam espacamentos, numeros e nichos, e o calendario vira uma linha de 14 dias.
Os cartoes usam 2 colunas ja a partir de `lg`. O agente fica em 8x/6x/5x (`useStageScale`, 5x e slots
de 56px entre 1024 e 1279px). Medido com Playwright: 1920x1080, 1536x864, 1440x900, 1366x768,
1280x800, 1280x720 e 1024x768 sem rolagem (pagina e coluna direita). No celular a pagina rola.

**`UserDto` ganhou `Interests`/`AdditionalProfileNotes`** (Fase 18) - a aba Informacoes le direto do
`user` do `AuthContext` (ja carregado via `GET /api/auth/me`), sem precisar de uma chamada nova.
`PUT /api/users/me/profile` (`CompleteProfileUseCase`) ja aceitava ser chamado de novo desde a Fase
13 (sem guarda de "so uma vez") - so faltava UI de edicao: `ProfileInterviewPage` ganhou `?edit=1`
(pre-popula com o que ja foi salvo, volta pro `/perfil` em vez de `/selecionar-curso` ao salvar, em
vez de virar uma tela nova).

**Fase 21: `Interests`/`AdditionalProfileNotes` finalmente usados em prompt de IA.** Desde a
Fase 13 o comentario em `User.cs` dizia "uso automatico em prompts de IA fica pra uma fase futura" -
essa fase e o primeiro uso: `GetCuratedContentUseCase`, ao servir uma leitura (`Reading` com
`BodyText`), gera (via `IAnalogyGenerationService`/`GroqAnalogyGenerationService`, port a parte pelo
mesmo motivo de `IProjectEvaluationService`) 1 analogia POR SECAO do texto, ligando aquela secao
especifica a um cenario que reproduza o mecanismo dela (um interesse do aluno so entra quando o
reproduz fielmente - Fase 47, abaixo) - a "ancora pra analogia" que `CURADORIA.md` previa.
Nao 1 analogia so cobrindo o texto inteiro (opcao mais simples, descartada durante o desenvolvimento
desta mesma fase - ficava perdida no fim de leituras longas, menos intuitivo que reexplicar cada
secao com a analogia dela): `GetCuratedContentUseCase.SplitIntoSections` divide o Texto Cru por titulo
`"#### ..."` (convencao 100% consistente nos 20 `dia-N.json` ja curados - `### Titulo` geral + N
subsecoes `####`), manda todas as N secoes numa unica chamada Groq (JSON mode, pede exatamente N
analogias na mesma ordem - nunca menos/mais, formato errado vira `ExternalServiceException`), e
`ReadingActivity.tsx` (frontend, `splitReadingSections` espelhando a mesma regex) intercala cada
secao com sua analogia (card "💡 PRA VOCÊ" logo abaixo) - a preamble (titulo geral + paragrafo de
abertura) fica sem analogia. Cacheado em `PersonalizedAnalogy` (aggregate com colecao owned
`AnalogySection`, `SectionIndex`+`Text` cada, tabela `PersonalizedAnalogySections` - mesmo padrao de
`WeeklyReinforcement`/`WeakDailyLink`) por `UserId`+`CuratedContentId` unico - gerado uma vez, nunca
reavaliado mesmo se o aluno editar os interesses (ou a leitura for editada, mudando o numero de
secoes) depois (mesmo principio de "nao reescrever historico" de `WeeklyProject.Feedback`). Sem
interesse nenhum cadastrado (perfil ainda nao completado, ou completado so com texto livre vazio -
`CompleteProfile` aceita isso), ou fora do tipo `Reading`, simplesmente nao gera nada - nunca
bloqueia a leitura em si; falha do Groq na geracao tambem so degrada pra "sem analogias dessa vez".

**Bug real, corrigido na Fase 38b:** o `SystemPrompt` de `GroqAnalogyGenerationService` nunca
pedia explicitamente "em portugues" (unico entre os adapters Groq do projeto - todos os outros
ja tinham essa instrucao) - `openai/gpt-oss-120b` ocasionalmente respondia em ingles, sobretudo
quando o interesse/hobby citado era um termo em ingles. Corrigido acrescentando a instrucao
explicita. Como `PersonalizedAnalogy` e gerado uma vez e nunca reavaliado (ver acima), uma
analogia ja cacheada em ingles antes deste fix continua em ingles ate o cache ser invalidado
manualmente (sem endpoint pra isso ainda - nao e o caso comum, avaliado como nao valer a pena
por ora).

**Fase 47: interesse do aluno virou opcional, prompt reescrito.** Feedback real: as analogias
saiam forcadas. O prompt original mandava "conecte um interesse do aluno ao conceito" e o modelo
inventava mecanica do hobby pra caber (ex: "lista de bans do CS" pra explicar OCSP, "convite/
confirmacao de partida do Valorant" pro handshake TCP); numa das rodadas de teste chegou a devolver
4 itens pra 3 secoes, que `ParseAnalogies` rejeita. `SystemPrompt` de `GroqAnalogyGenerationService`
agora manda: reproduzir o mecanismo elemento por elemento; usar o interesse SO quando isso for
verdade ("na duvida, nao use"); cair num cenario universal do cotidiano (correio, portaria, chaves,
cofres, filas...) nos demais casos; no maximo 3 frases curtas (~50 palavras); e traz um exemplo do
que nao fazer (handshake TCP explicado com a fila de uma partida de jogo) contra o que fazer
(ligacao telefonica). A mensagem do aluno passou a apresentar os interesses como opcionais e a
preferir cenario universal, e `temperature` caiu de 0.8 pra 0.4. Validado ao vivo contra a API real
do Groq antes de adotar (ver `docs/fase-47/`). So vale pras analogias geradas dali pra frente: o
cache `PersonalizedAnalogy` nao e reavaliado - pra regenerar uma leitura ja vista, apagar a linha
dela em `PersonalizedAnalogies` (as secoes, owned em `PersonalizedAnalogySections`, vao junto); sem
endpoint pra isso.

**Fase 48: guarda de idioma.** Logo apos o deploy da Fase 47 o modelo devolveu as 5 analogias do
dia 5 em INGLES (ja registrado na Fase 38b como comportamento ocasional de `openai/gpt-oss-120b`);
como o cache nunca e reavaliado, ficaria pra sempre. `GroqAnalogyGenerationService.ParseAnalogies`
agora rejeita a resposta se qualquer analogia parecer ingles (`LooksEnglish`: 3+ palavras funcionais
so do ingles E mais que as do portugues) com `ExternalServiceException("analogias_ia_idioma_invalido")`
- mesmo tratamento de JSON/contagem invalidos: nada e gravado, a leitura abre sem analogias dessa vez
e a proxima abertura tenta de novo. A mensagem do aluno tambem termina reforçando "em portugues do
Brasil". Sem retry automatico (uma 2a chamada custa ~3k tokens do limite gratuito de 8k/min do Groq).

**Fase 27: personalizacao estendida pra avaliacao de voz + rascunho de LinkedIn.** A Fase 21 so
cobria Leitura - `secret/MESTRE.md` secao 12 ainda listava "nenhum outro prompt de IA consome o
perfil" como pendencia (documento estava desatualizado nesse ponto, corrigido). Agora
`SubmitVoiceSummaryResponseUseCase` e `GenerateLinkedInDraftUseCase` tambem buscam `Interests`/
`AdditionalProfileNotes` do usuario (`IUserRepository.GetByIdAsync`) e repassam pro prompt -
`PersonalizationPromptBuilder` (`Focadu.Application.Shared`, publico ao contrario do resto da pasta
porque os adapters Groq moram em `Focadu.Infrastructure`) centraliza o texto da instrucao ("use
como analogia quando ajudar a explicar, sem forcar") pra nao duplicar a mesma frase nos 2
chamadores; retorna `null` sem interesses/notas, prompt fica identico ao de antes desta fase.
**Nunca entra no Score** - `GroqContentEvaluationService.BuildUserPrompt` injeta a instrucao so no
paragrafo de FEEDBACK, a nota continua vindo so de correcao/clareza (mesma garantia da Fase 4: nota
sempre recalculada no servidor, nunca influenciada por dado subjetivo do perfil).
`EvaluateWeeklyProjectUseCase` (avaliacao de projeto, mesmo `ContentEvaluationRequest`) foi deixado
de fora de proposito - decisao explicita, feedback sobre codigo nao ganha com analogia de hobby.
Sem teste dedicado pra `SubmitVoiceSummaryResponseUseCase`/`GenerateLinkedInDraftUseCase` (mesmo gap
ja documentado - "casos de uso simples... nunca tiveram teste dedicado", verificacao ao vivo);
`PersonalizationPromptBuilder.BuildInstruction` (a parte pura) tem teste dedicado
(`PersonalizationPromptBuilderTests`).

**Fase 30: diagramas de fluxo simples no Texto Cru - feedback do usuario de que texto corrido sem
referencia visual fica dificil de entender.** Extensao de convencao de markdown, sem nenhuma
mudanca de dominio/schema/migration (`BodyText` continua string livre - desde a Fase 13b nao ha UI
de autoria, tudo entra via skill `curar-conteudo` -> JSON -> seed). Um bloco cercado
` ```diagrama ` dentro do `BodyText` vira um diagrama de fluxo (`origem -> destino: rotulo` por
linha, ver `secret/curadoria/CURADORIA.md` secao 2.1); qualquer outro bloco cercado ` ``` ` vira
bloco de codigo monoespacado simples (bonus de baixo custo, mesma deteccao de fence). Frontend:
`lib/markdown.ts` ganhou `splitFences`/`stripFencedBlocks` (pre-passo pra isolar fences ANTES do
parser linha-a-linha de `MarkdownBlock.tsx`, que agora itera segmentos em vez do texto bruto) e
`parseDiagramSteps`/`DiagramStep` (parser do DSL, usado por `components/activities/
DiagramBlock.tsx` - layout unico de linhas empilhadas `[origem] -> [destino]`, cobre tanto
ping-pong entre 2 atores (three-way handshake TCP) quanto cadeia linear de N atores (resolucao
DNS), sem SVG). `ReadingActivity.tsx`: `wordCount` usa `stripFencedBlocks` antes de contar, pra
sintaxe do DSL nao inflar a estimativa de tempo de leitura. Backend: `GetCuratedContentUseCase`
ganhou `StripFencedBlocks` (internal static, mesmo padrao de `SplitIntoSections`), aplicado a cada
secao antes de montar o `AnalogyRequest` - o DSL de diagrama e ruido pro prompt da IA de
analogias, nao prosa explicavel; nao muda a quantidade de secoes, entao a correspondencia
secao<->analogia por indice e o cache em `PersonalizedAnalogy` continuam intactos. Prova de
conceito aplicada de verdade no Dia 1 (`semana-1/dia-1.json` - cadeia DNS + handshake TCP); os
outros 59 dias ficam como backlog (`CURADORIA.md` secao 4), retrofitados sob demanda via skill
nova `aplicar-elementos-visuais` (um dia por vez, nunca em lote - evita diagrama forcado num dia
sem sequencia real de atores). Ver `docs/fase-30/resumo-implementacao-fase-30.md`.

**Fase 31: mais 3 tipos de diagrama (`comparacao`/`camadas`/`partes`), alem do `sequencia` da Fase
30 - usuario pediu "tipos diferentes" depois de ver o primeiro funcionando.** So frontend mudou
(backend trata o bloco `diagrama` como texto opaco a stripar, independente do tipo por dentro -
`StripFencedBlocks` nao precisou de nenhuma mudanca). `lib/markdown.ts` ganhou
`parseDiagram(text): DiagramData` - dispatcher que le a 1a linha nao-vazia do fence (`tipo:
<nome>`); sem essa linha (retrocompatibilidade com os blocos da Fase 30), o tipo e `sequencia`.
`DiagramBlock.tsx` despacha pra 4 sub-componentes internos (`SequenceDiagram`/`ComparisonDiagram`/
`LayersDiagram`/`PartsDiagram`) + `EmptyDiagram` compartilhado - `comparacao` e um grid CSS 2
colunas (`esquerda | direita` por linha), `camadas` empilha caixas com indentacao crescente
(`marginInline` inline, proporcional ao indice), `partes` reaproveita o visual de pilula do
`sequencia` mas conectado por "+" em vez de "->" (composicao, nao causalidade). Prova de conceito
com 1 exemplo real de cada tipo novo: Dia 8 (`semana-2/dia-8.json`, `comparacao` - RBAC vs. ABAC),
Dia 56 (`semana-12/dia-56.json`, `camadas` - Defesa em Profundidade), Dia 1 ganhou tambem 1
`partes` (Anatomia da Requisicao HTTP). Ver `docs/fase-31/resumo-implementacao-fase-31.md`.

**`EquippedNameColor` no Ranking - token estavel, nao hex.** `GetCourseRankingUseCase` resolve, por
Enrollment, o `Name` do `CosmeticItem` equipado no slot `NameColor` (ex: "Verde Neon") e devolve em
`RankingEntryDto.EquippedNameColor`. O frontend mapeia token -> cor de verdade
(`lib/cosmeticStyle.ts`, `nameColorClass`) - mesmo padrao ja estabelecido de `BadgeDto.code` ->
label/icone (`BadgeGrid`) e `CosmeticRarity` -> swatch (`CosmeticItemCard`). Decisao: nenhum campo
de cor/hex foi adicionado ao dominio (`CosmeticItem` continua so com `Name`/`Slot`/`Rarity`) -
adicionar um "de verdade" seria inventar dado que a arte real (`AssetUrl`) ainda nao define.

**Avatar/moldura - so um placeholder, de proposito.** Escopo controlado (confirmado no prompt): sem
upload de foto/avatar de verdade. `EquippedFramePreview` (`components/`) mostra as iniciais do nome
num circulo, com um anel colorido por raridade (`RARITY_STYLE`, mesma cor do swatch da loja) quando
uma Moldura esta equipada - reaproveitado no cabecalho do Perfil (`ProfileHeader`) e no nav global
(`HeaderUserBadge`, unico jeito de chegar em `/perfil` pela UI - antes o app nao tinha nenhum lugar
mostrando o nome do usuario logado fora do Perfil).

**Divergencias deliberadas do Figma (3 nodes conferidos - Informacoes/Customizacao/Conquistas)** -
nenhuma tem dado real por tras, mesmo criterio ja usado em outras telas (ver `OnboardingWelcomePage`):
upload de foto, "Apelido/Username", "Sua frase de guerra" e toda a secao "Analogias de Aprendizado"
(preview de IA) nao existem no dominio - omitidos. Nivel/XP, "Sessoes completas" e Platinas por
curso (troféu por 100% de conclusao) tambem nao existem - Squad existe desde a Fase 24, mas
XP/Level/Elo/Patente continuam fora de escopo (nunca foram parte do pedido de Squad, ver secao
propria abaixo). "Recorde de Streak" do mockup virou dado real (`GamificationSummaryDto.longestStreak`).
O 4o grupo de customizacao do mockup ("Avatar", a ilustracao do personagem) nao existe como slot
compravel - so os 3 slots reais de `CosmeticSlot` (Moldura/Cor do Nome/Banner) aparecem na aba
Customizacao.

### Squad (Fase 24)

Grupo de usuarios com 1 dono (`Squad.OwnerUserId`) - 3 papeis existem (owner/co-leader opcional/
member, ver "Sucessao de lideranca" abaixo, Fase 24b), sem aprovacao de convite: quem tem o
`JoinCode` (8 caracteres, mesmo alfabeto sem `0/O/1/I` de
`ReferralCode` - `Focadu.Application.Shared.UniqueCodeGenerator`, extraido nesta fase e
reaproveitado pelos dois) entra direto. "1 squad ativo por usuario" e garantido em 2 camadas: a
Application checa antes de criar/entrar, e um indice unico em `SquadMemberships.UserId` garante no
banco - sair do squad e hard delete da linha (sem flag "inativo"), permitindo entrar em outro
squad depois.

`JoinCode` nasce nulo e e gerado lazy (mesmo padrao de `User.ReferralCode`/`GetReferralInfoUseCase`)
dentro de `GetSquadRankingUseCase` - nao ha endpoint dedicado "GET /squads/me": a consulta de
ranking ja devolve nome/codigo/classificacao/agregados numa unica chamada, dobrando de "tela
inicial do squad" pro frontend.

`Members` do ranking e paginado (`?page=`, 20 por pagina fixo - Fase 24c, squad nao tem cap de
tamanho) - agregados/`CurrentUserEntry` continuam sobre o squad inteiro, so a lista e cortada.

**Ranking do squad reaproveita `GetCourseRankingUseCase.ComputeScore`/`RankEntries`/
`RankingEntryDto` (Fase 16) direto** - mesmo principio de Score sempre computado sob demanda,
escopado por `RankingScope` (weekly/monthly/course). **Gems, ao contrario de Score, NUNCA
respeitam `scope`** - `UserGemBalance` (Fase 14) so guarda o saldo total + um contador "neste mes
calendario" (pro cap de ganho), sem historico por semana/posicao no curriculo; `TotalGems`/
`AverageGems` no `SquadRankingResultDto` sao sempre o saldo total de cada membro. `TotalScore`/
`AverageScore` (que respeitam `scope`) e `TotalGems`/`AverageGems` juntos cobrem o "soma/media de
Score/Gems dos membros" pedido - alem da lista de membros (`RankingEntryDto[]`, mesmo shape do
ranking de Course). Ate a Fase 69 o frontend reaproveitava `RankingTable`/`CurrentUserRankingCard`;
desde a Fase 70 o `SquadTab` tem tabela propria em pixel art (medalhas, selo LIDER/CO-LIDER, acoes do
dono na linha) e so `AverageGems` deixou de aparecer - os dois componentes seguem so no `RankingPage`.

**Resolvido na Fase 24b, nao e mais pendencia: sucessao de lideranca + limpeza de squad orfao.**
Owner sair nao bloqueia mais com outros membros dentro - a lideranca e transferida (referencia
Clash of Clans, decisao do usuario): `Squad.CoLeaderUserId` (opcional, promovido pelo Owner via
`PUT /api/squads/co-leader/{userId}`/`DELETE /api/squads/co-leader`, `SetSquadCoLeaderUseCase`)
herda primeiro; sem Co-Leader, o membro com `SquadMembership.JoinedAt` mais antigo (selecao pura
em `LeaveSquadUseCase.ResolveSuccessor`, testada sem repositorio). Owner sozinho: o squad e
deletado junto (`ISquadRepository.RemoveAsync`) - nunca mais fica orfao no banco.

**QG do Squad (Fase 72, Figma "Perfil + Squad — v2", nodes 121:6971/125:9441/125:12224/126:14410).**
O squad saiu da aba do Perfil e virou tela propria, `/squad` (`SquadPage`), destino do botao Squad do
menu e do mapa. `GET /api/squads/me/hq` (`GetSquadHqUseCase`) devolve numa chamada: cabecalho (nome,
`JoinCode` - gerado aqui tambem, `SquadJoinCode.EnsureAsync`, extraido do ranking -, lider/co-lider,
`CreatedAt`), **escalacao** (cada membro com o agente em pixel art, `AgentLookDto` = pele + `Code` da
peca por camada; se ja estudou hoje e o ultimo dia que estudou; ordem lider, co-lider, entrada),
**meta da semana** (`SquadWeeklyGoal`: Dailies originais concluidas por todos de segunda a domingo,
meta = 5 por membro; a recompensa em Gems NAO existe ainda - valor a decidir pelo dono) e o **feed**.
O feed nao e persistido: `BuildFeed` deriva as atividades dos ultimos 14 dias (max 40) de datas que ja
existem - `Daily.CompletedAt` (daily/reforco, com a nota de `Daily.CalculateScore`),
`WeeklyProject.EvaluatedAt` (nota), `UserCosmeticInventory.AcquiredAt` (compra na loja; o kit basico +
o 1o cabelo natural da criacao viram 1 atividade "agente novo") e `SquadMembership.JoinedAt`. Badges
(sem data de conquista) e marcos de ofensiva (UserStreak so guarda o valor atual) nao entram. Chave
de cada atividade: `"tipo:autor:id"`. **GG** (`SquadCheer`, tabela `SquadCheers`, unico por
squad+atividade+usuario): `POST /api/squads/me/cheers {activityKey}` e toggle; `ToggleSquadCheerUseCase`
confere que o autor da chave e do mesmo squad e nao e quem pede. **Privacidade**:
`User.HideScoresInSquadFeed` (Configuracoes, `PUT /api/users/me/squad-feed-privacy`) tira a nota das
atividades da pessoa pros colegas - ela continua vendo as proprias. O ranking continua no
`GET /api/squads/me/ranking` (podio + lista no front, recorte Semana/Mes/Curso; o lider gerencia pelo
"⋯" de cada linha, sair pede confirmacao da Focada e avisa quem assume). "Convidar" abre o modal com o
codigo do squad + o link de indicacao (o "Indique um amigo" veio do Perfil pra ca, decisao do dono).
Mock: `/__mock/squad?as=membro|lider|nenhum` abre `/squad`.

**Fora de escopo, confirmado no prompt da Fase 24 (Co-Leader adicionado na 24b e a unica excecao)**:
papeis alem de owner/co-leader/member, aprovacao de convite, um usuario em N squads ao mesmo
tempo, qualquer entidade de "partida"/Challenge/PvP, Elo/Patente - continuam nao existindo.

### Caderninho de Anotacoes (Fase 29)

**Fase 63 - nota de Projeto Semanal:** `Note` tem exatamente um contexto, `DailyId` **ou**
`WeeklyProjectId` (check constraint `CK_Notes_ExactlyOneContext`; `Note.ForWeeklyProject`). Criada
pela "Anotacao rapida" da tela do projeto via `POST /api/weeklies/{weeklyId}/project/notes`
(`CreateWeeklyProjectNoteUseCase`). `NoteDto`: `dailyId`/`dayNumber` opcionais + `weeklyProjectId`;
em nota de projeto `dailyDate` = dia (local) de criacao. `ListNotesUseCase` busca as duas
(`ListByUserAndContextIdsAsync`); o escopo `?dailyId=` (Fase 57) nunca inclui nota de projeto. UI:
"Semana N, Projeto".

Anotacao livre do aluno (`Note`, `Focadu.Domain.Notes`), criada no contexto de uma Daily
especifica - ideia trazida por um colega, validada e mapeada em detalhe (incluindo mockups Figma)
em `secret/rascunhos/caderninho-de-anotacoes.md` antes desta fase. `Note` e aggregate root proprio
(nao filho de `Daily`): guarda so `UserId`/`DailyId` - nunca duplica `WeeklyId`/`CourseId`, esse
caminho ja existe via `Daily -> Weekly -> Enrollment -> Course` (mesmo principio de `Referral`/
`Enrollment`, sem navegacao de volta). `Content` e markdown livre (negrito/lista/link - ver
`MarkdownBlock.tsx` no frontend, estendido nesta fase pra suportar `**negrito**`/`[texto](url)`
inline, antes so tinha `###`/`####`/`- item`; `*italico*` entrou na Fase 51, com regra mais
restrita que o CommonMark - ver a Fase 51; codigo inline em crase e formatacao inline nos titulos
entraram na Fase 52; lista numerada `1.` e sub-bullets indentados entraram na Fase 58, quando a
especificacao do Projeto Semanal passou a usar o mesmo `MarkdownBlock`); `Tags` e `List<string>` mapeado como `text[]` nativo
do Postgres, mesmo padrao de `User.Interests` (sem tabela associativa - tags sao livres, sem
taxonomia pre-definida). Limites (`Focadu.Domain.Policies.NotePolicy`): `MaxContentLength` =
20.000 chars, `MaxTagCount` = 10, `MaxTagLength` = 40; tags sao trim + dedupe case-insensitive
(`NormalizeTags`) na criacao/edicao.

CRUD completo, sem restricao de janela de tempo. `CreateNoteUseCase`/`EditNoteUseCase` resolvem
`Weekly.Number`/`Daily.DayNumber` via `IWeeklyRepository.GetByDailyIdAsync` (mesmo idiom de
`GetDailyStateUseCase`) pra montar `NoteDto.WeekNumber`/`DayNumber` - o vinculo "Semana X, Dia Y"
que a UI mostra explicito, sem `Note` guardar isso. `ListNotesUseCase` (histico por Course, aba
"Caderninho") resolve os `DailyId` de toda a Enrollment via `IWeeklyRepository.
GetByEnrollmentIdAsync` (mesmo grafo de `GetCourseDetailUseCase`) e filtra `Note` por esse
conjunto - filtro por periodo/busca textual/tag acontece em memoria (volume por curso e pequeno,
dezenas de Dailies), nao via query composta no banco. **Filtro `dailyId` (Fase 57):** restringe as
notas a uma sessao - a Daily pedida **e, se ela for um reforco, a Daily base que o gerou**
(`NoteDailyScope.Resolve`, via `Weekly.FindReinforcementSource`, que segue `Daily.ReinforcementDailyId`
da origem pro reforco); Daily fora da matricula do usuario vira 404 `daily_nao_encontrada`, nunca
vaza nota de ninguem. `ListNoteTagsUseCase` reaproveita
`ListNotesUseCase` sem filtro, so extrai tags distintas (autocomplete).

**Frontend**: painel de captura rapida (`components/notebook/QuickNotePanel.tsx`), no sidebar de
material (`useMaterialSidebar.tsx`) - so escreve e salva, nunca lista nada, mantem o foco da
sessao. Ate a Fase 36 ficava empilhado embaixo do `MaterialSidebar`, na mesma coluna; a Fase 37
reagrupou o sidebar em 2 colunas (ver "Frontend" abaixo) e moveu o Caderninho pra coluna direita,
ao lado do novo `StudyAssistantPanel`. Aba "Caderninho" (`components/notebook/NotebookTab.tsx`)
dentro de `CourseDetailPage` (**desde a Fase 65 e tela propria, `NotebookPage`, em
`/start?course=&caderninho=1` - as abas sairam da tela do curso, ver "Mapa da trilha"**; na Fase 29 a
tela ganhou abas pela 1a vez -
`components/notebook/CourseDetailTabs.tsx`, mesmo padrao de `ProfileTabs.tsx`, lido via
`?tab=` na query string de `/start?course=` - precisa mesclar com os outros params da URL, nao so
substituir como `ProfilePage` faz, porque `/start` e uma rota so orientada por query string) -
lista agrupada por Semana/Dia, filtro por periodo/busca/tag, edicao/exclusao via
`NoteEditorModal.tsx`. `WeeklyDetailDto` ganhou `CourseId` nesta fase (ver tabela de endpoints
acima) - unico jeito do frontend montar o link "CADERNINHO" e o autocomplete de tags a partir do
contexto de uma Daily em andamento, sem endpoint novo.

**Consulta no Resumo Falado (Fase 35, ver `secret/rascunhos/caderninho-no-resumo-falado.md`):**
`VoiceSummaryActivity` ganhou o botao "📓 Ver minhas anotações de hoje", que abre
`DailyNotesModal.tsx` (novo, so-leitura, mesmo chrome de `ContentPreviewModal`) listando as notas
da Daily atual (ate a Fase 56 por DATA: `api.listNotes(courseId, {from: Daily.Date, to: Daily.Date})`;
**desde a Fase 57 por `dailyId`**, e num reforco o modal vira "Anotações do dia base" e mostra as
notas do dia que gerou o reforco - a busca por data deixava o reforco sempre vazio, porque o reforco
e outra Daily com a Date do dia em que foi gerado, e ainda vazava notas quando essa Date coincidia
com a data agendada de uma Daily futura). **So disponivel ANTES de comecar a gravar**
(`state === 'idle' | 'permission_denied'` no componente) - decisao deliberada: reler a propria nota
pra relembrar antes de falar e legitimo, mas poder ler ela em voz alta DURANTE a gravacao
esvaziaria o proposito da atividade (Score/Feedback avaliam recall real, ver "Resumo falado por
voz" abaixo). O botao some (e o modal fecha sozinho, defensivo) assim que `state` vira
`'recording'`.

**Inconsistencia conhecida, nao resolvida:** `MaterialSidebar`/`ContentPreviewModal` (Fase 23) ja
permitiam reler o material-fonte ORIGINAL (nao so a propria nota) a qualquer momento durante o
Resumo Falado, inclusive durante a gravacao - motivado por Dailies de reforco onde o Resumo Falado
e a UNICA atividade. Ou seja, o app ja era mais permissivo com o material-fonte do que a Fase 35 e
com as proprias notas do aluno - nao foi pedido resolver essa inconsistencia, so registrada (ver
rascunho) pra quem for mexer nisso de novo.

**`ContentPreviewModal` ganha 2a coluna com o Caderninho (Fase 36, correcao de bug real):**
`dailyId`/`courseId` novos e opcionais - quando os dois vem (todo call site real hoje, via
`useMaterialSidebar`), o modal (`fixed inset-0`, cobre a tela inteira) mostra `QuickNotePanel` numa
coluna ao lado do video/texto (`w-[940px]` em vez de `w-[640px]`). Antes disso o modal tampava o
proprio Caderninho que fica no sidebar - dava pra assistir o video OU anotar o que entendeu, nunca
os dois ao mesmo tempo, reportado numa verificacao ao vivo. Sem os 2 props cai pro layout de 1
coluna de antes (defensivo - nenhum call site atual deixa de passar os dois).