## Regras de negocio centralizadas

Todas as constantes de negocio ficam em `Focadu.Domain.Policies.EvaluationPolicy` - unico lugar
a mudar se esses numeros precisarem ajustar no futuro:

| Constante | Valor | Significado |
|---|---|---|
| `PassingScore` | 80 | Score minimo (0-100) para uma `ActivityResponse` ser `Passed`. |
| `DailyPenaltyThreshold` | 3 | Pontos de penalidade em uma `Daily` que disparam a criacao de uma Daily de reforco. |
| `WeeklyWeakDaysThreshold` | 2 | "Dias fracos" na mesma `Weekly` que disparam um `WeeklyReinforcement`. |

### Ciclo de vida de uma Daily

- `Daily.Start()` muda `Locked`/`Available` -> `InProgress` (idempotente se ja `InProgress`).
  Nao checa data - quem checa "hoje" e sempre `Weekly` (ver abaixo), nunca a `Daily` sozinha.
- `Daily.SubmitActivityResponse(...)` registra uma nova `ActivityResponse` (nunca sobrescreve
  tentativas anteriores - `AttemptNumber` incrementa por atividade). **Antes** da primeira
  conclusao da Daily (`CompletedAt == null`), toda resposta reprovada incrementa
  `PenaltyPoints`. **Depois** da primeira conclusao, qualquer nova submissao e modo replay: fica
  no historico, mas nunca mexe em `PenaltyPoints` nem dispara reforco de novo.
- `Daily.Complete()`: primeira vez, seta `Status = Completed` e `CompletedAt`. Chamadas
  seguintes (replay) sao um no-op com hooks (`OnFirstCompleted` / `OnReplayCompleted`)
  propositalmente vazios, deixados para uma futura logica de recompensa/streak (fora de escopo
  ate agora).
- `Daily.ShouldTriggerDailyReinforcement()`: `true` quando, ainda na primeira rodada
  (`!HasEverCompleted`), `PenaltyPoints >= DailyPenaltyThreshold` e o reforco ainda nao foi
  disparado para essa Daily (`!ReinforcementTriggered`).

**Decisao de produto confirmada na Fase 2**: `Locked` e um status **conceitual** para Dailies
futuras - nao existe nenhum job/scheduler/cron que transiciona o status por horario. O
desbloqueio e inteiramente baseado em **sequencia** (desde a Fase 38b - ate entao era baseado em
data, ver "Acesso a uma Daily" abaixo pro porque da troca): `Weekly.EvaluateDailyAccess` recebe
`isNextInSequence` (calculado por `DailySequencing`, Application) toda vez que o acesso e
avaliado, e esse booleano por si so ja decide o que e permitido. Nenhum processo em background
precisa "virar" o Status de `Locked` para `Available` em nenhum horario - o valor
`DailyStatus.Locked` so importa como ponto de partida indiferenciado de `Available` (ambos aceitam
`Daily.Start()` igualmente).

### Acesso a uma Daily (`Weekly.EvaluateDailyAccess`)

> **Fase 38b (14->15/09/2026) - reescrita pra sequencia, nao mais calendario.** Ate aqui, a
> barreira pra Dailies ainda nao iniciadas comparava `Daily.Date` (fixado de uma vez so na
> matricula, 1 dia util por Daily - ver `EnrollUserInCourseUseCase`) com "hoje". Bug real relatado
> ao vivo: o aluno concluiu a Daily 1 num dia so, e no acesso seguinte "/hoje" pulou direto pra
> Daily 4 (calendarmente "a data de hoje"), deixando as Dailies 2 e 3 presas em `Locked` pra
> sempre - qualquer folga entre o ritmo hipotetico de 1-dia-util-por-Daily e o ritmo real do aluno
> tinha esse efeito. A barreira agora e sempre `isNextInSequence` (Daily nao-reforco de menor
> `DayNumber` ainda nao concluida, cruzando TODAS as Weeklies da matricula - ver
> `DailySequencing`), nunca mais uma comparacao de data. `Daily.Date` continua existindo (ainda
> populado por `EnrollUserInCourseUseCase`, ainda usado pro caso `Completed`/`Replay` abaixo e por
> exibicao no frontend), so parou de gatilhar acesso.

Dado "hoje" (`IClock.Today()`) e `isNextInSequence` (`DailySequencing.IsNext`, calculado fora da
Weekly - uma Weekly sozinha nunca enxerga as irmas), retorna um `DailyAccessMode`:

- **Daily `InProgress`, qualquer posicao na sequencia**: `Resume` - **independente de ser ou nao a
  `isNextInSequence`**, inclusive uma abandonada ha mais tempo. E a regra que permite recuperar uma
  Daily abandonada (o aluno comecou e nao terminou) em vez dela ficar presa nesse status pra sempre.
- **Daily `Completed`**: `Replay` se `Date == hoje`; senao `Replay` tambem, **exceto** `ReadOnly`
  quando ha alguma outra Daily `InProgress` em qualquer lugar da Weekly no momento (prioriza
  terminar o que esta pendente antes de repetir algo ja feito) - unico lugar do metodo que ainda
  compara `Date`, deliberado (ver nota acima: decide so o comportamento de replay de algo ja
  concluido, nunca bloqueia conteudo novo).
- **Daily ainda nao iniciada (`Locked`/`Available`) e NAO e a `isNextInSequence`** (e nao e
  reforco): sempre lanca `DomainException` (`Code = "daily_bloqueada"`) - ainda nao chegou a vez
  dela. Reforco (`IsReinforcement`) nunca disputa a sequencia principal - acesso e sempre por link
  explicito (`Daily.ReinforcementDailyId`), permitido mesmo sem ser a `isNextInSequence`.
- **Daily ainda nao iniciada e (`isNextInSequence` OU reforco)**: `Start`, **exceto**
  `DomainException` quando ja existe outra Daily `InProgress` em qualquer lugar da **matricula**
  (`Code = "daily_em_andamento"`, conclua/retome-a primeiro) ou quando outra Daily ja foi
  concluida hoje em qualquer lugar da matricula (`Code = "daily_limite_diario_atingido"`,
  comparando `CompletedAt` em hora local - ver comentario no metodo sobre UTC vs. hora local).
  **Reforco fica de fora da cota diaria nos dois sentidos** (Fase 55): nao e barrado por ela e a
  conclusao dele tambem nao a consome - so conclusoes de Dailies originais (nao-reforco) contam
  pra "uma por dia". "Uma em andamento por vez" continua valendo pra ele.
- **Fase 69 - ponte sem linguagem**: Daily original com variante de linguagem (a ponte) e projeto
  ainda sem linguagem -> `DomainException` `linguagem_nao_escolhida` (409), checado antes da cota
  diaria (escolher a linguagem nao gasta a cota). "/hoje" traduz em `NeedsProjectLanguage`.

> **Fase 54 (21/09/2026) - as duas travas acima passaram a valer pra matricula inteira, e o
> reforco saiu da cota diaria.** Dois bugs reais relatados ao vivo no mesmo dia (Daily 5, a ultima
> da Semana 1):
>
> 1. **Reforco nao abria (409).** A tela de conclusao oferece "Ir para a sessao de reforco" na
>    hora, mas o reforco cai na mesma Weekly da Daily de origem, que acabara de gastar a cota
>    diaria - `daily_limite_diario_atingido`, mostrado como "Algo Deu Errado". O teste antigo
>    `AllowsStart_ForReinforcementDaily...` so passava porque avaliava em `today + 1`. Agora o
>    reforco nao e barrado pela cota (e, desde a Fase 55, a conclusao dele tambem nao a consome -
>    ver o bullet acima; na Fase 54 ele ainda contava).
> 2. **"Hoje" abria a Daily 6 (Semana 2) no mesmo dia.** `EvaluateDailyAccess` so enxerga a propria
>    Weekly, entao "1 por dia" e "1 em andamento" eram checados por Weekly, nao por matricula.
>    `EvaluateDailyAccess`/`StartOrResumeDaily` ganharam o parametro opcional
>    `otherWeekliesDailies` (as Dailies das OUTRAS Weeklies, montado por
>    `DailySequencing.DailiesOfOtherWeeklies`); `null` (default) = so a propria Weekly, o que
>    mantem os testes de dominio isolados intactos. Todos os casos de uso que avaliam acesso
>    (`GetTodayUseCase`, `GetDailyStateUseCase`, `StartOrResumeDailyUseCase`) passam o parametro.
>
> Efeito colateral a conhecer: uma Daily deixada `InProgress` em outra Weekly agora **bloqueia**
> iniciar o reforco (`daily_em_andamento`). Nao ha mais como chegar nesse estado pela Api. O dado
> que o bug antigo deixou no banco do aluno (Daily 6 `InProgress`, sem respostas) foi revertido pra
> `Locked` na mao em 21/09/2026 (UPDATE de 1 linha, autorizado pelo dono, com backup antes em
> `_backups/focadu-antes-update-dia6-*.dump`) - os "pontos abertos" de `docs/fase-54/` e
> `docs/fase-55/` que o citam sao historico e ja foram resolvidos.

### Reforco diario e semanal

Quando uma Daily atinge o limiar de penalidade, `Weekly.CreateDailyReinforcement` cria uma nova
`Daily` (`IsReinforcement = true`, vinculada a mesma `Weekly`), copiando apenas as
`DailyActivity` que tiveram ao menos uma resposta reprovada na Daily de origem - desde a Fase 13,
essas copias moram num `DailyTemplate` "sintetico" (`WeeklyTemplateId = null`, ver "Template vs
Instancia" acima), nao mais direto na Daily. "Dia fraco" = `Daily.IsWeakDay` (`PenaltyPoints >=
DailyPenaltyThreshold`). Ao acumular `WeeklyWeakDaysThreshold` dias fracos ainda nao cobertos por
um `WeeklyReinforcement` anterior, `Weekly.TriggerWeeklyReinforcement` cria o registro
correspondente.

**Como o aluno chega ate um reforco (Fase 56).** Ate a Fase 55 o unico caminho era o link "Ir para a
sessao de reforco" da `CompletionSummary` (tela de conclusao da Daily de origem), que aparece **uma
vez so** - nem a trilha nem a semana listam reforcos (ambas filtram `IsReinforcement`). Se o aluno
saisse dali, ou o clique falhasse (foi o caso da Fase 54), perdia o acesso. Agora
`DailySequencing.FindPendingReinforcement` acha a Daily de reforco **nao concluida** da matricula
(Status diferente de `Completed`; a `InProgress` primeiro, depois a da Weekly mais antiga) e
`GetTodayUseCase` devolve o id em `DailyStateDto.PendingReinforcementDailyId` - **so em
`GET /api/today`**, em qualquer `AccessMode` (inclusive `Blocked` e `WeekPendingClosure`); `null`
nos demais endpoints e quando nao ha reforco pendente. O frontend mostra o botao
(`PendingReinforcementCard`) dentro dos avisos de
"Hoje" bloqueado da `TodayPage` (cota diaria gasta e semana esperando o projeto); no
`StartDashboard`, desde a Fase 66, o acesso e o selo de reforco no caminho da semana (link direto pra
sessao) e a fala da Focada - o cartao saiu com a coluna de missoes extras. Some sozinho
quando a Daily de reforco e concluida. O texto vira "Continuar a sessao de reforco" quando o proprio
alvo de hoje e o reforco em andamento (`daily.id === pendingReinforcementDailyId`). Sem endpoint novo.

### Publicacao publica e bloqueio de modulo (Fase 11)

Implementa a filosofia central do produto (Documento Mestre, Secao 2.3 - "prova de evolucao
publica"): completar uma Weekly nao basta mais, e preciso publicar prova disso (LinkedIn ou
GitHub) antes da proxima Weekly liberar.

- **`Weekly.IsModuleComplete()`**: todos os Dailies **originais** (`!IsReinforcement`) com
  `Status == Completed` **e** `WeeklyProject.Status == Evaluated`. Dailies de reforco ficam de
  fora de proposito - um reforco pendente nao deveria travar quem ja terminou o conteudo
  original da semana.
- **`Weekly.RequiresPublicationToUnlock()`**: `IsModuleComplete() && Publication?.Status !=
  Validated`. `Weekly.Publication` so existe depois da primeira acao do usuario no modal
  (`StartPublication()`, idempotente) - antes disso e `null`, e o front interpreta isso como
  `Pending` quando o modulo ja esta completo (`GetPublicationStatusUseCase`).
- **`Weekly.RequiresProjectToUnlock()`** (Fase 54): `AreDailiesComplete() && Project.Status !=
  Evaluated` (projeto `Pending` ou `Submitted`). Existe porque `RequiresPublicationToUnlock()` so
  liga com o modulo **ja completo** (projeto `Evaluated`): com o projeto ainda pendente **nada**
  segurava a proxima semana - bug real, a Daily 6 (Semana 2) abriu com o projeto da Semana 1
  `Pending`. Falso enquanto as Dailies nao estao todas concluidas (ai quem segura e a sequencia,
  `daily_bloqueada`) e falso sem projeto definido (nunca deve ocorrer; travar o curso pra sempre
  por dado ausente seria pior). A Weekly "fecha" (MESTRE 2.3) com Dailies + projeto avaliado +
  publicacao validada; `DailySequencing.FindPendingClosureBefore` junta as duas travas.
- **Bloqueio em si vive em `StartOrResumeDailyUseCase`** (Application), nao em `Weekly` -
  `Weekly.EvaluateDailyAccess` so enxerga a propria Weekly, nunca as irmas. O use case busca as
  Weeklies da mesma `EnrollmentId` (`IWeeklyRepository.GetByEnrollmentIdAsync` - trocado de
  `GetByMonthlyIdAsync` na Fase 13) e pergunta a `DailySequencing.FindPendingClosureBefore` se
  alguma Weekly anterior ainda nao fechou: se ela `RequiresPublicationToUnlock()`, lanca
  `modulo_bloqueado_por_publicacao` (409); se `RequiresProjectToUnlock()` (Fase 54), lanca
  `projeto_semana_anterior_pendente` (409) - ambos antes de chamar `Weekly.StartOrResumeDaily`.
  **Escopo: TODAS as Weeklies anteriores da mesma Enrollment** (Fase 55, decisao do dono: "se
  existe um projeto, todas as semanas seguintes ficam bloqueadas, do mesmo curso"; ate a Fase 54
  so a `Number - 1` era olhada, entao uma semana fechada no meio nao mantinha bloqueadas as
  seguintes a uma mais antiga ainda pendente). Devolve a mais antiga pendente. A troca pra
  Enrollment (Fase 13) fechou de graca a limitacao antiga ("nao atravessa Monthlies"): uma
  Enrollment cobre o Course inteiro, nao um Monthly especifico.
- **A trilha usa a mesma regra (Fase 55):** `WeeklyOverviewDto.IsLocked` (em
  `GET /api/courses/{courseId}`) e calculado no servidor por `FindPendingClosureBefore` - antes o
  `CourseDetailPage` trancava so a Weekly `N+1` e so por `requiresPublicationToUnlock` do
  cliente, entao com o projeto pendente as semanas seguintes apareciam destrancadas.
- **`GET /api/today` e a trava (Fase 54):** `GetTodayUseCase` e um GET "best-effort" - devolver a
  1a Daily da semana seguinte pra o cliente so descobrir o 409 ao clicar seria enganoso. Se alguma
  Weekly anterior a da Daily-alvo ainda nao fechou (`FindPendingClosureBefore`), ele devolve a
  **ultima Daily original dessa Weekly** (ja `Completed`) com `DailyAccessMode.WeekPendingClosure`
  (valor 5) - o cliente cai na Weekly que ainda tem o card do projeto/publicacao. Isso vem
  **antes** da checagem da cota diaria (`Blocked`): "volte amanha" nao resolveria. `StartOrResume`
  continua recusando a mutacao com 409.
- **Acesso a conteudo ja visto nunca e bloqueado** - o bloqueio so entra no caminho de
  `StartOrResumeDailyUseCase` (comecar/retomar uma Daily nova); `Weekly.EvaluateDailyAccess`
  (Replay/ReadOnly de Dailies passadas) nunca passa por essa checagem.
- **`ModulePublication`** (entidade, 1:1 com `Weekly`): `GenerateDraft(text)` (rascunho da IA),
  `Submit(platform, url)` (`Status -> Submitted`; lanca `publicacao_ja_validada` **so** se ja
  `Validated` - depois de `Failed` e re-chamavel, e como um retry reseta `ValidationError`),
  `MarkValidated()`/`MarkFailed(reason)` (exigem `Status == Submitted`).
- **`EvaluateWeeklyProjectUseCase`** (novo, Fase 11): `WeeklyProject.Evaluate()` existia desde a
  Fase 1 sem endpoint (pendencia documentada desde a Fase 7) - sem ele, `IsModuleComplete()`
  nunca seria `true` de verdade. `POST /api/weeklies/{weeklyId}/project/evaluate`, so backend,
  sem tela propria (nao ha papel de "revisor" neste app de usuario unico). **Ate a Fase 27b, nada
  no frontend chamava esse endpoint** - `SubmitWeeklyProjectUseCase` agora dispara essa avaliacao
  automaticamente logo apos aceitar a URL (composicao, chama `EvaluateWeeklyProjectUseCase.
  ExecuteAsync` por dentro), entao o bloqueio acima passou de "nunca engata de verdade" pra
  funcional - ver "Fase 27b" no changelog de fases.
- **Geracao do rascunho de LinkedIn** (`GenerateLinkedInDraftUseCase` + `GroqDraftGenerationService`),
  feita so quando o aluno clica para publicar. Fase 106: o prompt leva o nome do curso (matricula ->
  `Course.Name`), cada dia da semana (titulo do material `Reading`/`Video` + ate 3 pontos de
  "### O que levar daqui"), o objetivo do Projeto Semanal (1o paragrafo de "### Objetivo" do
  `WeeklyProjectSpecText`) e o `WeeklyProject.Feedback` da avaliacao, com a ordem de usar so o que deu
  certo; a nota nunca entra. Continua **sem** `AiFeedback` de `ActivityResponse` (evita vazar uma
  tentativa num post publico). Interesses do perfil seguem (Fase 27). Fase 107: Groq em JSON mode, devolve
  `{post, destaques[3], projeto}`; o use case normaliza (3 destaques de ate 70, projeto ate 50, corte na palavra) e
  responde `ModulePublicationDto.Image` (`PublicationImageDto`, nao persistido).
- **Imagem de conclusao da semana (Fase 107)**: `lib/weekCompletionImage.ts` desenha em canvas o modelo quadrado
  1080x1080 do Figma ("Focadu — Pixel Art", pagina "Imagem de conclusao da semana — v1", componente `323:4912`) com
  os campos da Focada, nome do aluno e data; selos por semana em `assets/pixel/selos/`. O modal mostra a previa, baixa
  a imagem e baixa de novo no "Copiar e publicar". Texto longo quebra (2 linhas) e a fonte desce ate caber.
- **Fluxo GitHub removido (Fase 106)**: `CommitModuleSummaryUseCase`/`GetGitHubRepositoriesUseCase` e
  os endpoints `github-commit` e `/github/repositories` sairam. Commitavam pelo token do servidor (repo
  na conta da plataforma, nao na do aluno) e, com `GitHub:Token` em branco em producao, so davam 502.
  `PublicationPlatform.GitHub` fica no enum: publicacoes antigas assim seguem `Validated`.
- **Validacao de LinkedIn e so estrutural, decisao permanente (Fase 21+), nao e mais pendencia**:
  regex (`linkedin.com/(posts|feed/update)/...`) confirma que a URL tem formato de post, nunca que
  o post fala sobre o modulo de verdade. Avaliado e descartado validar conteudo via API oficial do
  LinkedIn - ao contrario de Google/GitHub OAuth, ler post de terceiro exige aprovacao no programa
  de parceiros da LinkedIn (processo de negocio, nao self-serve), desproporcional pra um app de
  estudo pessoal solo. Fluxo GitHub continua validando de verdade (`IGitHubService.
  GetRepositoryAsync`, acima) porque a API do GitHub e publica e gratuita pra isso.
- **`SubmitPublicationUseCase` so aceita LinkedIn** (Fase 106; outra plataforma = 400
  `platform_invalida`); retry e so resubmeter a URL pelo mesmo endpoint.
- **GitHub nunca foi testado contra a API real** (decisao explicita do usuario na Fase 11, ver
  `docs/fase-11/resumo-implementacao-fase-11.md`) - verificado via `page.route()` do Playwright
  mockando as chamadas que tocariam GitHub de verdade. Revisado por leitura de codigo nesta fase
  (achou e corrigiu um bug real de `sha` ausente no commit - ver "Como configurar o token do
  GitHub" acima) - validacao ao vivo continua pendente, checklist na mesma secao.