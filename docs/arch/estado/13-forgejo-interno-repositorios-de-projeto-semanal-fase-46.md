## Forgejo interno - repositorios de Projeto Semanal (Fase 46)

Antes desta fase, o repositorio do Projeto Semanal era criado pelo proprio aluno no GitHub
pessoal dele e a URL era colada manualmente (`WeeklyProjectPage`). Desde a Fase 46, a Focadu
hospeda e provisiona esses repositorios sozinha, num **Forgejo self-hosted** (container `forgejo`
novo, `codeberg.org/forgejo/forgejo:9`, SQLite - sem Postgres proprio, app isolada sem join com o
dominio C#) - ver `secret/rascunhos/repositorios-gerenciados-projeto-semanal.md` pro raciocinio
completo por tras da decisao.

**Visibilidade (Fase 100): repositorio de aluno e privado.** O Forgejo forca o fork a ter a visibilidade da origem (um fork nao
pode ser mais privado que o template, nem tornado privado depois), e ate a Fase 99 os templates eram publicos, entao todo fork
nascia publico e um aluno lia o repositorio do outro (o token dele, escopo `write:repository`, enxerga todo repo publico).
Desde a Fase 100 o codigo sabe fazer isso, **atras de `Forgejo__RequirePrivateForks` (desligado por padrao)**: os templates passam a ser **privados** (`publicar_modelo_forgejo.py` ja os cria assim) e `ForkTemplateAsync` faz, em ordem:
`PUT /repos/focadu-admin/{template}/collaborators/{aluno}` (permissao `read`, so o necessario para o fork), o fork em nome do aluno
e `RequirePrivateFork` - se o fork voltar publico, falha fechado com `forgejo_fork_publico` em vez de seguir publico em silencio
(vale tambem no caminho de reaproveitar o fork que ja existe, 409). `docker-compose.yml`: `FORGEJO_DEFAULT_PRIVATE` e
`FORGEJO_REQUIRE_SIGNIN_VIEW` (padroes `public`/`false`; ligar com a chave do backend, as tres juntas). **Ainda desligado em producao**
(o bloqueio do README saiu na Fase 100b: `GET /api/weeklies/{weeklyId}/project/readme` serve o `README.md` do fork pelo app, lido com o token de admin, so
para o dono; o botao "Abrir README.md" abre `ProjectReadmeModal`; falta conferir ao vivo e ligar as chaves - ver `docs/fase-100/` e `docs/fase-100b/`). O aluno nunca loga na web do Forgejo (senha aleatoria, so token), entao o
repositorio dele deixa de abrir no navegador sem login; o acesso por git continua pelo token. Verificado ao vivo (14/10/2026,
usuario e repositorio descartaveis, apagados): fork sem leitura = 404; com leitura = 202 e `private: true`; anonimo e outro aluno = 404;
`git ls-remote` anonimo pede senha. Tornar um template privado torna privados os forks dele que ja existem.

**`IForgejoService`** (`Focadu.Application.Ports`) + **`ForgejoService`** (adapter concreto,
`Focadu.Infrastructure.Services`) - mesmo padrao sem SDK do `IGitHubService`/`GitHubService`
(HttpClient cru + `HttpRetry`), 3 operacoes:

- `CreateUserAccountAsync` - cria a conta do aluno via API administrativa (`POST /admin/users`),
  desabilita criacao de repositorio pra ela (`PATCH .../max_repo_creation=0` - "so a Focadu cria
  repositorio", nunca vira um GitHub generico dentro da Focadu). Desde a Fase 60 nao gera token.
- `RegenerateAccessTokenAsync` (Fase 60) - gera o token do aluno sob demanda e revoga o anterior.
  **Ponytail confirmado ao vivo**: `/users/{username}/tokens` recusa autenticacao via API token
  (mesmo com header `Sudo`) - so aceita Basic Auth de verdade (Gitea/Forgejo bloqueiam de
  proposito "um token gerar outro token"). Como a Focadu descarta a senha aleatoria do aluno,
  redefine outra via admin (`PATCH /admin/users/{u}` so com `password`), apaga o token anterior
  pelo nome fixo `focadu-projeto-semanal` (404 = nao havia; nome repetido daria 400) e cria outro,
  as 2 ultimas chamadas com Basic Auth como o aluno - unico caminho deste service que nao usa o
  token administrativo padrao.
- `ForkTemplateAsync` - fork de um repositorio-template (dono: conta administrativa
  `focadu-admin`) pra dentro da conta do aluno, via impersonacao administrativa (header `Sudo`) -
  o template nunca e alterado. **Confirmado ao vivo**: `max_repo_creation: 0` bloqueia o aluno de
  criar repositorio pela propria conta, mas nao impede o fork feito via `Sudo` - o mecanismo de
  restricao funciona exatamente como desenhado. Corpo da requisicao precisa ser `{}` explicito
  (nao `null`/sem `Content-Type`) - confirmado ao vivo, o Forgejo responde `422 "Empty
  Content-Type"` sem isso, mesmo o corpo sendo semanticamente opcional.
- `GetContentSnapshotAsync` - mesma forma que o equivalente do GitHub (arvore recursiva + blobs,
  filtro por extensao/limite de tamanho), reaproveitado por `EvaluateWeeklyProjectUseCase`.

**`UserForgejoAccount`** (`Focadu.Domain.GitHosting`, novo namespace) - 1:1 com `User`, lazy
(mesmo principio de `UserGemBalance`/`UserStreak`, Fase 14): `ForgejoUsername` + `TokenLastEight`/
`TokenGeneratedAt`. Um so token por aluno, reusado por todos os repositorios que sao dele no
Forgejo - nao 1 token por `WeeklyProject`. Username/email derivados deterministicamente do
`User.Id` (nunca do email real do aluno - login no Forgejo em si nao e usado, so o access token).

**Token nunca persistido (Fase 60).** Ate a Fase 59 a coluna `AccessToken` guardava o token em
texto puro e a tela o mostrava sempre. Agora o aluno gera sob demanda (`POST /api/users/me/forgejo-
token`, `GenerateForgejoTokenUseCase` -> `ForgejoTokenDto {forgejoUsername, accessToken,
generatedAt}`, 404 `conta_git_inexistente` sem conta no Forgejo), ve o valor uma unica vez e a
Focadu guarda so os 8 ultimos caracteres (`RegisterGeneratedToken`), que `WeeklyProjectDto.
ForgejoTokenLastEight` expoe pra tela dizer qual token esta valendo. Gerar outro revoga o anterior.
A migration `RemoveStoredForgejoToken` copiou o final dos tokens existentes antes de apagar a
coluna - eles continuam valendo no Forgejo.

**Forks publicos (ponto aberto, Fase 60).** O fork herda a visibilidade do template (publico) e o
codigo nunca define `private`: clone anonimo funciona, push exige o token. Decidir antes de abrir o
Forgejo pra outros alunos.

**`WeeklyTemplate.ForgejoTemplateSlug`** (campo legado, nullable) - nome do repositorio-template no
Forgejo (dono: `focadu-admin`), mantido pela curadoria (mesmo espirito de `secret/curadoria/`) -
sem isso preenchido, aquela semana simplesmente nao recebe repositorio (nao bloqueia a matricula).
Semana sem variante de linguagem (ver abaixo) continua usando esse campo direto, exatamente como
antes da Fase 59.

> **Fase 105 (vale mais que o paragrafo abaixo):** a matricula **nao faz mais fork**. O repositorio nasce quando o projeto abre (Dailies originais concluidas), em `WeeklyProjectRepositoryProvisioner`, chamado por `GetWeeklyDetailUseCase`: conta Forgejo + fork do modelo vigente + `AttachRepository`, idempotente, falha do Forgejo tenta de novo na proxima abertura. Semana com variantes continua forkando na escolha da linguagem. Ver `docs/fase-105/`.

**`EnrollUserInCourseUseCase`** - dentro do mesmo loop que ja cria `Weekly`/`WeeklyProject` pra
cada `WeeklyTemplate` (eager, na matricula - decisao confirmada com o Falves, nao lazy no primeiro
acesso a tela): semana **sem** variante de linguagem (`!HasLanguageVariants`) da fork na hora,
como sempre foi - garante a `UserForgejoAccount` (lazy, uma vez so por matricula) e anexa a URL via
`WeeklyProject.AttachRepository` (so seta `SubmissionUrl`, mantem `Status = Pending`, diferente de
`Submit`). Semana **com** variante nao da fork nenhum aqui desde a Fase 59 - o fork passou pra
escolha da linguagem (`ChooseWeeklyProjectLanguageUseCase`, abaixo). Falha do Forgejo (fora do ar,
etc) **nunca derruba a matricula** - mesmo espirito "bonus, nunca core" ja usado em
`SubmitWeeklyProjectUseCase` pra falha de avaliacao automatica; o projeto so fica sem
`SubmissionUrl`.

### Linguagem do Projeto Semanal (Fase 59, piloto Semana 1: Python/JavaScript)

Pedido do Falves, logo apos a Fase 58 - ver `secret/rascunhos/linguagem-preferida-e-referencias-do-
projeto.md` pro raciocinio completo. O aluno marca no perfil quais linguagens topa usar nos
Projetos Semanais e, quando o projeto de uma semana ja curada por linguagem e desbloqueado, escolhe
(de forma **definitiva**, sem troca depois) em qual delas vai realiza-lo - so entao ganha o
repositorio-modelo (fork daquela linguagem, so o esqueleto - a implementacao e do aluno) e as
referencias (bibliotecas/documentacao) curadas pra ela. Piloto so na Semana 1; as outras 11 seguem
com o comportamento de sempre ate serem curadas.

**`ProjectLanguage`** (`Focadu.Domain.Enums`) - lista fechada, `Python`/`JavaScript`. Nomes que a
Api e o `projeto.json` esperam sao os proprios nomes do enum (case-insensitive), resolvidos por
`ProjectLanguages.TryParse` (`Focadu.Application.Weeklies`, compartilhado entre a Api e o
`CuratedProjectImporter`).

**`WeeklyTemplate.LanguageVariants`** (`WeeklyTemplateLanguage`, novo) - 1 repositorio-modelo
(`ForgejoTemplateSlug`) por linguagem daquela semana. `HasLanguageVariants` decide se a semana
entrou no piloto; `ResolveForgejoTemplateSlug(language)` devolve o slug certo (o da variante
quando ha linguagem escolhida, senao o `ForgejoTemplateSlug` legado).

**`EvaluateWeeklyProjectUseCase`** parou de depender de `IGitHubService`/`GitHubUrlParser` desde a
Fase 46 (que continuam existindo, intocados, so pro fluxo de prova publica de modulo abaixo) -
resolve owner/repo direto (`ForgejoUsername` do aluno + o slug de `ResolveForgejoTemplateSlug`,
desde a Fase 59 - antes era `ForgejoTemplateSlug` direto), sem parsear a `SubmissionUrl`.

**`WeeklyTemplate.References`** (`WeeklyTemplateReference`, novo) - links de referencia (biblioteca/
documentacao), curadoria manual e estatica (cada link conferido contra a documentacao oficial antes
de entrar - nunca gerado por IA, decisao do dono). `Language` nulo = comum a todas as linguagens da
semana (ex: uma RFC); `ReferencesFor(language)` devolve as da linguagem + as comuns, na ordem da
curadoria (`Position`). Registro estruturado (com `Id` e `LastVerifiedAt`) de proposito, nao texto
dentro do `SpecText` - e o que um futuro aviso de "link fora do ar" (painel de gestao, ainda nao
implementado) vai precisar pra apontar pra um link especifico.

**`WeeklyProject.Language`** - nulo ate a escolha, gravada uma unica vez (`ChooseLanguage`, so com
`Status = Pending`) junto da URL do fork daquela linguagem (substitui um eventual `SubmissionUrl`
de fork legado). `Weekly.EnsureProjectLanguageCanBeChosen`/`ChooseProjectLanguage` repetem a mesma
trava de `SubmitProject` - so depois que `AreDailiesComplete()` (decisao do dono: a escolha so
acontece com o projeto ja desbloqueado, igual ao envio). **Fase 69:** a escolha foi pra entrada da
ponte - basta ter concluido as Dailies de conteudo (as sem variante de linguagem), e a escolha troca a
Daily da ponte pra variante daquela linguagem (ver "Semana de 6 dias e ponte" abaixo).

**`ChooseWeeklyProjectLanguageUseCase`** (`POST /weeklies/{id}/project/language`) - valida tudo
(semana com a variante, linguagem marcada no `User.PreferredLanguages`, projeto desbloqueado e
ainda sem linguagem) ANTES de chamar o Forgejo; so grava a escolha depois do fork dar certo, pra
uma falha no meio poder ser tentada de novo sem ficar "meio escolhida". `ForgejoService.
ForkTemplateAsync` ganhou tratamento de 409 (fork ja existe) reaproveitando o repositorio existente
em vez de falhar - cobre exatamente esse caso de retry. 2ª tentativa depois da escolha (mesma
linguagem ou outra) sempre 409 `linguagem_ja_escolhida`.

**`WeeklyProjectDtoMapper`** (`Focadu.Application.Weeklies`, novo - substitui a montagem manual do
DTO que existia em 3 casos de uso) - calcula `ProjectLanguageStep` (`None` = semana sem variante,
comportamento de sempre; `NeedsPreference` = tem variante mas o aluno nao marcou nenhuma linguagem
compativel no perfil; `NeedsChoice` = marcou, falta escolher; `Chosen` = escolhida) e so libera
`SpecText`/`SubmissionUrl`/credenciais/`References` depois de `Chosen` (ou em `None`, que nunca foi
gated) - "o projeto so e disponibilizado depois da escolha da linguagem" (decisao do dono).

**`User.PreferredLanguages`** - marcado na Entrevista de Perfil (`ProfileInterviewPage`, chip igual
ao de interesses), opcional (como os interesses - quem nao marca so ve o aviso na hora de abrir o
projeto de uma semana com variante). `CompleteProfileUseCase` trata a lista nula como "nao mexe"
(edicao de interesses continua funcionando sem reenviar linguagem) e vazia como "limpa".

**Frontend (`WeeklyProjectPage.tsx`)** - os 3 estados novos aparecem no lugar da especificacao,
antes dela ser liberada: aviso pra marcar linguagem no perfil, seletor com **confirmacao em 2
passos** (decisao do dono - a escolha e irreversivel, sem desfazer pelo aluno), e o card de
referencias (so quando ja escolhida). O bloqueio de Dailies (`isLocked`) esconde esses 3 estados
inteiros, nao so o botao de envio - semana com variante ainda bloqueada mostra so o cadeado, igual
a antes desta fase.

**Publicacao no GitHub pessoal do aluno (portfolio) e manual, fora do produto** - decisao
confirmada com o Falves: o aluno adiciona um segundo `git remote` local e da `git push` com as
proprias credenciais (SSH key/`gh auth login` ja configuradas na maquina dele), sem nenhuma
orquestracao da Focadu (nada de push-mirror, nada de token de GitHub pessoal guardado no banco).
Ver "Publicacao publica e bloqueio de modulo" abaixo - esse fluxo (GitHub+LinkedIn, prova publica
de MODULO) e **completamente separado e continua intocado**: o Forgejo e o ambiente de trabalho/
avaliacao do Projeto Semanal, nao substitui a prova publica.

**Bootstrap administrativo (fora de codigo, feito manualmente por enquanto)**: conta
`focadu-admin` + token administrativo criados via CLI (`docker exec ... forgejo admin user
create`/`generate-access-token`), nao pela web -
`FORGEJO__security__INSTALL_LOCK: "true"` pula o wizard de instalacao interativo. Configuracao via
`Forgejo:BaseUrl`/`Forgejo:AdminToken` (mesmo padrao de 3 formas de `GitHub:Token`, nunca bloqueia
o boot se ausente - so as chamadas que precisam falham com erro claro).

**`FORGEJO__server__ROOT_URL` precisa ser setado explicitamente** - sem isso, o Forgejo deriva a
URL de clone da porta *interna* do container (3000), nao da porta que o host expoe, gerando
`clone_url` inacessivel de fora do container (confirmado ao vivo). Porta padrao do Forgejo (3000)
evitada de proposito neste host - ja em uso por outro projeto (`homepage-homepage-1`) - produção
usa 3020 (ver tabela de portas em `docs/DOCKER.md`). **`ROOT_URL` aponta pra
`localhost` por enquanto** (teste rodando no mesmo host) - precisa virar o endereco real
alcancavel pelos alunos antes de qualquer acesso de fora desta maquina.

**`START_SSH_SERVER` precisa ser `"false"` explicito** - `"true"` entra em conflito com o sshd
externo que a propria imagem do Forgejo ja sobe por padrao (`listen tcp :22: bind: address
already in use`, confirmado ao vivo) - o sshd externo ja serve git+ssh sozinho, o servidor Go
interno do Forgejo e redundante e nunca deveria ser ligado nesta imagem.

**Testado ao vivo, ponta a ponta** (nao so leitura de codigo): matricula real via API criou a
conta Forgejo + fork automaticamente, `git clone`/`git commit`/`git push` funcionaram de verdade
com as credenciais devolvidas pela Api, e o snapshot de arvore/blob leu o conteudo pusheado
corretamente - ver `docs/fase-46/resumo-implementacao-fase-46.md` pros 3 bugs reais encontrados
nesse processo (nenhum visivel so por leitura de codigo).

**Pendente pra fases futuras**: SAST em si (Fase 24c, os 8 checks ja escopados, webhook receiver
ainda nao construido - o gancho natural seria o webhook de push do Forgejo disparando o mesmo
pipeline de `GetContentSnapshotAsync` + avaliacao por IA), repositorio-template pras outras 11
semanas do curso piloto, wiring da curadoria pra gerar isso automaticamente.

### Semana de 6 dias e ponte pro projeto (Fase 69)

Desde a Fase 69 a semana N ocupa os **Dias 6N-5 a 6N** (72 no curso): 5 dias de conteudo e, no 6o, a
**ponte** - dia pratico e guiado que liga a teoria ao projeto, curado numa versao por linguagem
(`secret/curadoria/web-security/semana-N/ponte/<linguagem>.json`, mesmo schema de um dia). So a Semana
1 tem ponte curada; as outras semanas ficam com 5 Dailies (o `DayNumber` 6N fica livre).
Desde a Fase 79 a ponte da Semana 1 e "code comigo" (passos de codigo avaliados por IA) - ver a secao
seguinte.

- **Curriculo**: a ponte sao varios `DailyTemplate` no mesmo `DayNumber`, um por `Language`
  (`WeeklyTemplate.AddDailyTemplate(day, language)` - um dia tem OU dia unico OU variantes; indice unico
  `(WeeklyTemplateId, DayNumber, Language)`). O seed importa a pasta `ponte/`
  (`SeedWebSecurityCourseUseCase.ImportBridge`, exige `dayNumber = 6N`).
- **Instancia**: a matricula cria 1 Daily por dia (`DefaultDailyTemplatesByDay`), a ponte na variante
  da menor linguagem. `Weekly.ChooseProjectLanguage` troca a Daily pra variante escolhida
  (`Daily.BindLanguageVariant`, so antes de comecar). Sem linguagem, iniciar a ponte da
  `linguagem_nao_escolhida` (409) e `GET /api/today` devolve `DailyAccessMode.NeedsProjectLanguage` (6)
  sem atividades - o frontend mostra `BridgeLanguageScreen` (escolha em 2 passos, pixel art). Trilha e
  semana mostram "Ponte pro projeto" como titulo ate a escolha. O projeto continua exigindo todas as
  Dailies, ponte incluida.
- **Reforco fora da vaga da ponte**: `CreateDailyReinforcement` numera o reforco depois do dia
  seguinte ao ultimo dia de conteudo (a ponte pode ser curada depois de o aluno ter reforcos).
- **`SyncBridgeDaysUseCase`** (roda no `seed`, todo deploy, idempotente): importa pontes curadas depois
  do curso ja existir e da a Daily da ponte as matriculas cuja semana ainda tem o projeto `Pending` (na
  variante ja escolhida, se houver). Semana com projeto entregue nao ganha a ponte (uma Daily pendente
  la trancaria as seguintes).
- **Migracao 60 -> 72** (`Infrastructure/Persistence/Curriculum72Migration`, no `seed`, antes do seed
  e do sync): so roda no layout antigo (1o dia da Semana 2 = 6), numa transacao. Renumera `DayNumber` do
  curriculo e das Dailies (d -> d + (d-1)/5), move os reforcos pra depois da vaga da ponte (d -> d +
  semana, com os `DailyTemplate` sinteticos) e renumera as mencoes "Dia N" em
  `CuratedContents.BodyText`, `DailyActivities.Prompt`, `RoleplayNodes.Text` e
  `WeeklyTemplates.WeeklyProjectSpecText` (`CurriculumRenumbering`, mesma regra dos arquivos). SQL
  direto: cada grupo passa por valores negativos por causa dos indices unicos.

### Ponte "code comigo" (Fase 79)

Origem: `secret/rascunhos/ponte-code-comigo.md` (dor do dono no Dia 6: ler codigo numa linguagem que
nao usa nao prepara pra escrever), desenho aprovado no Figma "Ponte: code comigo — v2 (proposta)"
(`171:4502`). A ponte deixou de ser leitura + quiz: e um exemplo explicado (`Reading`), **6 passos de
codigo** (`ActivityType.CodeStep` = 7) e um resumo falado. O aluno escreve, passo a passo, uma entrega
parecida com o projeto (mesmas ferramentas, outras perguntas), roda na maquina dele contra um arquivo
fixo do dia e manda o codigo do passo + a saida do terminal. So a Semana 1 esta nesse formato; as outras
pontes curadas (antigas) continuam funcionando como antes.

- **Curriculo**: `DailyActivity` ganhou `CodeSolution` (so o trecho que o passo acrescenta),
  `CodeExpectedOutput` (saida da solucao contra o arquivo, conferida rodando de verdade) e `CodeRubric`
  (o conceito cobrado, nunca vai pro cliente) - `ConfigureCodeStep` exige os tres. `CuratedContentType.File`
  (= 2): arquivo pra baixar (`ExternalUrl` = caminho servido pelo frontend, ex.
  `frontend/public/ponte/web-security/semana-1/ponte.pcap`), ligado aos passos por `ContentId`.
- **Regras** (`CodeStepProgress` + `Daily`): o passo acaba ao passar ou em `MaxAttempts` (3) tentativas;
  acabou sem passar = a solucao aparece e o passo seguinte parte dela (`CarriedCode`). `Daily.PriorCode`
  monta o script ate antes de um passo (o que cada passo anterior entregou, em ordem); nulo = passo
  anterior pendente. Ajustar um passo **nunca soma `PenaltyPoints`** nem entra em `GetFailedActivities`
  (reforco), e `CodeStep` fica fora de `CalculateScore` (sem nota, so "passou / ajuste isto").
  Gems: iguais a qualquer Daily (1 ao concluir).
- **Avaliacao**: `SubmitCodeStepResponseUseCase` (codigo e saida obrigatorios, ate 20 mil caracteres
  cada; 409 `passo_concluido` fora de replay e `passo_anterior_pendente`) monta o `PriorCode` no servidor e
  chama `ICodeStepEvaluationService` (`GroqCodeStepEvaluationService`, JSON `{passou, feedback}`,
  temperatura 0.2): cobra o conceito da rubrica olhando codigo E saida, sintaxe e ajuda livre, a dica
  aponta o conceito sem a linha pronta, conteudo do aluno e so dado (ignora instrucao embutida), nunca
  repete credencial. Grava no `ActivityResponse` de sempre: `Transcript` = codigo, `Justification` =
  saida colada, `AiFeedback` = fala da Focada, Score 100/0. `ResolveScore` recusa `CodeStep` (endpoint
  proprio).
- **DTO**: `DailyActivityDto.CodeStep` (`CodeStepDto`: `PriorCode`, `Done`, `MaxAttempts`, e
  `Solution`/`ExpectedOutput` so depois do passo acabar); passo de codigo so fica `Completed` quando acaba.
- **Repositorio opcional**: `Daily.CodeRepositoryUrl` (ate 500, http/https absoluto), so em ponte com
  `CodeStep` ja concluida (`LinkCodeRepository`, vazio tira). Nao muda conclusao nem Gems.
- **Troca da ponte ja no banco** (`SeedWebSecurityCourseUseCase.RefreshBridge`, dentro do
  `SyncBridgeDaysUseCase`, todo deploy, idempotente): variante de ponte sem `CodeStep` cujo arquivo em
  disco ja tem `CodeStep` e reimportada no mesmo `DailyTemplate` (`CuratedDayImporter.ReimportFile`:
  `DailyTemplate.ClearActivities` + conteudo novo); os `CuratedContents` que so a ponte antiga usava saem
  (`WeeklyTemplate.RemoveCuratedContent` - por isso `GetFullTemplateGraphAsync` passou a carregar
  `CuratedContents`). Dailies nao concluidas dessas variantes recomecam (`Daily.ResetAfterTemplateRefresh`:
  sem respostas, sem penalidade); concluidas ficam fechadas (as respostas antigas so deixam de aparecer,
  `ActivityResponses.ActivityId` nao tem FK). O `seed` imprime quantas trocou e quantas recomecou.
- **Migration** `CodeStepBridge`: 3 colunas `text` em `DailyActivities` e `Dailies.CodeRepositoryUrl`.
- **Sem analogias na ponte** (Fase 80, todas as semanas): a leitura de um conteudo de ponte nao gera o
  "Pra voce" (`IWeeklyTemplateRepository.IsBridgeContentAsync` - conteudo usado por `DailyTemplate` com
  `Language` ou com `CodeStep`, Fase 82; cache ignorado), o resumo falado da ponte avalia sem os
  interesses do perfil (`DailyTemplate.IsBridge`, Fase 82; antes `Daily.RequiresProjectLanguage`) e o chat rapido recebe `codeBridge` (`POST /api/study-assistant/ask`):
  sem perfil e com a instrucao "sintaxe livre, a solucao do passo fica com o aluno".
- **Curadoria**: formato em `secret/curadoria/CURADORIA.md` (secoes 3 e 5.1); fonte da Semana 1 em
  `secret/curadoria/scripts/ponte/semana-1/` (gerador do `ponte.pcap`, solucoes de referencia, divisao
  em passos com as saidas rodadas de verdade e o gerador dos JSONs).

### Laboratorio de codigo (Fase 86, backend)

Origem: `secret/rascunhos/laboratorio-de-codigo-na-ponte.md` (decisoes de 30/09/2026) e desenho no Figma
"Laboratorio de codigo — v2 (proposta)" (`193:9321`, **aguardando aprovacao do dono: o front ainda nao existe**).
O aluno escreve e roda o codigo dentro da Focada e a saida que vai pra avaliacao e a do laboratorio. Quem
executa e o navegador do aluno (Pyodide, Worker de JavaScript com shim, Linux no v86); **o servidor nunca roda
codigo nem verifica a saida** (adulteracao ignorada), so guarda a configuracao e o que o aluno enviou.

- **Configuracao do dia**: `DailyTemplate.Lab` (`LabConfig`, coluna `DailyTemplates.LabConfig`, JSON em texto;
  nulo = sem laboratorio): `Runtime` (`python`/`javascript`/`bash`/`sqlite`), `Image` (so bash: `basico` ou `servidor`),
  `FileContentIds` (`CuratedContent` tipo `File` ja no ambiente), `Packages`, `Services` (arquivos iniciados no
  boot, exige `servidor`), `Entry`, `Command` (precisa conter o `Entry`) e `TimeoutSeconds` (1-60).
  `Setup` (bash: shell como root antes do terminal; sqlite: comandos SQL que montam o banco do dia - Fase 95) e `User`
  (so bash). `LabConfig.Create` valida (sqlite recusa `Image`, `Packages` e `User`). `DailyTemplate.SetLab` exige passo de codigo; `StepUsesLab(activity)` = dia com lab
  e passo sem `LabDisabled`.
- **Por passo**: `DailyActivity.CodeStarter` (codigo inicial do editor, nao e segredo) e `LabDisabled`
  (`"lab": false` no JSON: o passo volta pro fluxo da Fase 79, saida colada).
- **Envio** (`SubmitCodeStepResponseUseCase`): passo com laboratorio exige `labRun` (`LabRunInput`: saida da
  ultima execucao, exit code e, no Linux, historico de comandos com a saida de cada um; ate 50 comandos e 20
  mil caracteres) e ignora o `output` colado; sem `labRun` → 400 `rodar_antes_de_enviar`. `Justification` guarda
  a saida (ou o historico), e `CodeStepEvaluationRequest.Lab` (`CodeStepLabRun`) leva exit code e historico
  pro prompt, que passa a dizer "saida que o laboratorio registrou (nao foi colada)". Passo sem laboratorio
  segue exatamente como na Fase 79.
- **Dica da Focada** (`POST .../activities/{activityId}/code-hint`, `RequestCodeStepHintUseCase`,
  `ICodeStepHintService` → `GroqCodeStepHintService`, JSON `{certo, erro, melhorar}`, temperatura 0.2): tres
  blocos curtos, **nao e tentativa** (nao cria `ActivityResponse`, nao soma penalidade nem entra em reforco),
  `CodeStepProgress.MaxHints` = 3 por passo, guardadas em `CodeStepHints` (`Daily.Hints`, FK sombra `DailyId`,
  indice unico por `DailyId+ActivityId+Number`; `Daily.AddCodeStepHint` barra passo sem laboratorio, passo
  ja concluido fora de replay, anterior pendente e limite; `ResetAfterTemplateRefresh` zera). Sintaxe e erro de
  linha de comando sao ajuda livre; a logica do passo nunca. **Rede de seguranca contra vazamento**: bloco com
  2 ou mais tokens de codigo (com simbolo: `-l`, `$LOG`...) iguais aos da solucao de referencia e vazamento;
  a IA e chamada de novo uma vez com um lembrete e, se vazar outra vez, so aquele bloco vira
  `GroqCodeStepHintService.SafeBlock`. (Na 1a verificacao com a IA real a dica entregou a linha pronta; com o
  prompt mais rigido e a checagem, tres dicas reais seguintes vieram conceituais - o log nao registra se a
  checagem chegou a disparar um retry.)
- **DTO**: `DailyStateDto.Lab` (`LabConfigDto`) e, em `CodeStepDto`, `LabEnabled`, `CodeStarter`, `MaxHints`,
  `Hints` (as ja dadas no passo). Os campos so vem preenchidos em passo que roda no laboratorio.
- **Importador**: `CuratedDayImporter` le o bloco `lab` do dia, `codeStarter` e `"lab": false` por passo;
  `files` tem que ser `File` de `curatedContents` e cada `service` o titulo de um desses arquivos (senao
  `InvalidOperationException`). `CuratedDayImporter.ApplyLab` atualiza um dia **ja no banco** sem reimportar
  (as atividades mantem os Ids): acha os `File` pelo `externalUrl` preferindo os conteudos que as atividades
  do proprio dia usam (as variantes Python/JavaScript da ponte tem um `File` cada, mesmo `externalUrl`).
- **Sync no `seed`** (`SyncLabConfigUseCase`, todo deploy, idempotente, depois dos cursos curados): pra cada
  `DailyTemplate` com `CodeStep` do Web Security e dos cursos de `SeedCuratedCoursesUseCase.CourseSlugs`,
  abre o arquivo do dia (`semana-N/ponte/<linguagem>.json` ou `semana-N/dia-D.json`) e aplica. Dia com
  problema no arquivo e pulado e listado no log (`Seed: laboratorio NAO aplicado - ...`), o deploy nao cai.
- **Migration** `LabCodeStep`: `DailyTemplates.LabConfig` (text), `DailyActivities.CodeStarter` (text) e
  `LabDisabled` (bool, padrao false), tabela `CodeStepHints`.
- **Curadoria**: formato em `secret/curadoria/CURADORIA.md` (secao 5.2) e verificador em
  `secret/curadoria/scripts/lab/` (roda cada solucao acumulada no runtime do laboratorio e compara com a saida
  esperada). Dias com `lab` hoje: pontes Python e JavaScript da Semana 1 do Web Security, Linux Dia 6 e Dia 12.
- **Fora desta fase**: o front (feito na Fase 87, abaixo), o verificador de JavaScript, o exercicio por dia do
  Python pra Web Security.

### Plano de curadoria, Fase 1 (Fase 92)

Refacao dos cursos (`secret/produto/PLANO-CURADORIA.md`, 02/10/2026). Detalhe dos comandos em `secret/processo/importador.md`.
- **Conteudo:** a Api le `secret/conteudo/<curso>/` (`CuratedContentLocator`; `CURATED_CONTENT_ROOT` aponta pra raiz do
  repo de conteudo, que tem `conteudo/`, `processo/`, `produto/`). Conteudo anterior arquivado em `processo/arquivo/`, nao lido.
- **`importar <curso>`** (`ImportCuratedDaysUseCase`): linter (`NodeDayLinter`, precisa de Node; `--sem-linter` no
  container), recusa `moldeVersion` != `v1` (`--legado` aceita), `ContentHash` decide pular/criar/substituir o dia inteiro,
  dia com respostas pede `--confirmar` (respostas das atividades trocadas somem, Dailies nao concluidas recomecam),
  `--dry-run`. `CuratedEnrollmentSync` leva dias novos as matriculas (tambem usado pelo seed generico). O seed do deploy
  continua so criando/completando; corrigir dia e sempre `importar`, nunca SQL.
- **`importar` e o Projeto Semanal (Fase 104):** sem `--dia`, tambem importa `semana-N/projeto.json` (linter `projeto-cli.js`,
  `--sem-linter` no container). `CuratedProjectImporter.Matches` compara banco e arquivo (sem hash); projeto diferente e
  substituido por completo (`WeeklyTemplate.ClearProject()` e depois `Import`: texto, briefing, falas de estado,
  `forgejoTemplateSlug`, variantes e referencias). Aluno com projeto alem de `Pending` pede `--confirmar`. `projeto.json` aceita
  `forgejoTemplateSlug` (repositorio unico, Python). O painel de gestao ainda nao mostra o projeto.
  `--projeto` importa so o projeto (sem tocar nos dias). O workflow `publicar-conteudo.yml` tem a entrada `projeto` (`nao|junto|so`) com linter
  `projeto-cli.js`, dry-run, backup e conferencia.
- **Molde v1 no banco:** `DailyTemplate` guarda `MoldeVersion` e `TargetsJson` (`LearningTarget`, 3 alvos); `CuratedContent.Source`;
  `DailyActivity.Target` e, no VoiceSummary, `Hint`, `ReferenceAnswer`, `IsFinalQuestion`, `TopicsJson`.
- **Analogia "Pra voce" desligada** por `Personalization:AnalogiesEnabled` (padrao `false`); `GET /api/features`
  devolve `personalizedAnalogies`.
- **Devolutiva da voz:** a avaliacao Groq devolve resposta correta e pontos a melhorar (`VoiceDebrief`), mostrada no `FeedbackPanel`.
- **Feedback do dia** (`DayFeedback`): `PUT/GET /api/dailies/{id}/feedback`, so depois de concluir, um por Daily;
  `DayFeedbackScreen` ao fim da sessao (pulavel); comando `feedback <curso>` gera o relatorio de clareza.
- **Aquecimento:** `GET /api/dailies/{id}/warmup` (2 Quiz/Cloze de dias anteriores, menor nota primeiro; nao e atividade
  do dia); `WarmupScreen` antes da sessao (pulavel).
- **`resetar-usuarios --manter <email>`**: dry-run por padrao, `--confirmar` exige `--backup-feito`; apaga todos os outros
  usuarios e zera o progresso do dono. Contas do Forgejo ficam pra limpar a mao.
- **Curso em Draft** visivel ao dono (desde a Fase 96 pelo `CourseAccess`/`CourseViewer`) em `/courses/{id}/curriculum` e `/weekly-templates/{id}`.
- **Trilha:** `CourseTrail` (`components/courseMap/`) gera a trilha so dos dados do curso; o mapa por regioes
  (`CourseMap.tsx`, `lib/courseMaps.ts`) foi apagado. Ponte marcada por `IsBridge` nos DTOs de resumo da Daily.
  Fase 106: onde o aluno esta vem de `currentStop` (`lib/focadaMapLines.ts`): Daily em andamento, senao o castelo
  da 1a semana com os dias feitos e projeto nao avaliado ou publicacao pendente (`isWeekClosurePending`), senao o
  proximo dia de semana destrancada. Trilha, `WeekPathCard`, seletor de curso e `DailyMissionCard` usam a mesma regra
  (antes a Focada sumia: `isNext` apontava o 1o dia da semana seguinte, trancada, e o card mostrava a ponte).
- **Seed do Web Security:** nao cria o curso sem `conteudo/web-security/semana-1/dia-1.json`. `arquitetura-de-software`
  entra no seed generico (Draft).

### Sessao em telas menores (Fase 91)

Figma "Sessao em telas menores — v2 (proposta)" (pagina `212:4502`, aprovado em 01/10/2026). Medido no Chromium: a partir de
1440x900 as 3 colunas cabem; abaixo disso (1366x768, 1280x800, 1280x720) as laterais fixas de 256px espremiam o centro.
- `useIsWideSession` (`lib/useIsDesktop.ts`): `(min-width: 90rem) and (min-height: 820px)`. Desktop (`lg`) e nao largo =
  modo trilho; celular segue com a barra de baixo (`MobileDrawer`).
- `SideSlot` (`components/session/SideRails.tsx`): com espaco, a coluna de sempre; sem espaco, um trilho de 64px e a mesma
  coluna como gaveta de 340px (absoluta no container das colunas, que e `relative`), com veu. O conteudo fica montado o
  tempo todo (`invisible`, nao `hidden`: o chat mede a altura do campo), entao rascunho, conversa e Pomodoro nao reiniciam.
  Esc fecha na captura e e consumido (na sessao o Esc tambem abre as Configuracoes); `pauseSessionKeys`
  (`lib/useSessionKeys.ts`) pausa os atalhos 1-N/Enter com a gaveta aberta.
- Trilho vivo: FOCO mostra o tempo do Pomodoro (verde rodando); ponto ambar em NOTAS (`QuickNotePanel.onDraft`) e em
  DUVIDA/CHAT (`StudyAssistantPanel.onReply`, so com a gaveta fechada).
- Usado em `SessionLayout` (toda atividade da sessao, inclusive laboratorio e missao no terminal) e no `WeeklyProjectPage`
  (REPO/REFS a esquerda, NOTAS/CHAT a direita). No modo trilho os respiros do corpo caem pra 16-24px; com altura < 820 a
  linha "Semana N" some e o titulo e a pergunta do quiz diminuem.
- Junto: a nota "Missao cumprida" passa pelo `InlineMarkdown` (`MarkdownBlock.tsx`).

### Missao no terminal v3 (Fase 90)

Dor do dono como aluno (01/10/2026): o `clear` apagava tudo, o prompt nao mostrava o diretorio, era preciso voltar a
Leitura pra lembrar os comandos e as missoes nao davam objetivo. Figma "Missao no terminal — v3 (proposta)" (`209:10810`,
aprovado em 01/10/2026).
- **Dados**: `TerminalMission` ganhou `Situation`, `Goal` e `Steps` (opcionais, aparados na importacao) e entrou
  `TerminalCommand(Command, Description)` - a cola do dia, na atividade. `TerminalMissionsJson` passou a guardar
  `{"missions": [...], "commands": [...]}`; `TerminalMissions.Parse` ainda le o formato antigo (so a lista), entao nao
  houve migration e o `seed` (`ApplyMissions`, que compara o JSON) regrava os dias no formato novo.
  `DailyActivityDto.Commands` e os campos novos de `TerminalMissionDto` vao pro front.
- **Prompt com o diretorio**: `linux.worker.mjs` fecha cada comando com `__END<id>:<rc>:<pwd>`; o `runner.mjs` repassa,
  `LabRunResult.cwd` chega ao app e `LabSession` guarda em `snapshot.cwd` (volta a nulo quando o runtime reinicia).
  `shellPrompt(user, cwd)` (`lab/labOutput.ts`) desenha `agente@srv:~/pasta$`; cada linha do historico guarda o prompt
  de quando foi digitada. Vale na missao e no terminal da ponte.
- **`TerminalPanel`**: o campo segue a ultima linha (sobe pro topo depois do `clear`), `clear`/Ctrl+L/"Limpar" deixam a
  linha `── tela limpa · ultimo comando: X ──` e o historico segue inteiro nas setas e na conferencia; `fill` poe um
  texto no campo sem rodar.
- **`TerminalMissionActivity`**: titulo + chips 1..N no lugar da lista lateral; caixa SITUACAO / OBJETIVO / PASSOS (ou
  FACA, com o enunciado, em missao de um comando so); cola "Comandos de hoje" ao lado do terminal (clique copia pro
  campo). Missao cumprida desliga a dica ("Dica · —"). Bloco curado antes do v3 (sem `situation`/`commands`) cai no
  layout da Fase 88.
- Curadoria: `CURADORIA.md` 5.3 (campos novos), fonte `scripts/linux-missoes/contexto_missoes.py`; o
  `verificar-missoes.mjs` recusa missao sem `situation`/`goal` ou dia sem `commands`.

### Mais de um curso (Fase 89)

Com 2+ matriculas, `GET /api/today` sem `?courseId=` responde 409 `multiplas_matriculas_ativas` (Fase 13); o front passou
a sempre escolher o curso:
- `/hoje` sem `?daily=`/`?curso=` lista os cursos (`GET /api/courses`) e, com 2+, mostra `TodayCourseChoice` (os save
  slots do start, `CourseSlots`) com o ultimo curso aberto marcado; "Abrir a sessao" vai pra `/hoje?curso=<id>`, que
  chama `GET /api/today?courseId=`. Com 1 curso, comportamento de sempre.
- **Ultimo curso aberto** (`lib/courseChoice.ts`, `localStorage` `focadu:ultimo-curso`): gravado por `/start?course=`,
  pelos slots do start, pela sessao (curso da Weekly) e pelo seletor do Perfil. `pickCourse` resolve o padrao: o pedido
  na URL, senao o ultimo aberto, senao o primeiro publicado. Vale pro menu (Trilhas/Ranking), start e Perfil.
- `CourseSwitcher` (so com 2+ cursos): Trilha ("Trocar de trilha"), Ranking (navega pra `/start?course=&ranking=1`),
  Perfil (`?curso=`, troca progresso, Score e posicao; os dados gerais nao recarregam) e ranking do QG do Squad (com
  "Todos").
- `GET /api/squads/me/ranking?courseId=` (opcional): so a matricula daquele curso entra no score de cada membro (quem
  nao faz o curso fica com 0); sem ele, todas as matriculas somadas. Meta da semana e feed do QG seguem somando tudo.
- Mock: `/__mock/reset?cursos=2` (Web Security + Linux; `/api/today` sem curso devolve o 409 como o backend).

### Missao no terminal (Fase 88)

Atividade `ActivityType.TerminalMission` (8) dos dias normais do Linux (piloto: Dia 2), logo depois da Leitura: so o
terminal do Linux embutido (v86 da Fase 87), sem editor. O navegador confere cada missao (`frontend/src/lab/terminalMission.ts`:
regex no comando, na saida e no estado medido por um `probe` silencioso); o servidor so registra a conclusao (Score fixo
100, fora do Score de Estudo, como a Leitura) e nunca marca o dia como ponte (`DailyTemplate.IsBridge` so olha `CodeStep`).
- `DailyActivity.TerminalMissionsJson` (coluna texto, migration `TerminalMission`) guarda as missoes (`TerminalMission`,
  `TerminalMissionCheck`, validadas por `TerminalMissions.Create`); `DailyActivityDto.Missions` as entrega.
- `LabConfig` ganhou `Setup` (linhas de shell como root antes do terminal abrir) e `User` (`su -` depois do setup);
  `Entry`/`Command` sao opcionais num dia so de missoes (`LabConfig.NoEditor`; dia com `CodeStep` continua exigindo).
  `DailyTemplate.SetLab` aceita `CodeStep` ou `TerminalMission`.
- `CuratedDayImporter.ApplyMissions` (via `SyncLabConfigUseCase`, todo `seed`) insere a atividade num dia que ja esta
  no banco (`DailyTemplate.InsertActivity` empurra as seguintes; respostas seguem o Id) e e idempotente.
- Front: `TerminalMissionActivity`, `MissionsGauge`, progresso em memoria (`terminalMissionStore.ts`); celular segue sem as
  missoes. Mock: `/__mock/reset?at=terminal`. Curadoria: `CURADORIA.md` 5.3 e `scripts/lab/verificar-missoes.mjs`.

### Laboratorio de codigo (Fase 87, front)

Front do laboratorio (Figma "Laboratorio de codigo — v2 (proposta)", `193:9321`, aprovado em 30/09/2026; contrato HTTP na
secao acima). O codigo do aluno roda **no navegador dele**, nunca no servidor.

- **Runtimes** em `frontend/public/lab/` (servido em `/lab/`): `runner.html` + `runner.mjs` (anfitriao: recebe
  `init/run/exec/write/abort/dispose` por `postMessage`, derruba o Worker no timeout/"Parar" e o sobe de novo) e um
  Worker de modulo por runtime: `py.worker.mjs` (Pyodide 314 + Scapy via micropip com o shim de IPv6; saida com
  stdout e stderr em ordem, traceback so do arquivo do aluno), `js.worker.mjs` (modulo ES por import dinamico de
  um Blob, `process.argv`/`console` capturados, `pcap-parser` empacotado com `fs` virtual) e `linux.worker.mjs`
  (Alpine i386 com Bash no v86; terminal pela serial, cada comando fecha com um marcador `__END<id>:<rc>` que da
  saida e exit code; o servico do perfil `servidor` sobe no boot e o runner espera um socket em LISTEN em
  `/proc/net/tcp`). Mesma interface nos tres.
- **SQLite (Fase 95)**: `runtime: sqlite` usa o mesmo `py.worker.mjs` (o `sqlite3` da biblioteca padrao do Pyodide,
  SQLite 3.39, sem pacote extra). O aluno escreve SQL puro; o `SQL_RUNNER` (Python embutido no worker, lido tambem pelo
  `verificar.mjs` da curadoria) abre um banco **novo em memoria a cada execucao**: `.db` de `files` (no maximo um, via
  `backup`), `.sql` de `files`, `setup`, e o SQL do aluno comando a comando (`complete_statement`, com a linha inicial
  de cada um). `SELECT` vira tabela em texto (`NULL` escrito, `(nenhuma linha)`), DML escreve `-- N linhas alteradas`,
  erro escreve `Erro na linha N: ...` e para (exit 1; `errorLine` le `linha N`). Comandos de ponto: `.tables` e
  `.schema [tabela]`. Autocommit (o `BEGIN/ROLLBACK` do aluno vale) e `foreign_keys` desligado, como no SQLite padrao.
- **Isolamento**: `/lab/` sai com `Content-Security-Policy: default-src 'none'; script-src 'self'
  'wasm-unsafe-eval' blob:; worker-src 'self' blob:; connect-src <host>/lab/; frame-ancestors 'self'` (dev: plugin
  `labHeaders` do `vite.config.ts`; producao: `location /lab/` do `nginx.conf`, que tambem define MIME, gzip do wasm,
  cache de 1 dia e `try_files $uri =404` sem fallback de SPA). O `connect-src` so com o caminho `/lab/` impede o codigo
  do aluno de chamar a API (relativa ou absoluta) e qualquer outra origem. Nao ha subdominio nem `sandbox`: iframe
  com origem opaca nao sobe Worker de modulo no Chrome. Depende do `$http_host` do nginx ser o host usado pelo
  navegador (nao testado atras do proxy de producao).
- **App** (`src/lab/`): `LabClient` (iframe escondido em `/lab/runner.html` + protocolo), `LabSession` (um
  laboratorio por Daily; `ensure` idempotente por runtime/imagem/arquivos/pacotes, `run/exec/write/abort/reset`;
  progresso coalescido a cada 100 ms), `LabContext`/`useLab` (a `TodayPage` cria a sessao com `useLabSessionOwner`
  e a derruba ao sair, entao o ambiente persiste entre os passos do dia e zera no dia seguinte) e `labOutput`
  (`argvFor`, `errorLine`, `runtimeLabel`, `displayOutput`, `toPayload`). Os arquivos do dia saem de
  `weekly.curatedContents` pelos ids de `lab.fileContentIds` e vao ao runtime por `postMessage`.
- **Tela** (`components/code/`): `CodeStepActivity` despacha por `codeStep.labEnabled` pra `LabCodeStepActivity` (ou
  pro fluxo da Fase 79, intacto). `LabCodeStepActivity`: editor (`CodeEditor` com `errorLine` e `minLines`), Rodar/Parar,
  saida, `LabChip`, `LabProgressBar`, `HintPanel` (3 blocos, `hints` vem do servidor e e refeito com `getDaily`),
  `TerminalPanel` (Linux; historico de comandos vai no `labRun`), "Enviar passo" so com o codigo atual ja rodado
  (`ranCode === code`), aviso "Continue no computador" no celular (`useIsDesktop`, nao baixa o runtime).
- **Assets**: `frontend/scripts/lab-assets.mjs` (`predev`/`prebuild`) copia Pyodide e v86 do `node_modules`, empacota
  o `pcap-parser` (esbuild) e gera `public/lab/manifest.json` (tamanhos sem compressao, pra barra de progresso); fora
  do git: `public/lab/{pyodide,v86,js}/` e o manifest. Versionados em `public/lab/`: `vendor/` (wheels do Scapy e do
  micropip, BIOS do v86) e `linux/` (`vmlinuz` unico e `basico|servidor/initrd.zst`, de
  `secret/curadoria/scripts/lab/montar_imagem.sh`). A imagem do frontend passa a levar ~50 MB de `/lab/`.
- **Mock**: `/__mock/reset?at=codigo&lab=python|javascript|bash|servidor|none` (dica e envio com `labRun`, com os
  `dia-N.json` reais). Guia das telas (`lib/guiaTelas.ts`) atualizado.
- **Numeros medidos**: 1a carga ~15 MB (Python + Scapy), 13 MB (Linux basico), 22 MB (Linux com servidor), ~0,1 MB
  (JavaScript); boot do Linux ~5 s e ~25 s com o servidor; RAM ~88 MB (Python), 171 MB e 313 MB (Linux).

### Dialogo da Focada no Projeto Semanal (Fase 64)

Origem: `secret/rascunhos/projeto-semanal-dialogo-de-jogo.md` (decisoes do dono, 23/09/2026) e
`secret/rascunhos/mascote-focada.md` (a personagem). A **Focada** - foca de camiseta preta com a mira
do logo, mascote/mentora da marca - fala o tempo todo no centro da tela do Projeto Semanal, numa
caixa de dialogo pixel art. So texto, sem voz.

**Dominio:** `WeeklyTemplate.WeeklyProjectBriefing` (`string[]`, coluna `text[]`) - as falas do
briefing, escritas a mao pela curadoria (`"briefing"` no `projeto.json`, voz em
`secret/curadoria/GUIA-DE-VOZ-FOCADA.md`); `WeeklyTemplate.WeeklyProjectStateLines`
(`Dictionary<string,string>`, coluna `jsonb`) - falas de estado que a semana sobrescreve
(`"falasDeEstado"`, chaves fixas em `WeeklyTemplate.StateLineKeys`: `repositorio`, `entregue`,
`avaliadoAlta`, `avaliadoBaixa`). `SetProjectBriefing` e 1x so (igual `SetProjectSpec`), recusa fala
vazia, chave desconhecida e fala com mais de `MaxDialogueLineLength` (200) caracteres. Migration
`ProjectBriefing` (so adiciona as 2 colunas, com default vazio).

**Api:** `WeeklyProjectDto.Briefing`/`StateLines` - vazios enquanto o projeto nao foi disponibilizado
(mesma regra do `SpecText`, `WeeklyProjectDtoMapper`).

**Frontend:** `components/DialogueBox.tsx` + `lib/focadaLines.ts`. Falas = briefing (retrato neutro)
+ a fala do estado atual: repositorio pronto / entregue (neutra) / avaliado com nota >= 70
(`FOCADA_HIGH_SCORE`, retrato comemorando) ou < 70 (acolhedora). As falas de estado padrao, iguais em
toda semana, moram em `DEFAULT_STATE_LINES`; `{nota}` vira a nota. Cada fala e digitada so na 1a vez
(`localStorage` `focadu:focada-vistas:<projectId>`); abre na 1a fala nao vista ou na ultima;
clique/Enter/espaco avanca ou completa; "Pular" vai pra ultima; terminada a ultima fala, a caixa vira
a conversa inteira em lista (anteriores em cinza, atual em destaque, retrato fixo no topo);
`prefers-reduced-motion` nunca digita; regiao `aria-live` com a fala inteira. Respostas do agente
(`choices`) numa caixa espelhada a direita ("VOCE", seta ◀ a direita), so depois da Focada terminar:
"Entregar projeto" mora ali no lugar do botao ambar do rodape e passa por `PixelConfirmDialog`
(cena de dialogo em pixel art: foco comeca em "Nao, ainda vou mexer", ESC/clique fora cancelam, um
cursor de selecao so - o mouse move o foco, setas trocam). Com o dialogo ativo, a tela fica so com as
3 colunas: sem "voltar", barra de progresso, tags "CHEFE DE FASE"/status, titulo visivel (fica
`sr-only`), borda, fundo e rotulo do cartao central. Semana sem briefing mantem o layout anterior. Fontes VT323 (fala) e Silkscreen (rotulos) - tokens
`--font-pixel`/`--font-pixel-label` (nessa tela e, desde a Fase 65, na tela do curso/mapa da trilha). Caixa: `@utility pixel-box`
(contorno 4px + filete interno + cantos mordidos via `clip-path`). Sons sintetizados na hora com Web
Audio (`lib/uiSound.ts`, sem arquivo de audio), obedecendo "Sons da interface" nas Configuracoes
(liga/desliga + volume, `lib/settings.ts`; o bipe do Pomodoro NAO obedece, e alarme).

**Onde fica a especificacao:** com briefing e linguagem ja escolhida (`LanguageStep` Chosen), o
cartao de especificacao sai da tela - o enunciado completo mora no `README.md` do repositorio do
aluno (link "Abrir README.md" no dialogo). Sem briefing, ou em semana sem template por linguagem, o
cartao continua como antes. O `SpecText` segue como **fonte unica**: avaliacao por IA, resumo do
commit de modulo e Suporte Rapido continuam lendo dele. O README do repositorio-modelo e **gerado**
a partir dele: `secret/curadoria/scripts/gerar_readme_modelo.py` troca o marcador `{{ENUNCIADO}}` do
`modelos/<linguagem>/README.base.md`. Fork ja existente fica com o README antigo (aceito pelo dono).

**Producao:** o seed nao reprocessa semana ja existente - o briefing da Semana 1 foi aplicado por
`secret/curadoria/patches/2026-09-23-semana-1-briefing-focada.sql` (idempotente) em 23/09/2026, e o
`README.md` dos 2 repositorios-modelo da Semana 1 no Forgejo foi atualizado pela API de conteudo
(`publicar_modelo_forgejo.py` so cria, nao sobrescreve). O fork do dono (unico aluno, projeto ainda
nao comecado) foi apagado e a escolha de linguagem zerada, pra nascer do modelo novo.

### Mapa da trilha em pixel art (Fase 65)

Origem: `secret/rascunhos/mapa-da-trilha-pixel-art.md` (decisoes, falas aprovadas, plano). A tela do
curso (`/start?course=`, `CourseDetailPage`) trocou a lista de semanas por um **mapa-mundi em pixel
art**, uma regiao desenhada por Monthly (mes), com os dias como pontos no caminho e o Projeto Semanal
como castelo no fim de cada semana.

**Arte e posicoes (curadoria):** desenhadas no Figma "Focadu — Pixel Art", pagina "Mapa da trilha"
(componentes `mapa/web-security/regiao-1..4`, sprites `mapa/ponto/*`, `mapa/castelo/*`,
`mapa/badge/reforco`, `mapa/focada/marcador`), mas a **fonte e script**: `secret/curadoria/scripts/mapa/`
(`base.js` + `landmarks.js` + `regiao-N.js` geram uma grade de indices da paleta fechada). O mesmo
script alimenta o Figma (`figma-regiao.js`), o `secret/curadoria/web-security/mapa/regiao-N.json`
(`gerar-mapa-json.js`) e o frontend (`exportar-frontend.js` grava `frontend/src/assets/mapa/web-security/
regiao-N.png|json` e `frontend/src/assets/pixel/mapa/*.png`) - nunca editar os PNG/JSON do frontend a
mao. Fase 69: 6 pontos por semana (o 6o e a ponte), chaves `dN` na numeracao de 72 dias; cada semana
e uma "cobrinha" de 2 fileiras antes do castelo. Cada `regiao-N.json` traz, a 1x (arte 384x192): centro de cada ponto (`dia-N` por DayNumber,
`projeto-semana-N` por numero da Weekly), `entrada`/`saida` e o retangulo da ilha de cada semana
(`ilhas`, usado pela nevoa). Mudou a quantidade de dias de um mes = redesenhar a regiao (aceito).

**Api (sem endpoint novo), campos novos em `GET /api/courses/{courseId}`:**
`WeeklyOverviewDto.ProjectStatus` (`WeeklyProjectStatus?`, estado do castelo) e, em
`DailyStatusSummaryDto`, `Title` (mesma regra de `DailyOverviewDto.Title`), `IsNext`
(`DailySequencing.FindNext`), `ReinforcementDailyId` (o reforco tem DayNumber proprio - max+1 da
semana - entao o mapa poe o selo no ponto do dia de origem) e `CompletedToday` (hora local, mesma
conversao de `Weekly.EvaluateDailyAccess`; `GetCourseDetailUseCase` passou a receber `IClock`).

**Frontend:** `lib/courseMaps.ts` (registro curso -> regioes; chave = nome do curso normalizado,
`Course` nao tem slug), `components/courseMap/CourseMap.tsx` (seletor de mes + `RegionView`),
`lib/focadaMapLines.ts` (falas). Pontos e castelos sao `<button>` posicionados em % sobre a arte (a
ordem do DOM segue o caminho; aria-label com dia, titulo e status); clique abre o balao (dia/tema/
status + "Entrar"/"Rever", "Fazer reforco", "Abrir projeto", "Ver semana"). Estados: ponto concluido/
em andamento/disponivel (`isNext`)/trancado; castelo trancado (dias da semana incompletos)/liberado/
entregue/concluido (`ProjectStatus`). Nevoa (bloco `bg-base` a 90% + borda de meias-nuvens) a partir
da 1a semana trancada ou alem da semana atual; pontos sob ela ficam inertes. A Focada (sprite 16x16)
fica sobre a proxima Daily - ou no castelo que bloqueia, se a semana dela esta trancada - e na 1a
abertura depois de avancar anda ponto a ponto desde a ultima posicao vista (`localStorage`
`focadu:mapa-posicao:<courseId>`; `prefers-reduced-motion` aparece direto). Regiao sem arte cai na
lista de semanas antiga (`renderFallback`); celular (`useIsMobile`) e curso sem mapa tambem.

**Falas da Focada no mapa:** 11 falas padrao aprovadas pelo dono (`DEFAULT_MAP_LINES`), uma por
abertura, a 1a situacao verdadeira na ordem: curso concluido, reforco pendente, projeto liberado,
projeto entregue, daily em andamento, dia feito hoje, primeira vez, novo mes, nova semana, ultimo dia
antes do castelo, padrao. Marcadores `{dia}`/`{semana}`/`{faltam}`/`{mes}`/`{tituloMes}` (titulo do mes
com acento vem do `regiao-N.json` - o do seed e sem acento). Semana fechada so esperando a publicacao
do modulo nao tem fala (sem fala aprovada). A troca por curso na curadoria (decidida no rascunho) ainda
nao tem caminho de dado. **Desde os ajustes da Fase 65** a fala e um balao em cima do marcador da
Focada no proprio mapa (nao mais uma coluna com o `DialogueBox`, que gerava rolagem no monitor):
abre sozinha depois da caminhada quando a fala mudou (`localStorage` `focadu:mapa-fala:<courseId>`),
fecha com Esc/clique fora, e reabre no hover/foco do marcador.

**Layout da tela do curso:** mesma receita do Projeto Semanal (Fase 61) - margens `lg:px-16`/45px no
topo e, a partir de `lg`, altura da tela com rolagem so por dentro das colunas. 3 colunas (desde os
ajustes da Fase 65): cabecalho HUD do curso (250px: titulo, barra de progresso em 30 segmentos) | so o
mapa | Resumo do Curso HUD (250px: dailies, projetos avaliados, reforcos, conclusao, "Continuar
estudando" e os atalhos Ver ranking, Conquistas, Caderninho, Certificacoes). As laterais descem 44px
(`lg:pt-11`, a altura do seletor de mes) pra comecar junto com a caixa do mapa. **As abas sairam:** Caderninho virou tela propria
(`routes/NotebookPage.tsx`, `/start?course=&caderninho=1`) e Certificacoes usa a tela da Fase 45
(`/start?course=&certifications=1`); `?tab=caderninho`/`?tab=certificacoes` (links antigos) caem nessas
telas (`StartPage`). `CourseDetailTabs` e `CertificationsTab` foram removidos.

### Tela de start em pixel art com varios cursos (Fase 66)

Desenho no Figma "Focadu — Pixel Art", pagina "Start — redesign proposto" (node `55:4502`); a coluna
direita do desenho saiu na implementacao (pedido do dono). `/start` sem params (`StartDashboard`), a
partir de `lg`, ocupa a altura da tela **sem rolagem** (conferido de 1280x720 a 1920x1080; margem
vertical menor com `max-height: 820px`), 2 colunas:

- **Esquerda, global:** `CourseSlots` - um "save slot" por curso matriculado (nome, barra de 10
  blocos, %, "Semana X · Dia Y" ou "Concluido" com coroa); o escolhido fica em `?curso=` (padrao: o 1o
  `Active`) e troca o centro. "+ Explorar cursos" leva a `/selecionar-curso`. `AgentCard`: gemas (abre a
  loja), streak, recorde e a semana do streak em 7 quadrados - derivada so do `currentStreak` (os N dias
  terminando hoje, se ja estudou hoje em algum curso, ou ontem), sem historico no backend.
- **Centro, do curso escolhido:** `DailyMissionCard` - a Daily de `GET /api/today?courseId=` com o
  titulo do material, as atividades em cadeia (feita / atual / por fazer) e a recompensa (+1 gema -
  `UserGemBalance.DailyGemAmount` - e o streak que sobe, se ainda nao estudou hoje); estados sem sessao
  no mesmo cartao: cota do curso gasta (`Blocked`), semana esperando o castelo (`WeekPendingClosure`,
  botao pro projeto ou pra semana) e curso concluido (404 `daily_hoje_nao_encontrada`). `WeekPathCard` -
  a semana atual com os sprites do mapa (Focada no dia atual, selo de reforco pendente como link pra
  sessao) e o Projeto Semanal como castelo/BOSS ("abre em N dias", aberto, em avaliacao, concluido).
  Fala da Focada: as falas aprovadas do mapa (`buildFocadaMapLine`) no `DialogueBox` com a nova opcao
  `compact` (retrato 64px, sem rodape vazio), chave `start-<courseId>`.
- **Sairam da tela:** o carrossel de cursos (`CourseCarousel`, apagado), o "Ola, fulano", o
  cabecalho HUD do curso, os cartoes de projeto, "Trilha completa" e certificacoes, a revisao semanal e
  o cartao de reforco pendente - tudo ja esta na trilha ou na semana. Conquistas e a versao de celular
  ficaram pra depois (decisao do dono); abaixo de `lg` as colunas so empilham.