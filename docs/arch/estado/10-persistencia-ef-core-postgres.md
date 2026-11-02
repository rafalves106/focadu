## Persistencia (EF Core + Postgres)

**Fase 78: `NotesReviews`** - tabela `NotesReviews` (`UserId`, `DailyId` sem FK como em `Notes`, `NotesHash`
64, `NoteCount`, `Strengths`/`Missing`/`MaterialCheck` ate 1200, `CreatedAt`; indices `(UserId, DailyId)` e
`(UserId, CreatedAt)`; cascade com `Users`). Aditiva.

**Fase 77: `SquadJoinRequests`** - tabela `SquadJoinRequests` (`SquadId`, `UserId`, `Status` em texto ate 32,
`CreatedAt`, `DecidedAt`, `DecidedByUserId`; indices `(SquadId, Status)` e `UserId`; cascade com `Squads` e
`Users`). Aditiva.

**Fase 75: `GuideSeenKeys`** - coluna `Users.SeenGuides` (`text[]`, default vazio): chaves do guia das
telas ja vistas (`tour:app`, `tela:<tela>`). Aditiva; aplica sozinha no boot da Api.

**Fase 72: `SquadHqCheersAndFeedPrivacy`** - tabela `SquadCheers` (GG do feed do QG: `SquadId`,
`ActivityKey` texto ate 120, `FromUserId`, `CreatedAt`; indice unico `(SquadId, ActivityKey,
FromUserId)`; cascade com `Squads` e `Users`) e coluna `Users.HideScoresInSquadFeed` (bool, default
false). Aplica sozinha no boot da Api como as outras.

**Fase 14: `AddGamification`** - 2a migration desde o squash da Fase 13 (`InitialCreate` +
`AddGamification`), cria `UserGemBalances`/`UserStreaks` (1:1 com `Users`, indice unico em
`UserId`, `OnDelete Cascade`) - mesmo padrao de `Enrollments` (referencia "fraca", sem navegacao
de volta em `User`). Aplicada contra o Postgres de dev existente sem precisar recriar o banco (ao
contrario do squash da Fase 13) - schema so aditivo, nenhuma tabela existente mudou.

**Fase 13: migrations de Fases 1-12 apagadas e squashadas numa unica `InitialCreate` nova** - o
schema mudou demais (renomes de tabela, colunas removidas/adicionadas, tabelas novas) pra um diff
incremental valer a pena; banco recriado do zero (autorizado explicitamente pelo prompt da fase,
sem dado real pra preservar). Historico de decisoes anteriores continua documentado nos
`docs/fase-N/` de cada fase, so a migration em si foi consolidada. Decisoes de design confirmadas
na Fase 1 continuam valendo integralmente (Guid como Id, tabela associativa real para
`WeeklyReinforcement.WeakDailyIds`, enums como `string`, etc.) - ver
`docs/fase-1/resumo-implementacao-fase-1.md` para o raciocinio completo de cada uma.

**Schema validado contra Postgres real pela primeira vez na Fase 3** (Docker disponivel nesta
sessao, diferente das Fases 1 e 2) - as duas migrations aplicam sem erro, e o fluxo completo
(seed, leitura, e responder uma atividade) foi exercitado de ponta a ponta via `curl` e via
navegador. Isso revelou um bug pre-existente:

**Bug de concorrencia do EF Core, corrigido na Fase 3.** Toda `Entity` gera seu proprio `Id`
(`Guid.NewGuid()`) no construtor, nunca o banco - mas nenhuma configuracao dizia isso ao EF Core
explicitamente. A convencao padrao do EF Core para chave Guid e `ValueGeneratedOnAdd`, e o change
tracker, ao descobrir uma entidade nova dentro de um grafo **ja rastreado** (carregado via query -
exatamente o que acontece em `SubmitActivityResponseUseCase`, que adiciona uma `ActivityResponse`
nova a uma `DailyActivity` ja carregada do banco), concluia erroneamente "ja tem Id, entao ja
existe" e emitia `UPDATE` em vez de `INSERT` - o `UPDATE` nao afetava nenhuma linha e virava
`DbUpdateConcurrencyException`. So aparece contra banco real (nunca em teste unitario de dominio
puro), e so em fluxos que adicionam uma entidade filha a um grafo ja tracked - por isso nunca
tinha aparecido: nenhum fluxo de escrita real tinha sido exercitado contra Postgres ate a Fase 3.
Corrigido uma unica vez, centralizado em `FocaduDbContext.OnModelCreating`
(`idProperty.ValueGenerated = ValueGenerated.Never` pra toda entidade) - sem migration nova, e so
metadado do EF Core, nao muda schema.

**Bug real: navegacao 1:1 sem `HasOne`, corrigido na Fase 11.** `WeeklyConfiguration` nunca
declarava `HasOne(w => w.Publication).WithOne().HasForeignKey<ModulePublication>(p =>
p.WeeklyId)` (ao contrario de `Project`, que ja tinha o equivalente desde antes). Sem essa
declaracao, `.Include(w => w.Publication)` em `WeeklyRepository.FullGraph()` derrubava
`GET /api/courses/{id}` inteiro com `InvalidOperationException` ("'w.Publication' is invalid
inside an Include operation") - so apareceu ao vivo, carregando um curso de teste (nenhum teste de
unidade cobre repositorio, ver "`Focadu.Tests` so testa dominio puro" nos pontos abertos).
Corrigido adicionando o `HasOne` que faltava + uma segunda migration
(`Fase11ModulePublicationNavigation`, so adiciona a FK que devia existir desde a primeira). **Toda
navegacao 1:1 nova precisa do `HasOne`/`WithOne` explicito na configuration correspondente, nao so
a coluna FK/indice unico** - sem isso o EF Core nem reconhece a propriedade como navegacao.

**Bug real: propriedades pass-through computadas confundem a convencao do EF Core, corrigido na
Fase 13.** `Weekly.Number`/`Title`/`Theme`/`MonthlyId` e `Daily.Activities` viraram getters
computados (`=> Template.Number`, etc. - ver "Template vs Instancia") sem nenhum backing field
proprio. Sem um `Ignore(...)` explicito, a convencao de descoberta do EF Core tentava mapear isso
como propriedade/navegacao normal e falhava no boot com `InvalidOperationException: "No backing
field was found for property 'Daily.Activities'"` - so apareceu tentando `dotnet ef database
drop`/gerar a migration (o `DbContext` precisa ser instanciado pra isso). Corrigido com
`builder.Ignore(w => w.Number)` (e os outros 4) em `WeeklyConfiguration`/`DailyConfiguration`.
**Toda propriedade computada que so faz `=> OutraEntidade.Campo` (sem field proprio) precisa de
`Ignore` explicito** - o EF nunca deveria tentar mapear isso como coluna/navegacao sozinho.