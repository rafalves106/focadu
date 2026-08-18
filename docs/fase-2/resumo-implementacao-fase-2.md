# Resumo — Fase 2: Monorepo Git + API Real (Backend .NET)

## O que foi implementado

**Parte 1 — Monorepo e Git**

- Estrutura de pastas alvo definida e parcialmente criada: `frontend/README.md` e
  `whatsapp-service/README.md` (placeholders), `.gitignore` novo na raiz cobrindo .NET (`bin/`,
  `obj/`, `*.user`), Node (`node_modules/`, `.env`, `.env.local`, `dist/`, `build/`) e artefatos
  genericos (IDE, OS, `TestResults/`).
- A movimentacao fisica de `Focadu.slnx`, `docker-compose.yml`, `src/` e `tests/` para dentro de
  `backend/`, o `git init` e o commit inicial foram feitos pelo Falves manualmente (a partir de um
  script que entreguei), porque mover/apagar arquivo estava bloqueado por permissao nesta sessao -
  ver secao de duvidas/pontos abertos abaixo para o detalhe (incluindo uma correcao de percurso:
  a primeira tentativa rodou num `cmd.exe`, nao PowerShell, entao o `git commit` inicial saiu
  antes da movimentacao acontecer de fato; corrigimos com `git commit --amend` depois de mover os
  arquivos, para o unico commit do repositorio refletir a estrutura correta).
- Confirmado apos a movimentacao: `dotnet build backend/Focadu.slnx` e
  `dotnet test backend/tests/Focadu.Tests/Focadu.Tests.csproj` continuam funcionando identicos
  (27 testes passando) a partir do novo local, e `git status` fica limpo (o `.gitignore` da raiz
  ignora `bin/`/`obj/` em qualquer profundidade, entao os artefatos de build gerados apos o commit
  nao aparecem como pendentes).

**Parte 2 — API real**

- `DomainException` ganhou um `Code` (string, com default `"regra_de_negocio_violada"`) alem da
  `Message` - a Api usa isso para decidir o status HTTP sem depender do texto da mensagem.
  Codigos especificos foram adicionados nos pontos de `Weekly.cs` e `Daily.cs` que a nova Api
  realmente alcanca (`daily_futura`, `daily_em_andamento`, `daily_somente_leitura`,
  `daily_ja_concluida`, `daily_nao_iniciada`, `daily_nao_em_andamento`, `daily_nao_encontrada`,
  `atividade_nao_encontrada`, mais dois codigos defensivos de reforco).
- `IWeeklyRepository.GetByDateAsync(courseId, date)` - metodo novo, usado pelo atalho "/hoje",
  implementado com uma query direta (join via Monthlies) em vez de carregar o curso inteiro em
  memoria.
- 3 novas excecoes em `Focadu.Application.Exceptions`: `NotFoundException` (404),
  `ConflictException` (409), `ValidationException` (400) - complementam `DomainException` no
  mesmo pipeline de tratamento de erro.
- Casos de uso novos: `ListCoursesUseCase`, `GetCourseDetailUseCase`, `GetWeeklyDetailUseCase`,
  `GetDailyStateUseCase`, `GetTodayUseCase`. Os 3 existentes da Fase 1
  (`StartOrResumeDailyUseCase`, `SubmitActivityResponseUseCase`, `CompleteDailyUseCase`) foram
  atualizados para usar `NotFoundException` e para os dois primeiros retornarem o `DailyStateDto`
  completo (nao mais um DTO fino).
- DTOs novos cobrindo cada tela: `CourseSummaryDto`/`CourseDetailDto` (com progresso e sessoes
  de reforco), `WeeklyDetailDto` (desempenho por Daily), `DailyStateDto` (estado completo de uma
  Daily, incluindo atividades, opcoes de quiz, grafo de roleplay e historico de respostas) - um
  `DailyStateMapper` interno e compartilhado entre os 4 casos de uso que retornam esse shape.
- `Focadu.Api.ErrorHandling.ApiExceptionHandler` (`IExceptionHandler` do ASP.NET Core),
  traduzindo qualquer excecao (`DomainException`, `NotFoundException`, `ConflictException`,
  `ValidationException`, ou qualquer outra) para `{ "error": "codigo", "message": "..." }` com o
  status HTTP correspondente.
- `RouteParsing.RequireGuid` - parse explicito de Guid nos parametros de rota (em vez de
  `{id:guid}`), para um Guid malformado tambem cair no formato de erro padrao.
- 8 endpoints reais em `Focadu.Api/Program.cs`: listar cursos, detalhe de curso, detalhe de
  semana, estado de Daily, atalho "hoje", iniciar/retomar Daily, submeter resposta (201), concluir
  Daily - ver `docs/ARQUITETURA.md` (secao "Superficie da API") para a tabela completa.
- API testada de ponta a ponta manualmente (subida em background, `curl` contra `/health` e os
  cenarios de erro) - confirmado que o wiring de DI funciona em runtime, e que erros de
  banco/validacao/negocio sempre respondem no formato padrao sem derrubar o processo.

## Decisões técnicas tomadas que não estavam no prompt original

1. **Rotas da Api nao espelham as rotas do frontend.** O prompt lista rotas como
   `/start?course=&weekly=&daily=` e `/hoje` como contexto de *quais telas* a Api precisa
   suportar, nao como o *formato exato* das rotas do backend. Desenhei rotas REST convencionais
   (`GET /api/weeklies/{weeklyId}`, `GET /api/today`, etc.) que entregam os dados certos, sem
   tentar replicar query strings do router do frontend no lado do servidor.
2. **Codigo de erro por excecao, nao por endpoint.** Para satisfazer "400 ou 409, conforme o
   caso" com codigos especificos (nao um codigo generico unico), `DomainException` ganhou um
   `Code` opcional (default `"regra_de_negocio_violada"`). So os pontos de `Weekly.cs`/`Daily.cs`
   que a nova Api realmente alcanca receberam codigos especificos - as ~20 validacoes de criacao
   de conteudo em outras entidades (`Course`, `Monthly`, `DailyActivity`, `QuizOption`,
   `RoleplayNode`, etc.) ficaram no default, porque nenhum endpoint de autoria existe ainda para
   alcanca-las. Fica documentado e testado (`DomainExceptionCodeTests`) para nao ser esquecido
   quando endpoints de autoria forem criados.
3. **`NotFoundException`/`ConflictException`/`ValidationException` como tipos separados de
   `DomainException`.** "Recurso nao encontrado" (Id que nao existe) e "entrada invalida" (Guid
   malformado, campo obrigatorio ausente) nao sao regras de *dominio* sendo violadas - sao
   preocupacoes de orquestracao/Api. Separar deixa `DomainException` fiel ao que ela e (uma
   invariante de negocio quebrada) e deixa o pipeline de erro da Api explicito sobre a origem de
   cada erro.
4. **`GET /api/dailies/{dailyId}` e `GET /api/today` retornam o mesmo `DailyStateDto`, sempre com
   a lista completa de atividades**, em vez de um shape reduzido para o modo `ReadOnly`. O
   prompt diz "se for uma Daily passada, retorna apenas o modo resumo/gabarito" - interpretei
   isso como "o *proposito* da resposta e resumo/gabarito, sinalizado por `AccessMode`", nao como
   "um formato de resposta estruturalmente diferente". Isso evita duas formas de serializar a
   mesma Daily e deixa a decisao de renderizacao (editavel vs. so-leitura) inteiramente do lado
   do frontend, olhando `AccessMode`.
5. **`QuizOptions[].IsCorrect` e `ExpectedAnswer` nao sao escondidos enquanto a atividade esta
   `Pending`.** Considerei uma versao que so revela a resposta certa depois que a atividade e
   respondida (para nao "vazar o gabarito" via rede antes de o usuario responder), mas decidi
   NAO implementar isso nesta fase: (a) o prompt nao pediu isso explicitamente; (b) como
   `SubmitActivityResponseUseCase` ainda recebe o `Score` pronto do chamador (proximo item),
   esconder `IsCorrect` nao fecha a lacuna real de "o cliente pode mandar qualquer Score" -
   entao a complexidade extra nao compraria seguranca de verdade neste estagio. Documentado como
   ponto aberto abaixo, para o Falves decidir se isso deve virar uma politica real numa fase
   futura (junto com o calculo de Score no servidor).
6. **`SubmitActivityResponseUseCase` continua recebendo o `Score` pronto** (nao computa a partir
   de `SelectedOptionId` nem de resultado de roleplay). O prompt so pediu para reusar esse caso
   de uso com DTOs/validacao/erros - nao pediu para fechar a logica de calculo de nota, que
   dependeria de decisoes de produto (como pontuar Roleplay? Cloze sem IA?) fora do escopo desta
   fase. Ver ponto aberto abaixo.
7. **`GET /api/today` assume exatamente um Course com `Status = Active`.** O dominio nao tem
   conceito de usuario/curso "atual" (fora de escopo confirmado nesta fase), entao o atalho
   "/hoje" precisava de alguma forma de resolver qual curso olhar. Dado que o produto real tem
   um unico curso piloto ("Web Security"), assumir "o unico Course Active" e um default de baixo
   risco (zero ou 2+ cursos ativos viram erros claros, 404/409, em vez de um comportamento
   silencioso errado).
8. **Parametros de rota (`dailyId`, `activityId`, etc.) sao `string`, parseados manualmente para
   `Guid` via `RouteParsing.RequireGuid`**, em vez de usar a constraint `{id:guid}` do ASP.NET
   Core. A constraint faz o roteamento simplesmente nao casar a rota para um valor invalido
   (virando um 404 sem corpo padronizado); o parse manual garante que *toda* entrada invalida,
   Guid malformado incluso, sempre vira `{ error, message }` com 400.
9. **`Score` no request de submissao e `int?`, nao `int`.** Um campo `int` normal desserializa
   `{}` como `Score = 0` silenciosamente, sem indicar "campo ausente". Usar `int?` permite
   distinguir "nao veio" (`null`) de "veio 0" e validar os dois casos com mensagens especificas.

## Estrutura de arquivos criada

```
frontend/README.md
whatsapp-service/README.md
.gitignore                              (raiz, reescrito - cobre .NET + Node + generico)

src/Focadu.Domain/
  Exceptions/DomainException.cs         (alterado: + Code)
  Weeklies/Weekly.cs                    (alterado: codigos nos throws alcancaveis pela Api)
  Dailies/Daily.cs                      (alterado: codigos nos throws alcancaveis pela Api)
  Repositories/IWeeklyRepository.cs     (alterado: + GetByDateAsync)

src/Focadu.Application/
  Exceptions/NotFoundException.cs
  Exceptions/ConflictException.cs
  Exceptions/ValidationException.cs
  Shared/ReinforcementDtos.cs
  Courses/Dtos.cs
  Courses/ListCoursesUseCase.cs
  Courses/GetCourseDetailUseCase.cs
  Weeklies/Dtos.cs
  Weeklies/GetWeeklyDetailUseCase.cs
  Dailies/Dtos.cs                       (reescrito: DailyStateDto e afins)
  Dailies/DailyStateMapper.cs
  Dailies/GetDailyStateUseCase.cs
  Dailies/GetTodayUseCase.cs
  Dailies/StartOrResumeDailyUseCase.cs  (alterado)
  Dailies/SubmitActivityResponseUseCase.cs  (alterado)
  Dailies/CompleteDailyUseCase.cs       (alterado)
  DependencyInjection.cs                (alterado)

src/Focadu.Infrastructure/
  Persistence/Repositories/WeeklyRepository.cs  (alterado: + GetByDateAsync)
  Persistence/Repositories/CourseRepository.cs  (alterado: Include Monthlies em GetAllAsync)

src/Focadu.Api/
  Program.cs                            (reescrito: 8 endpoints reais)
  ErrorHandling/ErrorResponse.cs
  ErrorHandling/ApiExceptionHandler.cs
  Contracts/RouteParsing.cs
  Contracts/SubmitActivityResponseRequest.cs
  Focadu.Api.http                       (atualizado)

tests/Focadu.Tests/
  Domain/DomainExceptionCodeTests.cs

docs/
  ARQUITETURA.md                        (reescrito - monorepo + superficie da Api)
  fase-2/resumo-implementacao-fase-2.md (este arquivo)
```

Estrutura alvo de pastas (`backend/`, `frontend/`, `whatsapp-service/` na raiz) documentada em
detalhe em `docs/ARQUITETURA.md`; a movimentacao fisica em si ficou para o Falves rodar (ver
duvidas/pontos abertos).

## Testes

27 testes unitarios xUnit (21 da Fase 1 + 6 novos), todos passando (`dotnet test` -> `Aprovado:
27, Com falha: 0`). Novos:

- `DomainExceptionCodeTests` (`tests/Focadu.Tests/Domain/`): trava que `Weekly.EvaluateDailyAccess`,
  `Weekly.StartOrResumeDaily`, `Daily.SubmitActivityResponse` e `Daily.Complete()` lancam
  `DomainException` com o `Code` exato que `ApiExceptionHandler` espera
  (`daily_futura`, `daily_em_andamento`, `daily_nao_iniciada`, `daily_nao_em_andamento`,
  `daily_somente_leitura`), mais um teste confirmando o fallback `"regra_de_negocio_violada"`
  quando nenhum `Code` e passado explicitamente.

Alem dos testes automatizados, a Api foi validada manualmente em runtime (subida via
`dotnet run`, sem Postgres disponivel no ambiente):

- `GET /health` -> 200.
- `GET /api/courses/not-a-guid` -> 400, `{ "error": "id_invalido", ... }`.
- `GET /api/courses` (sem Postgres rodando) -> 500, `{ "error": "erro_interno", ... }`, processo
  continua de pe (confirmado com um `GET /health` logo depois).
- `POST .../responses` com corpo `{}` -> 400, `{ "error": "score_obrigatorio", ... }`.
- `POST .../responses` com `score: 150` -> 400, `{ "error": "score_invalido", ... }`.
- `POST .../responses` com `activityId` invalido -> 400, `{ "error": "id_invalido", ... }`.

O que **nao** foi validado: nenhum fluxo de leitura/escrita de dados reais (precisa de Postgres
rodando com dados de seed, nenhum dos dois disponivel neste ambiente/fase).

## Dúvidas ou pontos abertos para a próxima fase

- **Bloqueio de permissao para mover/apagar arquivo nesta sessao (resolvido via execucao manual
  pelo Falves).** `mv`, `Move-Item`, `rm` e `Remove-Item` foram todos negados para mim, mesmo em
  chamadas isoladas sem encadeamento - diferente da Fase 1, onde so `rm`/`Remove-Item` tinham sido
  testados e bloqueados, confirmamos agora que *mover* tambem esta bloqueado, nao so apagar. O
  Falves rodou a movimentacao e o Git manualmente a partir de um script que entreguei; a primeira
  tentativa foi num `cmd.exe` (nao PowerShell), entao os cmdlets do script nao existiam la e so o
  `git init`/`add`/`commit` rodaram - o que gerou um primeiro commit com a mensagem certa mas o
  conteudo errado (estrutura antiga, sem `backend/`). Reentreguei o mesmo script em sintaxe
  `cmd.exe` (`mkdir`/`move`/`dir` em vez de `New-Item`/`Move-Item`/`Get-ChildItem`), e corrigimos
  o commit com `git commit --amend` depois da movimentacao de verdade acontecer - o repositorio
  tem hoje um unico commit raiz, correto. **Confirmado e concluido**, nao e mais um ponto aberto -
  registrado aqui so como contexto de por que o histórico teve essa volta.
- **Calculo de Score continua no cliente.** `SubmitActivityResponseUseCase` recebe o `Score`
  pronto - nao ha logica de servidor calculando a partir de qual opcao foi escolhida (Quiz/
  WordMatch) nem via avaliacao de IA (Cloze/texto livre) nem via resultado de roleplay. Isso
  significa que, tecnicamente, qualquer chamador pode mandar `score: 100` para qualquer
  atividade agora - o dominio nao tem como distinguir "resposta certa" de "score inventado" neste
  estagio. Uma fase futura provavelmente precisa decidir: (a) calcular o Score no backend para
  Quiz/WordMatch a partir de um `SelectedOptionId` (sem precisar de IA), e (b) como/quando
  conectar `IContentEvaluationService` para Cloze/texto livre e Roleplay.
- **Gabarito (`IsCorrect`/`ExpectedAnswer`/`TerminalQuality`) sempre visivel no `DailyStateDto`,
  mesmo antes de a atividade ser respondida.** Documentado como decisao consciente (item 5 da
  secao acima) - mas vale o Falves confirmar se isso e aceitavel para o produto, ja que uma vez
  que o frontend existir (Passo 3) e enviar essas respostas por HTTP, um usuario curioso
  conseguiria ver o gabarito no DevTools do navegador antes de responder.
- **`GET /api/today` assume um unico Course `Active`.** Funciona hoje (um curso piloto), mas
  precisa de um plano diferente se/quando o produto crescer para multiplos cursos ativos - o que
  provavelmente exige resolver o conceito de usuario/"curso atual" primeiro.
- **Sem endpoint de autoria de conteudo.** Nao ha como criar Course/Monthly/Weekly/Daily/
  DailyActivity/CuratedContent pela Api ainda - todo o conteudo do curso piloto precisa ser
  inserido via seed/script direto no banco (nao implementado em nenhuma fase ate agora). Se o
  Passo 3 (frontend) precisar demonstrar fluxos reais, um seed script e um pre-requisito.
- **JSON malformado no corpo do request pode nao usar o envelope de erro padrao.** Documentado em
  `docs/ARQUITETURA.md` - nao investiguei a fundo o comportamento exato do model binding do
  ASP.NET Core 10 para esse caso especifico (diferente de "campo ausente", que e tratado
  explicitamente); fica como ponto a testar/corrigir numa fase futura se for relevante.
- **Schema ainda nao validado contra Postgres real** - pendencia carregada da Fase 1, continua
  sem Docker disponivel neste ambiente de desenvolvimento.
