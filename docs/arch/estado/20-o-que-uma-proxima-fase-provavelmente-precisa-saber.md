## O que uma proxima fase provavelmente precisa saber

- **Inconsistencia conhecida entre Fase 23 e Fase 35, nao resolvida de proposito:** o
  Resumo Falado deixa reler o material-fonte ORIGINAL a qualquer momento (inclusive durante a
  gravacao, via `MaterialSidebar`/`ContentPreviewModal`, Fase 23) mas so deixa reler as PROPRIAS
  notas do Caderninho antes de comecar a gravar (Fase 35, trava durante `state === 'recording'`) -
  ver `secret/rascunhos/caderninho-no-resumo-falado.md` pro raciocinio completo. Se decidir
  uniformizar (apertar o material-fonte pra bater com as notas, ou afrouxar as notas pra bater com
  o material-fonte), e decisao de produto nova, nao um bug.
- **Suporte Rapido de IA (Fase 32) ganhou historico curto na Fase 33** (`History`, ~4 trocas, ver
  secao Groq acima) - a decisao original de "zero historico" nao sobreviveu ao 1o teste real (uma
  pergunta de seguimento perdeu o fio sem ele). Se precisar aumentar `MaxHistoryMessages`/
  `MaxHistoryMessageLength` (`AskStudyAssistantUseCase`) no futuro, e so ajustar as 2 constantes -
  nao ha teto rigido de produto documentado, so o "curto de proposito" do espirito original.
  Mesmo padrao do QA descartavel da Fase 25: um usuario de teste
  (`smoketest-fase32@example.com`) ficou no banco local, criado so pra validar o endpoint novo
  ponta a ponta com a chave real da Groq - sem endpoint de remocao de usuario pra limpar via API.
- **Seed nao e upsert - reseedar um curso que ja existe exige apagar manualmente primeiro, na
  ordem certa** (Fase 26): `SeedWebSecurityCourseUseCase` e idempotente **por nome** (se o `Course`
  ja existe, nao insere nada de novo, nao atualiza). Pra recarregar do zero: `RoleplayOptions`
  primeiro (FK `NextNodeId` e `RESTRICT`, auto-referencia - apagar o `Course` direto em cascata
  bate nela) -> `Enrollments` (cascata pra `Weeklies`/`Dailies`/etc. - precisa ir **antes** do
  `Course`, porque `Weeklies.WeeklyTemplateId`/`Dailies.DailyTemplateId` tambem sao `RESTRICT`
  contra os Templates que o `Course` apagaria em cascata) -> `Courses`. Um `DELETE FROM "Courses"`
  direto esbarra nas 2 constraints acima.
- **Conteudo curado (`secret/curadoria/`) hoje mora num repositorio irmao separado**
  (`focadu-secret/`, com `.git` proprio, ao lado de `focadu/`) - `CuratedContentPath` (Seed) e
  `CuratedContentAllFilesTests` tentam `<raiz-deste-repo>/secret/...` primeiro (compatibilidade com
  quem tiver symlink local) e caem pro repo irmao se nao acharem. Lembrar de `git pull` no repo
  irmao antes de rodar o seed - o conteudo pode estar atrasado ali sem nenhum aviso no `focadu/`.
  `CuratedContentAllFilesTests` importa todo `dia-N.json`/`projeto.json` contra os importers reais
  sem precisar de banco - roda antes de qualquer seed real pra pegar erro de schema/enum cedo.
- **Fase 25 e "Parte A" de proposito - varias pendencias conhecidas, nao esquecimento:**
  personagem no `WorldMapPage` e so um placeholder geometrico (sem spritesheet/animacao de
  caminhada ainda - o Falves vai montar um kit inicial proprio, mesmo kit que cobre os itens da
  Loja tambem, ver abaixo); o botao central do `GlobalNav` ("volta pro mapa") tambem e placeholder
  (emoji, sem PNG pixel art proprio ainda); o HUD sobreposto no mapa (GemBadge/StreakIndicator) e o
  proprio `GlobalNav` vao ser refeitos em UI propria de pixel art (decisao do Falves, ainda nao
  desenhada); **Loja/Customizacao viraram "em breve"** (`ComingSoon`) ate esse kit inicial chegar
  (reabertas em pixel art na Fase 71) -
  os itens sempre foram bloco de cor solida por raridade, placeholder desde a Fase 17; mecanismo
  de comprar/equipar continua intacto em `api/client.ts`, so as 2 telas pararam de exercitar;
  sem colisao contra predio no mapa (decisao explicita da fase - so as 5 trigger zones
  das portas bloqueiam/liberam algo); coordenadas das trigger zones/letreiros em `worldConfig.ts`
  sao uma estimativa calibrada visualmente (ver `docs/fase-25/`), nao uma medicao exaustiva -
  reajustar se alguma porta continuar "errada" na pratica. Posicao do personagem persistida
  (`lib/worldPosition.ts`) e so `localStorage` - por navegador/dispositivo, nao por conta (nao
  sincroniza entre aparelhos); vira campo de backend de verdade so se algum dia isso importar.
  Um usuario de QA descartavel (`qa-fase25@example.com`) ficou no banco local, criado so pra
  verificar `GlobalNav`/`/hoje`/fallback mobile com login real - sem endpoint de remocao de
  usuario pra limpar via API. **Fallback mobile cobre so `/start` sem params** - as outras telas
  (Loja/Perfil/Trilha/Ranking/Projeto/Squad/Hoje) nao passaram por auditoria de responsividade
  nesta fase, so o `GlobalNav` (que aparece em todas) ganhou o tratamento `md:`/hamburguer.
  `useIsMobile` e so largura de viewport (768px), sem checar touch/user-agent.
- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima; o client tipado do frontend (`frontend/src/api/`) e o exemplo de referencia de
  como consumi-lo.
- **Resolvido na Fase 23, nao e mais pendencia:** Ligar Palavras virou um matcher visual de 2
  colunas de verdade (tap-to-connect, nao drag-and-drop - ver `WordMatchActivity.tsx` pro motivo),
  com reforma de contrato completa (1 `DailyActivity` = 1 grupo de pares, nao mais 1 termo por
  atividade). Ver "WordMatch: reforma completa do contrato na Fase 23" acima e
  `docs/fase-23/resumo-implementacao-fase-23.md`.
- **Resolvido na Fase 19, nao e mais pendencia:** Cloze e Roleplay (Dias 3/4 do seed) nao tinham
  sido exercitados ao vivo desde a Fase 9 (so Quiz e WordMatch) - verificados via Playwright com
  data ajustada por SQL (mesma tecnica das Fases 15-18), confirmando fidelidade visual dos 8 telas
  de sessao de ponta a ponta.
- **Resolvido na Fase 22, nao e mais pendencia:** "Sessao Expirada" (1 dos 4 designs do Figma da
  Fase 10) - interceptor global de 401 "nao_autenticado" + `SessionExpiredModal`, ver "Sessao
  expirada: interceptor global de 401 (Fase 22)" acima.
- **Resolvido na Fase 10 (retomada), nao e mais pendencia:** "Streak Perdido" (o outro dos 4
  designs do Figma da Fase 10) ganhou tela - `UserStreak.BrokenAt`, `streakJustBroken` no
  `GamificationSummaryDto`, `PUT .../streak/acknowledge-broken` e `StreakLostModal` disparado pelo
  `StartDashboard`. Ver `docs/fase-10/resumo-implementacao-fase-10.md`. Desde 23/09/2026 o aviso e a
  Focada falando, em pixel art (retrato acolhedor + resposta "Bora recomecar hoje", mesmo formato do
  `PixelConfirmDialog`), e aparece uma vez por quebra (ver `UserStreak` acima).
- **Testando erros de rede com Playwright: usar o host completo no glob de `page.route()`**
  (ex: `http://localhost:5282/api/**`), nunca so `**/api/**` - o Vite dev server serve os arquivos-
  fonte do frontend por HTTP (`/src/api/client.ts`, `/src/api/types.ts`), um glob generico demais
  intercepta esses modulos tambem e quebra o app inteiro (tela em branco) antes mesmo de qualquer
  chamada de Api de verdade acontecer - descoberto durante a verificacao ao vivo da Fase 10.
- **Timeout do cliente e por chamada** (`request(path, { timeoutMs })`, `api/client.ts`) - qualquer
  endpoint futuro que demore mais que os 10s padrao (como o de audio, ver "Timeout de requisicoes")
  precisa passar seu proprio `timeoutMs`, senao a `TimeoutError` aparece antes do backend ter
  chance de responder de verdade.
- **`Focadu.Tests` so testa dominio puro** (entidades, `Weekly`/`Daily`, `EvaluationPolicy`) e
  funcoes `internal static` da camada de aplicacao que nao dependem de repositorio
  (`SubmitActivityResponseUseCase.ResolveScore`, `DailyStateMapper.ToDto`) - **nao ha fakes de
  `ICourseRepository`/`IWeeklyRepository`/etc. em lugar nenhum do projeto**, entao casos de uso
  simples de leitura/mapeamento (`GetCourseDetailUseCase`, `GetWeeklyDetailUseCase`) nunca tiveram
  teste dedicado; a checagem desses fica pra verificacao ao vivo (Postgres real + `dotnet run` +
  requisicoes reais), nao unit test. Se uma fase futura decidir que vale a pena introduzir fakes de
  repositorio, isso e uma decisao de infraestrutura de teste nova pro projeto, nao so "mais um
  teste".
- `WeeklyOverviewDto` (dentro de `CourseDetailDto`, usado por `CourseDetailPage` no frontend) tem
  um campo `Days` (Fase 8) com status por dia - pensado pra grids de navegacao, nao pra logica de
  negocio. Se o numero de Dailies por Weekly crescer muito, isso engorda a resposta de
  `GET /api/courses/{courseId}` proporcionalmente.
- `GET /api/today` e `GET /api/dailies/{dailyId}` retornam o mesmo `DailyStateDto` -
  `AccessMode` e o campo que decide se a tela deve ser editavel ou so leitura.
- `POST .../responses` nao tem mais campo `Score` - todo tipo de atividade calcula o Score no
  servidor (ver "Score no servidor para todo tipo de atividade" acima). Qual campo usar
  (`SelectedOptionId`/`Transcript`/`SelectedRoleplayNodeId`/arquivo de audio) depende do
  `ActivityType`/`AnswerMode`.
- Gabarito (`IsCorrect`/`ExpectedAnswer`/`TerminalQuality`) so aparece depois da primeira
  resposta - o frontend precisa re-buscar o estado da Daily apos um submit pra ver o gabarito
  revelado (o resultado do submit em si nao traz as opcoes/nodes atualizados).
- Toda `Entity` precisa de `ValueGenerated.Never` no `Id` pra funcionar corretamente com EF Core
  quando adicionada a um grafo ja tracked (ver "Bug de concorrencia do EF Core", Fase 3) - se uma
  fase futura adicionar uma entidade nova, isso ja esta coberto globalmente em
  `FocaduDbContext.OnModelCreating`, nao precisa reconfigurar por entidade.
- **Resolvido na Fase 13:** `GET /api/today` nao assume mais "1 Course Active" global - resolve
  pela Enrollment do usuario logado. Ainda assume no maximo 1 Enrollment por usuario (`409
  multiplas_matriculas_ativas` se houver mais de uma) - quebra sozinho se um usuario puder se
  matricular em varios cursos ativos ao mesmo tempo sem um jeito de escolher "qual curso agora".
- No frontend, qualquer tela que mostre mais de uma "atividade" em sequencia (como `TodayPage`)
  precisa decidir explicitamente *quando* avançar pra proxima, nao só reagir a toda mudança de
  dado - ver "Maquina de passo (Step)" na secao de Frontend. Reagir automaticamente a cada
  atualizacao de estado engole o feedback da ultima resposta - o mesmo cuidado vale pra qualquer
  estado com "tentar de novo" (ex: permissao de microfone negada): nunca esconder a acao que
  permite ao usuario reagir ao proprio erro.
- Model binding malformado (JSON invalido, `multipart/form-data` sem o campo esperado) lanca
  `BadHttpRequestException` *antes* do endpoint rodar - `ApiExceptionHandler` ja trata isso
  globalmente (`requisicao_invalida`, 400) desde a Fase 5, nenhum endpoint novo precisa se
  preocupar com isso individualmente.
- **`GET /api/curated-content/{id}` (Fase 7)** existe pra dar ao frontend o conteudo de uma
  `DailyActivity` Reading/Video - se uma fase futura extinguir esse padrao (ex: embutir o
  `CuratedContent` direto no `DailyActivityDto`), vale revisar se o endpoint isolado ainda e
  necessario (autoria/`/admin/conteudo` nao o usa, so `ReadingActivity`/`VideoActivity`).
- **Resolvido na Fase 5, nao e mais pendencia:** transcricao/avaliacao por voz validadas
  end-to-end com uma chave Groq real - transcricao (`whisper-large-v3`) funcionou de primeira;
  avaliacao expos que `llama-3.3-70b-versatile` (escolha original) tinha saido do catalogo da
  Groq (`model_not_found`), corrigido pra `openai/gpt-oss-120b`. Resposta real obtida: score,
  feedback em portugues e transcricao corretos. Ver `ponytail:` em `GroqContentEvaluationService`.
- **Resolvido na Fase 5, superado na Fase 38b:** a ambiguidade de `/api/today` quando 2+ Dailies
  compartilhavam a mesma `Date` (Daily normal + Daily de reforco geradas no mesmo dia) era
  resolvida priorizando a nao-reforco em `Weekly.GetDailyByDate`. Esse metodo foi removido na
  Fase 38b (resolucao de "hoje" deixou de comparar `Date` inteiramente - ver `DailySequencing`) -
  a ambiguidade nem chega a existir mais, ja que `FindNext` sempre filtra `!IsReinforcement`.
- **GitHub nunca foi testado contra a API real** (Fase 11, decisao explicita do usuario) - o
  codigo (`GitHubService`, `CommitModuleSummaryUseCase`, `SubmitPublicationUseCase`,
  `EvaluateWeeklyProjectUseCase`) espelha o padrao ja comprovado do Groq, mas so foi verificado
  estruturalmente (Playwright `page.route()` mockando as respostas). Revisao de codigo nesta fase
  (sem chave real ainda) achou e corrigiu um bug real - `CommitFileAsync` fazia `PUT contents` sem
  `sha`, o que quebra ao sobrescrever um arquivo que ja existe (422) - e removeu `GitHubOptions.
  Username` (dead config, nunca foi lido). Validacao ao vivo continua pendente (mesmo padrao da
  Fase 5 com o Groq, feita pelo Falves): checklist completo em "Como configurar o token do
  GitHub" acima, cobrindo `github-commit` (incluindo commitar 2x pro mesmo modulo, o caso que
  quebrava), `submit` com repo publico/privado/inexistente, `POST /project/evaluate` contra
  codigo de verdade, e token sem escopo `repo`.
- **Validacao de publicacao no LinkedIn e so estrutural** (Fase 11) - confirma o formato da URL
  (`linkedin.com/posts/...` ou `linkedin.com/feed/update/...`), nunca o conteudo do post. Nao ha
  API gratuita simples de conteudo do LinkedIn pra resolver isso - limitacao conhecida, ja
  sinalizada assim no prompt original da fase.
- **Resolvido na Fase 13a:** bloqueio de modulo ja atravessa Monthlies - a troca de
  `GetByMonthlyIdAsync` por `GetByEnrollmentIdAsync` em `StartOrResumeDailyUseCase` (feita pelo
  refactor Template/Instance, nao um pedido explicito) faz o bloqueio olhar a Weekly `Number - 1`
  em qualquer Monthly da mesma Enrollment, nao so dentro do mesmo Monthly. Ver "Publicacao publica
  e bloqueio de modulo" acima.
- **Toda navegacao 1:1 nova entre entidades precisa de `HasOne`/`WithOne` explicito** na
  `IEntityTypeConfiguration` correspondente (ver "Bug real: navegacao 1:1 sem HasOne", secao de
  Persistencia) - a coluna FK + indice unico sozinhos nao bastam pro EF Core reconhecer a
  propriedade como navegacao inclui­vel.
- **Qualquer estado local (`useState`) de um componente que deveria resetar ao trocar de
  "entidade exibida" via query string precisa de uma `key` na instancia** (ver "Bug real: modal
  preso ao trocar de Weekly", secao de Frontend) - trocar so a prop nao remonta o componente
  sozinho em React.
- **Nunca dispare um refetch que muda `loading` do componente pai enquanto um modal filho ainda
  esta mostrando seu proprio resultado** (ver "Bug real: `onPublished` desmontava o modal", secao
  de Frontend) - o refetch precisa esperar o usuario decidir sair (`onClose`), nao disparar no
  meio do fluxo de sucesso/erro do modal.
- **"Auditoria de Repositorios" (citada no prompt da Fase 11 como proxima fase) - decisao de
  escopo tomada em 2026-08-31: estatica (SAST)**, ler o codigo do repo sem executar nada, mesmo
  padrao sincrono do fluxo de avaliacao atual - dinamica (DAST, testar a app rodando de verdade)
  descartada por enquanto. **Atualizado na Fase 46**: o snapshot de codigo que a auditoria
  reaproveitaria deixou de vir do GitHub (`IGitHubService.GetContentSnapshotAsync`) e passou a vir
  do Forgejo interno (`IForgejoService.GetContentSnapshotAsync`, mesma forma) - `EvaluateWeeklyProjectUseCase`
  ja usa esse caminho novo. O gatilho tambem ficou mais concreto: o webhook de push do Forgejo
  (ainda nao construido) dispararia o mesmo pipeline a cada `git push` do aluno, nao so na
  submissao manual - ver "Forgejo interno" acima.
  **Lista de checks definida em 2026-08-31 (Fase 24c)** - escopo web (curriculo do curso, nao
  scanner generico de qualquer linguagem), cada um marcado com como seria detectado dado o modelo
  atual (determinístico/regex em C#, mais barato e sem alucinacao, vs. julgamento via LLM Groq
  igual `GroqProjectEvaluationService`, pra tudo que exige entender o codigo):
  1. **Segredo commitado** (regex) - chave de API/token, private key (`-----BEGIN...PRIVATE KEY-----`),
     AWS key (`AKIA[0-9A-Z]{16}`), connection string com senha em texto puro, `.env`/`secrets.json`
     presente na arvore. Severidade alta.
  2. **Dependencia desatualizada/vulneravel conhecida** (LLM, heuristico) - le `package.json`/
     `requirements.txt`/`*.csproj`/`go.mod` e aponta versoes que o modelo reconhece como antigas/com
     CVE conhecida da propria base de conhecimento - NAO e consulta a uma base de vulnerabilidades
     ao vivo (nao e OSV/Snyk), best-effort e limitado ao corte de treino do modelo, precisa ficar
     claro no texto do finding pro aluno nao confiar cegamente.
  3. **Header de seguranca ausente na configuracao do servidor** (LLM) - procura configuracao
     explicita (Express/helmet, middleware ASP.NET, nginx.conf) de `Content-Security-Policy`,
     `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`. So sinaliza ausencia
     quando ha um servidor HTTP de verdade no repo (nao se aplica a script/CLI sem servidor).
  4. **Injecao de SQL** (LLM) - concatenacao/interpolacao de string direto numa query, em vez de
     parametrizacao/ORM.
  5. **XSS refletido/armazenado** (LLM) - saida de dado do usuario sem escape (`innerHTML`,
     `dangerouslySetInnerHTML`, `render_template_string`, eco direto de query param em HTML) sem
     sanitizacao visivel.
  6. **CORS permissivo** (LLM) - `Access-Control-Allow-Origin: *` combinado com
     `Access-Control-Allow-Credentials: true`, ou `cors()`/equivalente sem `origin` restrito.
  7. **Senha em texto puro / hash fraco** (LLM) - senha comparada/armazenada sem hash, ou hash
     MD5/SHA1 sem salt, em vez de bcrypt/argon2/scrypt.
  8. **Autenticacao/autorizacao ausente em rota sensivel** (LLM) - endpoint que mexe em dado de
     usuario (delete/update/admin) sem nenhuma checagem de sessao/token visivel no handler.

  Cada finding devolvido estruturado (arquivo, categoria, severidade alta/media/baixa, trecho,
  explicacao curta em portugues) - mesmo formato JSON-mode que `GroqProjectEvaluationService` ja
  usa pra nao inventar nota fora do formato esperado. **Ainda nao implementada** - esta lista fecha
  o unico bloqueio que faltava ("falta definir os checks"), pronta pra virar prompt tecnico de uma
  proxima fase.
- **Resolvido na Fase 13a:** todo endpoint de curso/weekly/daily/publicacao/conteudo curado agora
  tem `[Authorize]` e filtra pela Enrollment do usuario logado (ver "Superficie da API" e "Modelo
  de dominio" acima) - a excecao documentada e `/admin/conteudo`, que ainda depende de endpoints
  de autoria que nao foram adaptados pro lado Template (ver bullet acima).
- **Resolvido, nao e mais pendencia:** botao de logout na UI - `SettingsMenu.tsx` chama
  `POST /api/auth/logout`.
- **`IJwtTokenService` so gera token, nao valida** - a validacao de qualquer JWT recebido e feita
  pelo middleware `JwtBearer` do ASP.NET Core (`Program.cs`), nao por um metodo do port. Se uma
  fase futura precisar validar um token fora do pipeline HTTP normal (ex: um worker em background),
  vale revisitar essa decisao.
- **`Jwt:SecretKey` e a unica config nova que derruba o boot da Api se ausente** (mesmo tratamento
  da connection string) - diferente do padrao "ausente e tolerado" usado por `Groq:ApiKey`/
  `GitHub:Token`. Motivo: autenticacao virou fundacao a partir desta fase, no sentido literal de
  que nada relacionado a sessao funciona sem essa chave.
- **Propriedade computada sem campo de apoio (`Weekly.Number`, `Daily.Activities` etc., Fase 13a)
  precisa de `builder.Ignore(...)` explicito na `IEntityTypeConfiguration`** - sem isso o EF Core
  tenta mapea-la como navegacao/coluna de verdade e derruba o `DbContext` inteiro na primeira
  query com `InvalidOperationException: "No backing field was found for property..."`. Qualquer
  propriedade nova do tipo `=> Template.Algo` numa fase futura precisa do mesmo tratamento (ver
  "Persistencia" acima).
- **Indice unico que envolve uma entidade que passou a ser Template compartilhado precisa incluir
  o "dono" por usuario na chave** (ver `ActivityResponses (DailyId, ActivityId, AttemptNumber)`,
  Fase 13a) - `ActivityId` sozinho (ou junto de `AttemptNumber`) colide entre usuarios diferentes
  assim que a entidade referenciada deixa de ser 1-por-instalacao e vira curriculo compartilhado.
  Esse bug foi pego em design, nunca chegou a rodar - qualquer indice unico novo que referencie
  uma entidade do lado Template precisa da mesma pergunta ("2 usuarios diferentes podem bater
  nesse mesmo par de valores?").
- **Matricula em mais de um Course quebra `/hoje` (`GetTodayUseCase`, Fase 13a) - nao corrigido na
  Fase 13b.** `CourseSelectionPage` so filtra cursos em que o usuario ainda nao esta matriculado
  (via `GetAvailableCoursesUseCase`), mas nao impede matricular-se num 2° curso enquanto ja tem 1
  ativo - hoje isso nunca acontece na pratica (so existe 1 Course seedado), mas assim que um
  2° Course real existir, um usuario que se matricule em ambos passa a receber
  `409 multiplas_matriculas_ativas` em `/hoje` pra sempre (`GetTodayUseCase` so aceita exatamente
  1 Enrollment). *ponytail: guarda client-side ausente de proposito (YAGNI - sem 2° curso real
  pra exercitar o caminho); se/quando um 2° Course for seedado, adicionar o guard em
  `CourseSelectionPage` (ou resolver `/hoje` pra aceitar N enrollments, escolhendo 1) antes disso
  virar alcancavel de verdade.*
- **`GetCourseRankingUseCase.ResolveCurrentWeekly` ainda resolve a "Weekly atual" comparando
  `Daily.Date` com "hoje"** (ver "Ranking" acima) - a mesma fragilidade de fundo corrigida no
  atalho "/hoje" na Fase 38b (`Daily.Date` e fixado de uma vez na matricula e pode divergir do
  ritmo real do aluno). Nao corrigido nesta fase por estar num caso de uso separado, so
  descoberto na varredura da Fase 38b - o efeito pratico e mais brando aqui (afeta so o RECORTE
  do ranking - qual Weekly conta pro escopo `weekly`/`monthly` - nunca bloqueia acesso a
  conteudo), mas o mesmo `DailySequencing` desta fase resolveria isso tambem se/quando for
  revisitado.

### Termos, privacidade e aceite (Fase 102)

- `User.TermsAcceptedVersion`/`TermsAcceptedAt`; `LegalDocuments.CurrentVersion` (backend) e `LEGAL_VERSION` (`frontend/src/lib/legal.ts`) precisam subir juntas quando o texto muda.
- `POST /api/auth/register` exige `acceptTerms: true` (400 `termos_obrigatorios`). `UserDto.TermsAcceptancePending` = versao aceita diferente da vigente; `ProtectedRoute` e `resolveLandingPath` levam para `/aceite`.
- Paginas publicas `/termos` e `/privacidade` (`LegalPage`, texto em `lib/legal.ts`); rodape `LegalFooter` no login e nas Configuracoes. Detalhe em `docs/fase-102/`.