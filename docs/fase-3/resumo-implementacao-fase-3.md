# Resumo — Fase 3: Correções de API, Seed de Conteúdo e Início do Frontend

## O que foi implementado

**Parte 1 — Correções de API**

- `POST /api/dailies/{dailyId}/activities/{activityId}/responses` agora recebe `SelectedOptionId`
  (Guid) para atividades `Quiz`/`WordMatch`, em vez de `Score` pronto. O Score é sempre calculado
  no servidor (`SubmitActivityResponseUseCase.ResolveScore`): 100 se a opção escolhida existe
  nessa atividade e `IsCorrect = true`, 0 caso contrário. `Cloze`/`Roleplay` continuam recebendo
  `Score` pronto do chamador (comentário explícito no código: dependem de
  `IContentEvaluationService`, que ainda não tem adapter concreto).
- `DailyStateDto`: `QuizOptions[].IsCorrect`, `ExpectedAnswer` e `RoleplayNodes[].TerminalQuality`
  agora vêm `null` até a `DailyActivity` ter ao menos uma `ActivityResponse` registrada -
  revelados a partir da primeira tentativa (`DailyStateMapper.ToActivityDto`, gate único
  `hasAnswered`).
- **Gap de domínio descoberto e fechado** (confirmado com o Falves antes de mexer no schema):
  `DailyActivity` não tinha nenhum campo para o enunciado/pergunta da atividade - só existiam as
  `QuizOption` (opções) e `ExpectedAnswer` (gabarito do Cloze). Adicionado `DailyActivity.Prompt`
  (string?, nova migration `AddPromptToDailyActivity`), sem o qual nem o seed nem a tela de Quiz
  teriam o que mostrar como pergunta.

**Parte 2 — Seed de conteúdo real**

- `SeedWebSecurityCourseUseCase` (`Focadu.Application.Seed`): idempotente (não duplica se o Course
  "Web Security" já existir por nome), monta o grafo inteiro em memória via API pública do
  domínio (`Course.AddMonthly` → `Monthly.AddWeekly` → `Weekly.AddDaily`/`AddCuratedContent`/
  `DefineProject` → `Daily.AddActivity` → `DailyActivity.AddQuizOption`) e persiste com uma única
  chamada a `ICourseRepository.AddAsync` + `IUnitOfWork.SaveChangesAsync` (o `Add` do EF Core
  cascateia o grafo inteiro automaticamente).
- Popula Course "Web Security" (Active), Monthly 1 "Fundamentos e OWASP Top 10", Weekly 1
  "Fundamentos HTTP", 4 Dailies com `CuratedContent` (Reading com resumo curto + `// TODO:
  substituir pelo texto completo curado`, Video com os 2 links fechados + 2 "a confirmar",
  Diagram como placeholder claro), 1 `DailyActivity` Quiz por dia com pergunta/opções reais, e o
  `WeeklyProject` da Semana 1.
- Acionado via `dotnet run --project src/Focadu.Api -- seed` (checagem de `args` em `Program.cs`,
  antes de `app.Run()` - roda o seed e encerra, sem subir o servidor HTTP).
- Dia 1 é ancorado no primeiro dia útil a partir de "hoje" no momento em que o seed roda (não uma
  data fixa) - quem rodar o seed já vê a Daily de hoje populada em `/api/today` sem precisar
  adiantar o relógio.

**Parte 3 — Frontend (Vite + React + TypeScript + React Router + Tailwind)**

- Projeto inicializado em `frontend/` (README placeholder substituído), Tailwind v4 (CSS-first,
  `@theme` em `index.css`) com os tokens exatos da identidade visual (`base`, `surface`,
  `surface-alt`, `accent`, `alert`, `primary`/`secondary`/`muted`).
- Roteamento (`react-router-dom`) exatamente como documentado: `/hoje` (`GET /api/today`),
  `/start` (`GET /api/courses`), `/start?course=` (`GET /api/courses/{courseId}`),
  `/start?course=&weekly=` (`GET /api/weeklies/{weeklyId}`),
  `/start?course=&weekly=&daily=` (`GET /api/dailies/{dailyId}`).
- Client HTTP tipado (`src/api/client.ts`, fetch nativo) com `VITE_API_BASE_URL` configurável
  (`.env.local`, gitignorado; `.env.example` documentado) e `ApiError` traduzindo o envelope
  `{ error, message }` da Api.
- Tela de Quiz (`/hoje`, componente `QuizActivity`) implementada de ponta a ponta com dados reais
  do seed: pergunta + opções sem gabarito, seleção, `POST .../responses` com `SelectedOptionId`,
  feedback certo/errado e gabarito revelado - validado ao vivo no navegador (ver seção Testes).
  As telas de `/start` (lista/detalhe de curso, semana, dia) são funcionais mas não têm o mesmo
  polimento visual - só a tela de Quiz foi tratada como "a mais validada no Figma", por pedido
  explícito do prompt.

**Correções não previstas no prompt, descobertas ao validar contra Postgres real**

- **Bug pré-existente de concorrência do EF Core corrigido.** Ao submeter a primeira resposta de
  verdade contra um Postgres real, `SaveChangesAsync` lançava
  `DbUpdateConcurrencyException` (`UPDATE` afetando 0 linhas) para uma `ActivityResponse`
  recém-criada. Causa raiz: nenhuma entidade tinha `ValueGenerated = Never` configurado para o
  `Id` (Guid gerado no próprio domínio, nunca pelo banco) - a convenção padrão do EF Core para
  chave Guid é `ValueGeneratedOnAdd`, e o change tracker, ao descobrir uma entidade nova dentro de
  um grafo **já rastreado** (carregado via query, como acontece em
  `SubmitActivityResponseUseCase`), concluía erroneamente que "já tem Id, então já existe" e
  emitia `UPDATE` em vez de `INSERT`. Isso nunca tinha aparecido antes porque nenhum fluxo de
  escrita real tinha sido exercitado contra Postgres de verdade (pendência conhecida desde a Fase
  1). Corrigido uma única vez, centralizado em `FocaduDbContext.OnModelCreating` (mesmo loop que já
  configurava `PropertyAccessMode.Field`) - sem migration nova, é só metadado do EF Core, não muda
  schema.
- **CORS ausente na Api.** Sem isso, todo fetch do frontend (porta 5173) para a Api (porta 5282)
  era bloqueado pelo navegador (portas diferentes = origens diferentes, mesmo os dois em
  `localhost`). Adicionada uma policy de CORS liberando `http://localhost:5173` (dev apenas, ver
  "Dúvidas e pontos abertos").

## Decisões técnicas tomadas que não estavam no prompt original

1. **`DailyActivity.Prompt` como campo novo** (não reaproveitar `ExpectedAnswer`) - confirmado
   com o Falves via pergunta direta antes de tocar no schema, por ser uma mudança de domínio que
   o prompt não previu.
2. **Validação de Score/SelectedOptionId movida para dentro do caso de uso** (não mais em
   `Program.cs`), porque decidir qual campo é obrigatório depende do `ActivityType` da atividade -
   informação que só o caso de uso tem (via `IWeeklyRepository`), não o endpoint antes de chamá-lo.
3. **`ResolveScore` como método `internal static`** em `SubmitActivityResponseUseCase`, testável
   direto (via `InternalsVisibleTo("Focadu.Tests")` novo em `Focadu.Application`) sem precisar de
   fakes de repositório - só depende de objetos de domínio. Mesmo padrão aplicado para poder
   testar `DailyStateMapper.ToDto` (também `internal`) diretamente.
4. **Seed como comando de CLI (`dotnet run -- seed`) dentro do próprio `Focadu.Api`**, não um
   projeto novo. Reaproveita a composição de DI que já existe (`AddFocaduApplication` +
   `AddFocaduInfrastructure`) em vez de duplicá-la num `Focadu.Seed` separado.
5. **Data do Dia 1 ancorada em "hoje"** no momento do seed (via `IClock`, arredondado para o
   próximo dia útil), não uma constante fixa - escolhida porque o Passo 3 precisa demonstrar o
   fluxo de `/api/today` de ponta a ponta, e uma data fixa só funcionaria numa janela estreita do
   calendário.
6. **Tailwind v4 "CSS-first"** (`@theme` em `index.css`, sem `tailwind.config.js`) - é a forma
   nativa da versão instalada (4.3.3) de declarar tokens de cor custom, sem arquivo de config
   adicional.
7. **`/start` com sub-telas funcionais mas não polidas visualmente** - só a tela de Quiz foi
   tratada como "a mais validada no Figma" (pedido explícito do prompt); as 4 variações de
   `/start` (lista/curso/semana/dia) seguem a mesma paleta e são plenamente funcionais, mas sem o
   mesmo nível de acabamento.
8. **Correções não pedidas mas necessárias para o Passo 3 funcionar de ponta a ponta de verdade**
   (bug de concorrência do EF Core e CORS ausente) - ver seção acima. Nenhuma delas altera
   contrato de Api ou schema.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/
  Activities/DailyActivity.cs           (alterado: + Prompt)
  Dailies/Daily.cs                      (alterado: AddActivity + prompt)

backend/src/Focadu.Application/
  AssemblyInfo.cs                       (novo: InternalsVisibleTo("Focadu.Tests"))
  Dailies/Dtos.cs                       (alterado: DailyActivityDto.Prompt, QuizOptionDto.IsCorrect nullable)
  Dailies/DailyStateMapper.cs           (alterado: gate hasAnswered)
  Dailies/SubmitActivityResponseUseCase.cs  (reescrito: ResolveScore)
  DependencyInjection.cs                (alterado: + SeedWebSecurityCourseUseCase)
  Seed/SeedWebSecurityCourseUseCase.cs  (novo)

backend/src/Focadu.Infrastructure/
  Persistence/FocaduDbContext.cs        (alterado: ValueGenerated.Never)
  Persistence/Configurations/DailyActivityConfiguration.cs  (alterado: + Prompt)
  Migrations/20260818224207_AddPromptToDailyActivity.cs     (nova migration)

backend/src/Focadu.Api/
  Contracts/SubmitActivityResponseRequest.cs  (alterado: + SelectedOptionId)
  Program.cs                            (alterado: CORS, seed via args, endpoint simplificado)
  Focadu.Api.http                       (atualizado: exemplos Quiz/Cloze separados)

backend/tests/Focadu.Tests/Dailies/
  SubmitActivityResponseScoreTests.cs   (novo: 8 casos de ResolveScore)
  DailyStateMapperTests.cs              (novo: gabarito escondido/revelado)

frontend/                               (projeto Vite novo, substitui README placeholder)
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado)
  src/
    main.tsx, App.tsx, index.css        (roteador + nav + tokens Tailwind)
    api/
      types.ts, client.ts, useApiResource.ts
    routes/
      TodayPage.tsx, StartPage.tsx
    components/
      QuizActivity.tsx, Layout.tsx

docs/
  ARQUITETURA.md                        (atualizado)
  fase-3/resumo-implementacao-fase-3.md (este arquivo)

.claude/launch.json                     (novo: config do dev server do frontend p/ preview)
```

## Testes

**Backend (unitários, xUnit):** 37 testes passando (`dotnet test` → `Aprovado: 37, Com falha: 0`) -
27 herdados da Fase 2 + 10 novos (8 em `SubmitActivityResponseScoreTests`, cobrindo Quiz/WordMatch
com opção certa/errada/ausente/inválida/de outra atividade, Cloze/Roleplay com Score
válido/ausente/fora de faixa; 2 em `DailyStateMapperTests`, cobrindo gabarito escondido antes e
revelado depois da primeira resposta).

**Validação end-to-end contra Postgres real - pela primeira vez no projeto** (Docker disponível
nesta sessão, diferente das Fases 1 e 2): `docker compose up`, as duas migrations aplicadas sem
erro (`dotnet ef database update`), seed rodado e confirmado idempotente (segunda execução não
duplica), Api completa validada via `curl`:

- `GET /api/today` → gabarito (`isCorrect`) `null` antes de responder.
- `POST .../start` → `InProgress`.
- `POST .../responses` com `selectedOptionId` da opção certa → `score: 100, passed: true`.
- `GET /api/dailies/{id}` depois → gabarito revelado (`isCorrect: true/false` em todas as opções).
- `GET /api/courses`, `GET /api/weeklies/{id}` → dados do seed corretos, datas dos 4 dias
  sequenciais e úteis.
- Foi nessa validação que o bug de concorrência do EF Core apareceu (documentado acima) - só
  reproduzível contra banco real, nunca teria aparecido em teste unitário puro de domínio.

**Frontend, verificado ao vivo no navegador** (dev server + Api + Postgres reais, banco resetado
para testar o fluxo do zero): `/hoje` mostra a pergunta sem gabarito → seleção de opção errada
habilita "Responder" → clique envia `POST .../responses` → feedback vermelho na opção errada
escolhida, opção certa revelada em verde, mensagem "Essa não foi". Também testado com a atividade
já respondida (gabarito aparece direto ao carregar) e a navegação completa
`/start` → curso → semana → dia (incluindo o erro esperado `daily_futura` ao tentar abrir
diretamente uma Daily futura pela Api).

## Dúvidas ou pontos abertos para a próxima fase

- **CORS liberado só para `http://localhost:5173`** (hardcoded, dev apenas) - precisa virar
  configurável (ou mais permissivo/restrito conforme o caso) quando existir um ambiente de deploy
  real.
- **`BodyText` dos `CuratedContent` tipo Reading é só um resumo placeholder** (2-3 frases, com
  `// TODO: substituir pelo texto completo curado` no código) - o Falves carrega o texto completo
  manualmente depois, conforme combinado no prompt.
- **Vídeos dos Dias 3 e 4 e o mecanismo de servir os Diagramas (SVG) continuam pendentes** -
  ambos deixados como placeholder explícito no seed, sem decisão de design ainda.
- **Só a tela de Quiz foi implementada** - WordMatch, Cloze e Roleplay não têm UI (mostram uma
  mensagem simples de "ainda não implementado" se a Daily do dia cair num desses tipos).
- **`IContentEvaluationService` continua sem adapter concreto** - Cloze/Roleplay seguem recebendo
  Score pronto do cliente, agora explicitamente documentado no código (não é mais um "esquecimento
  silencioso": `ResolveScore` deixa a lacuna nomeada).
- **Frontend não chama `POST .../complete`** - a tela de Quiz atual só cobre responder a uma
  atividade; concluir a Daily inteira (e o fluxo de reforço diário/semanal que isso pode disparar)
  ainda não tem tela.
- **Sem tela de resumo falado/microfone, menu de configurações ou captura de voz real** -
  confirmado fora de escopo pelo próprio prompt desta fase.
- **`/start` funcional mas não polido visualmente** - só a tela de Quiz recebeu o mesmo cuidado
  do Figma; as 4 sub-telas de `/start` podem precisar de uma passada de design numa fase futura.
