# Resumo — Fase 13a: Template ↔ Instância, Matrícula e Logout (Backend)

## Decisão de divisão de fase

Esta era, de longe, a fase mais arriscada estruturalmente até agora - o próprio prompt já
autorizava dividir em 13a/13b se o refactor Template↔Instância ficasse grande demais pra fechar
junto com as 4 telas de onboarding num commit só. Ficou grande demais. **Dividido conforme
autorizado**:

- **Fase 13a (este resumo)**: todo o refactor de domínio (Template vs Instância), `Enrollment`,
  `EnrollUserInCourseUseCase`, `[Authorize]` em todos os endpoints de curso/daily/weekly/
  publicação, `GET /api/today` reescrito pra usar Enrollment em vez de "Course Active" global, +
  o botão real "Sair da Conta" no `SettingsMenu` (item 0 do prompt - pequeno e desacoplado do
  resto, não dependia do refactor de domínio, coube aqui).
- **Fase 13b (próxima)**: `OnboardingWelcomePage`, `ProfileInterviewPage`, `CourseSelectionPage`,
  `EmptyStateStartPage`, lógica de redirecionamento em `SplashPage`/pós-login.

**Consequência direta**: com o backend já exigindo autenticação + matrícula em tudo, mas o
frontend ainda sem onboarding/seleção de curso, um usuário recém-registrado que chegue em
`/start` hoje (antes da Fase 13b) vai ver a tela quebrar (`GET /api/today` retorna `404
nenhuma_matricula_ativa`, sem nenhuma UI que explique isso ou ofereça matricular-se). **Esperado,
documentado, não é regressão** - a Fase 13b fecha esse buraco. Enquanto isso, qualquer verificação
end-to-end via UI precisa matricular o usuário via `curl`/`POST /api/enrollments` primeiro (mesma
técnica usada nesta verificação).

## Validação de design

Só o node relevante pra esta metade da fase foi conferido (os outros 3 - Boas-vindas, Seleção de
Curso, Empty State - são UI da Fase 13b, ficam pra lá):

| Node | Rótulo esperado | Conteúdo real |
|---|---|---|
| `0-77` | Menu de Configurações (com Logout) | ✅ Bate - "Sair da conta" como botão vermelho cheio no rodapé, com ícone |

**Divergência implementada de propósito**: o Figma mostra "Sair da conta" como um botão
grande, com borda/preenchimento vermelho, e **não mostra** a opção "Sair e salvar progresso"
(criada na Fase 7). Implementei "Sair da Conta" como um link de texto simples (mesmo estilo dos
outros 2 links já existentes nesse menu - "Fechar (ESC)"/"Sair e salvar progresso"), não um botão
novo maior - consistência com o resto do componente pesou mais que replicar o peso visual exato do
Figma pra uma única ação. As duas opções de saída convivem (logout de conta ≠ sair da tela de
estudo) - nenhuma substitui a outra.

## O que foi implementado

### Modelo de domínio: Template vs. Instância

- **`WeeklyTemplate`** (rename de `Weekly`): `MonthlyId`, `Number`, `Title`, `Theme`,
  `WeeklyProjectSpecText` (novo - a especificação do projeto, que era `WeeklyProject.SpecText`,
  virou curriculo), `DailyTemplates`, `CuratedContents`.
- **`DailyTemplate`** (rename de `Daily`): `WeeklyTemplateId` (**nullable** - ver abaixo),
  `DayNumber`, `DailyActivities`. Sem Status/Date/PenaltyPoints/etc - isso virou progresso.
- **`DailyActivity`**: perdeu `Status` (era progresso disfarçado - "Pending/Completed" mudava
  quando a primeira resposta chegava; agora é sempre derivado no `DailyStateMapper` a partir de
  `Daily.Responses`, nunca armazenado) e `Responses` (moveu pra `Daily`-instância). `DailyId`
  renomeado pra `DailyTemplateId`.
- **`Enrollment`** (novo): `UserId`, `CourseId`, `EnrolledAt` - o gatilho de
  `EnrollUserInCourseUseCase`.
- **`Weekly`** (novo significado - instância por usuário): `EnrollmentId`, `WeeklyTemplateId`,
  `StartDate`, `Dailies`, `Project`, `Reinforcements`, `Publication`. `Number`/`Title`/`Theme`/
  `MonthlyId` viraram **pass-through computados** (`=> Template.Number`, etc.) - nunca duplicados,
  sempre lidos do template referenciado.
- **`Daily`** (novo significado - instância por usuário): `WeeklyId`, `DailyTemplateId`,
  `DayNumber` (fica na instância, não é pass-through - ver "Reforço" abaixo), `Date`, `Status`,
  `PenaltyPoints`, etc. `Activities` também é pass-through (`=> Template.Activities`). Ganhou
  `Responses` (moveu de `DailyActivity` pra cá - **decisão central do split**, ver abaixo).
- **`WeeklyProject`** (instância): perdeu `SpecText` (curriculo agora), ganhou `InitializeProject()`
  (cria eagerly na matrícula, `Pending`) no lugar do antigo `DefineProject(specText)`.
- **`ModulePublication`**: sem mudança de forma - continua criada sob demanda
  (`Weekly.StartPublication()`, Fase 11), **decisão deliberada** de não seguir a sugestão do
  prompt de criar eagerly na matrícula (`NotRequired` até completar) - o padrão lazy já validado
  na Fase 11 dá o mesmo resultado visível sem ressuscitar complexidade.
- **`Course`**: ganhou `Description` (texto de vitrine pro card de seleção de curso, Fase 13b) -
  **"duração estimada" não virou campo**: calculada ao vivo a partir do número real de
  `WeeklyTemplates` (`GetAvailableCoursesUseCase`), pra nunca ficar desatualizada.
- **`User`**: ganhou `Interests` (lista, mapeada como `text[]` nativo do Postgres via Npgsql - sem
  tabela associativa, não é dado relacional de verdade), `AdditionalProfileNotes`,
  `ProfileCompletedAt`, e o método `CompleteProfile(interests, notes)`.

### A decisão mais importante do split: onde `ActivityResponse` mora agora

`DailyActivity` virou curriculo **compartilhado por todos os usuários matriculados** (a mesma
`DailyActivity` "Quiz do Dia 1" é referenciada pela Daily-instância de todo mundo que já passou
por ali). Isso significa que `ActivityResponse` **não pode mais** pertencer a `DailyActivity` -
teria uma única lista de respostas compartilhada entre usuários diferentes. `ActivityResponse`
agora pertence a `Daily` (instância), mantendo `ActivityId` como referência cruzada pro
`DailyActivity` (template) que ela responde. `AttemptNumber` passou a contar dentro do
`_responses` da própria Daily-instância (`_responses.Count(r => r.ActivityId == activityId) + 1`),
não mais num campo isolado da `DailyActivity`.

**Bug real pego em design, nunca chegou a rodar**: o índice único original teria sido
`(ActivityId, AttemptNumber)` (mesmo formato de antes da Fase 13) - mas como `ActivityId` agora é
compartilhado entre N usuários, isso rejeitaria a 1ª tentativa do 2º usuário numa atividade que o
1º já tinha respondido (`AttemptNumber = 1` colidindo). Corrigido incluindo o dono real
(`DailyId`, shadow property) no índice: `(DailyId, ActivityId, AttemptNumber)`. **Verificado ao
vivo contra Postgres de verdade** com 2 usuários reais respondendo a mesma `DailyActivity` (ver
"Testes" abaixo) - sem o fix, isso teria estourado `DbUpdateException` na cara do 2º usuário.

### Reforço diário: `DailyTemplate` "sintético"

Reforço (Fase 4) gera atividades novas, por usuário, copiadas da Daily de origem - isso nunca foi
curriculo de verdade. Em vez de dar a `DailyActivity` uma 2ª FK opcional (pra Daily-instância,
além de DailyTemplate), `DailyTemplate.WeeklyTemplateId` é **nullable**:
`DailyTemplate.CreateSynthetic(dayNumber)` cria um DailyTemplate órfão (nunca adicionado a
nenhuma `WeeklyTemplate.DailyTemplates`), só pra guardar as atividades clonadas de um reforço
específico. Assim, `Daily.DailyTemplateId` é sempre exatamente um `DailyTemplate` - curricular ou
sintético -, e todo código que lê `daily.Activities`/`daily.Template.Activities` nunca precisa
saber a diferença. **Verificado ao vivo**: 3 respostas erradas → reforço disparado → novo
`DailyTemplate` sintético persistido no banco (`WeeklyTemplateId = NULL`, `DayNumber = 5`) →
atividade clonada com opções clonadas, acessível via `GET /api/dailies/{reinforcementId}`.

### Use Cases novos

- **`EnrollUserInCourseUseCase`**: verifica matrícula duplicada (`ConflictException
  "ja_matriculado"`), cria `Enrollment`, e para cada `WeeklyTemplate` do curso (via
  `ICourseRepository.GetFullTemplateGraphAsync`, grafo completo) cria a `Weekly`-instância + 1
  `Daily`-instância por `DailyTemplate` + `InitializeProject()`. Datas calculadas com a mesma
  lógica de distribuição por dia útil que `SeedWebSecurityCourseUseCase` usava antes da Fase 13
  (agora só faz sentido no momento da matrícula, não mais no momento do seed).
- **`CompleteProfileUseCase`**: salva a Entrevista de Perfil. **Só captura e persiste** - não usa
  os interesses em nenhum prompt de IA (fora de escopo explícito desta fase, confirmado no
  prompt - "é tentador, mas expande escopo").
- **`GetAvailableCoursesUseCase`** / **`GetMyEnrollmentsUseCase`**: leitura simples, sem fake de
  repositório (convenção já estabelecida do projeto).

### `SeedWebSecurityCourseUseCase` ajustado

Agora só popula a estrutura TEMPLATE (`Course`/`Monthly`/`WeeklyTemplate`/`DailyTemplate`/
`DailyActivity`/`CuratedContent`) - sem `IClock`, sem distribuição de datas (isso virou trabalho
de `EnrollUserInCourseUseCase`). Confirmado ao vivo: depois do seed, `WeeklyTemplates`=1,
`DailyTemplates`=4, `Weeklies`=0, `Dailies`=0 - zero instância até alguém se matricular.

### Proteção de endpoints (finalmente, adiado desde a Fase 12)

Todo endpoint de curso/weekly/daily/publicação/conteúdo-curado ganhou `.RequireAuthorization()`.
Os que operam sobre uma instância específica (`GetByIdAsync`/`GetByDailyIdAsync` de
`IWeeklyRepository`) agora recebem `userId` e filtram pela Enrollment dona **na própria query**
(`_context.Enrollments.Any(e => e.Id == w.EnrollmentId && e.UserId == userId)`) - id de outro
usuário sempre vira 404, nunca um 403 que revelaria "isso existe, mas não é seu". `GET
/api/today` parou de assumir "1 Course Active" global - agora resolve a Enrollment do usuário
logado (`nenhuma_matricula_ativa` 404 se não tiver nenhuma, `multiplas_matriculas_ativas` 409 se
tiver mais de uma - mesmo tratamento defensivo de antes, agora escopado por usuário).
`/curated-content` (autoria) e `/github/repositories` exigem login mas não filtram por usuário -
curriculo é compartilhado, não há papel de "admin" separado neste app.

### Bloqueio cross-Weekly (Fase 11) ganhou um upgrade de graça

`StartOrResumeDailyUseCase` trocou `GetByMonthlyIdAsync` por `GetByEnrollmentIdAsync` (a
Enrollment é quem agora escopa "semanas irmãs", não mais o Monthly) - isso **fecha sozinha** a
limitação documentada desde a Fase 11 ("bloqueio não atravessa Monthly") sem nenhum código extra:
uma Enrollment cobre o Course inteiro, não um Monthly específico.

## Pendência conhecida: `/admin/conteudo` (frontend) quebrou

`CuratedContent` virou curriculo (`WeeklyTemplateId`, não mais `WeeklyId` de uma Weekly-instância)
- os endpoints de autoria (`POST/PUT /api/curated-content`) foram ajustados corretamente no
backend, mas o frontend `AdminContentPage.tsx` ainda navega/envia usando ids de Weekly-instância
(vindos de `GET /api/courses/{id}`, que agora exige matrícula e devolve ids de instância, não de
template). **Não corrigido nesta fase** (front ficou fora do escopo de 13a, e a correção
apropriada - um endpoint de leitura de estrutura curricular, sem depender de matrícula - é
trabalho de frontend genuíno) - registrado aqui pra não silenciosamente esquecer.

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **96 aprovados** (86 pré-existentes, todos
  migrados pro novo modelo sem trocar nenhuma asserção de comportamento - só a construção
  mudou de `weekly.AddDaily(n, data)`/`daily.AddActivity(...)` pra passar por
  `WeeklyTemplate`/`DailyTemplate` primeiro; +10 novos: `User.CompleteProfile` (4),
  `WeeklyTemplate.SetProjectSpec`/`AddDailyTemplate` (4), `Enrollment` (1),
  `Weekly.InitializeProject` idempotência (1)).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- Verificação ao vivo (Postgres real, banco resetado e recriado do zero - migration única
  `InitialCreate`, migrations antigas apagadas e squashadas, já que o schema mudou demais pra um
  diff incremental fazer sentido): registro → completar perfil → listar cursos disponíveis →
  matricular → `/hoje` com dados reais (datas por dia útil corretas) → responder Reading/Video/
  Quiz → concluir a Daily → submeter e avaliar o projeto da semana → gerar rascunho de LinkedIn
  (Groq real) → submeter e validar a publicação → `requiresPublicationToUnlock` virando `false`.
  **2º usuário registrado e matriculado no mesmo curso**, confirmando: (a) isolamento de
  propriedade (404 tentando acessar dados do 1º usuário), (b) a mesma `DailyActivity`
  compartilhada funcionando pros dois usuários sem colisão de `AttemptNumber` (o bug pego em
  design), (c) reforço diário disparado e persistido corretamente pro 2º usuário (`DailyTemplate`
  sintético real no banco). Logout verificado via Playwright contra o frontend real: login →
  `/hoje` → abrir configurações → "Sair da Conta" → confirmação → redireciona `/login` → sessão
  de fato limpa (`/start` volta a barrar).

## Dúvidas ou pontos abertos para a Fase 13b

- **`/admin/conteudo` precisa de um endpoint de leitura de estrutura curricular** (Course →
  Monthly → WeeklyTemplate, sem depender de matrícula) pra voltar a funcionar - hoje só existe
  `GET /api/courses/{id}` (instância, exige Enrollment) e `GET /api/weekly-templates/{id}`
  (unitário, `IWeeklyTemplateRepository.GetByIdAsync`, sem endpoint HTTP ainda).
- **Fluxo de onboarding pós-login inexistente no frontend ainda** - um usuário novo hoje trava em
  `/start` (ver "Consequência direta" no topo). A Fase 13b resolve isso com `SplashPage`/pós-login
  checando `user.profileCompletedAt`/matrícula antes de decidir pra onde ir.
- **Nenhum teste de "use case completo" novo** (`EnrollUserInCourseUseCase` inteiro, com banco) -
  mesma convenção já estabelecida (sem fakes de repositório no projeto) - a distribuição de datas
  por dia útil foi verificada ao vivo, não por unit test (mesmo padrão do antigo seed).
