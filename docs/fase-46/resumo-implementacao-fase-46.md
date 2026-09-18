# Resumo — Fase 46: Repositórios de Projeto Semanal no Forgejo interno

## O que foi implementado

- **Forgejo self-hosted** como container novo (`codeberg.org/forgejo/forgejo:9`, SQLite) em
  `backend/docker-compose.yml` (dev local), `docker-compose.yml` (produção) e
  `docker-compose.homolog.yml`, substituindo o fluxo em que o aluno criava e colava manualmente
  uma URL de repositório GitHub pra cada Projeto Semanal.
- **Domínio**: `UserForgejoAccount` (novo agregado, `Focadu.Domain.GitHosting`) - 1:1 com `User`,
  lazy, mesmo princípio de `UserGemBalance`/`UserStreak`. `WeeklyTemplate.ForgejoTemplateSlug` +
  `SetProjectTemplateRepo` (repositório-template mantido pela curadoria, 1 por semana curricular).
  `WeeklyProject.AttachRepository` (novo método - só seta `SubmissionUrl`, não muda `Status`,
  diferente de `Submit`).
- **`IForgejoService`** (port, `Focadu.Application/Ports/`) + **`ForgejoService`** (adapter,
  `Focadu.Infrastructure/Services/`) - espelha `IGitHubService`/`GitHubService` (mesmo padrão
  `HttpClient` cru sem SDK, mesmo `HttpRetry`): cria conta do aluno (com criação de repositório
  desabilitada, `max_repo_creation: 0`), dá fork de um repositório-template em nome do aluno via
  impersonação administrativa (`Sudo`), lê snapshot de conteúdo (árvore + blobs) pra avaliação
  por IA.
- **`EnrollUserInCourseUseCase`**: dentro do mesmo loop que já cria `Weekly`/`WeeklyProject` pra
  cada `WeeklyTemplate` na matrícula, se a semana tem `ForgejoTemplateSlug` configurado, garante a
  conta Forgejo do aluno (lazy, uma vez só) e dá fork do template daquela semana, anexando a URL.
  Falha do Forgejo nunca derruba a matrícula (mesmo espírito "bônus, nunca core" de
  `SubmitWeeklyProjectUseCase`).
- **`EvaluateWeeklyProjectUseCase`**: parou de depender de `IGitHubService`/`GitHubUrlParser` (que
  continuam intocados, só servem o fluxo de prova pública de módulo) - resolve owner/repo direto
  (username do aluno no Forgejo + slug do template), sem parsear a `SubmissionUrl`.
- **`WeeklyProjectDto`** ganhou `ForgejoAccessToken`/`ForgejoUsername` (populados nos 3 pontos que
  constroem o DTO: `GetWeeklyDetailUseCase`, `SubmitWeeklyProjectUseCase`, `EvaluateWeeklyProjectUseCase`).
- **Migration `AddForgejoIntegration`**: coluna `WeeklyTemplates.ForgejoTemplateSlug` (nullable) +
  tabela `UserForgejoAccounts` (1:1 com `User`, índice único).
- **Frontend (`WeeklyProjectPage.tsx`)**: campo de URL manual removido - mostra o repositório já
  provisionado, usuário + token do Forgejo (copiável, mesmo padrão do `ReferralCard`) e instrução
  de `git clone`. Botão "ENTREGAR PROJETO" passa a usar a `SubmissionUrl` já conhecida, sem digitar
  nada.
- **`.env.example`/`docs/DOCKER.md`** atualizados com as novas variáveis (`FORGEJO_*`) e a porta
  nova na tabela de convenção.

## Decisões técnicas tomadas que não estavam no prompt original

Esta fase não nasceu de um prompt técnico único colado de uma vez - foi elaborada
incrementalmente a partir de `secret/rascunhos/repositorios-gerenciados-projeto-semanal.md`
(pesquisa + decisões confirmadas em conversa) e só depois implementada. Decisões tomadas ao longo
do caminho, nenhuma no prompt original:

- **Forgejo, não Gitea** - governança comunitária (Codeberg e.V.) e sistema nativo de quota por
  usuário, que o Gitea não tem (ver rascunho).
- **Fork via impersonação (`Sudo`), não "generate from template"** - preserva a relação
  fork→template; o template em si nunca é alterado.
- **Provisionamento eager, na matrícula** (não lazy no primeiro acesso à tela) - decisão do
  Falves, mesmo padrão que `EnrollUserInCourseUseCase` já usa pra `Weekly`/`WeeklyProject`.
- **Credencial do aluno = access token exibido na tela** (não SSH key, não OAuth do GitHub
  pessoal) - decisão do Falves, mais simples pro estágio atual.
- **Publicação no GitHub pessoal do aluno é manual** (`git remote add` + `git push`, sem nenhuma
  orquestração da Focadu) - correção do próprio Falves em cima de uma primeira proposta minha
  (push-mirror orquestrado), que era complexidade desnecessária.
- **3 bugs reais descobertos testando ao vivo contra uma instância real do Forgejo** (nenhum
  visível só por leitura de código - mesmo espírito de "GitHub nunca foi testado contra API real"
  da Fase 11, só que aqui *foi* testado):
  1. `START_SSH_SERVER=true` conflita com o sshd externo que a própria imagem do Forgejo já sobe
     (`listen tcp :22: bind: address already in use`) - corrigido pra `"false"` explícito.
  2. `POST /users/{username}/tokens` recusa autenticação via API token + `Sudo` (401 "auth
     required") - só aceita Basic Auth de verdade. Corrigido: `ForgejoService` autentica como o
     próprio aluno (com a senha aleatória que acabou de definir) só nessa chamada específica -
     as outras 2 chamadas de `CreateUserAccountAsync` continuam com o token administrativo.
  3. O endpoint de fork recusa corpo `null`/sem `Content-Type` (`422 "Empty Content-Type"`) -
     corrigido pra enviar `{}` explícito.
- **Porta 3000 (padrão do Forgejo) já estava em uso** por outro projeto neste host
  (`homepage-homepage-1`) - portas movidas pra 3020 (produção)/3030 (homologação), com
  `FORGEJO__server__ROOT_URL` setado explicitamente (sem isso, o Forgejo deriva a URL de clone da
  porta *interna* do container, não da porta que o host expõe - confirmado ao vivo, repositórios
  criados antes desse ajuste tinham `clone_url` inacessível de fora do container).
- **`max_repo_creation: 0` + fork via `Sudo` confirmado ao vivo**: a restrição bloqueia o aluno de
  criar repositório pela própria conta, mas não impede o fork feito via impersonação
  administrativa - resolve a dúvida que o rascunho tinha deixado em aberto ("precisa verificar na
  implementação").
- **Storage do Forgejo: SQLite** - app isolada, sem join com o domínio C#, sem necessidade do
  Postgres compartilhado.
- **Bootstrap manual do Forgejo (fora de código, feito ao vivo nesta fase)**: conta admin
  `focadu-admin` + token administrativo criados via CLI (`forgejo admin user create`/
  `generate-access-token`, não pela web - `FORGEJO__security__INSTALL_LOCK: "true"` pula o
  wizard). Repositório-template da Semana 1 (`template-web-security-semana-1`) criado manualmente
  e `WeeklyTemplate.ForgejoTemplateSlug` setado via SQL pontual - as outras 11 semanas do
  currículo ainda não têm repositório-template (fora de escopo desta fase, ver rascunho).

## Estrutura de arquivos criada

```
backend/src/
├── Focadu.Domain/
│   ├── GitHosting/
│   │   └── UserForgejoAccount.cs                          (novo)
│   ├── Repositories/IUserForgejoAccountRepository.cs       (novo)
│   └── Weeklies/
│       ├── WeeklyTemplate.cs                                (editado: ForgejoTemplateSlug)
│       └── WeeklyProject.cs                                 (editado: AttachRepository)
├── Focadu.Application/
│   ├── Ports/IForgejoService.cs                             (novo)
│   ├── Enrollments/EnrollUserInCourseUseCase.cs             (editado)
│   └── Weeklies/
│       ├── Dtos.cs                                          (editado: WeeklyProjectDto)
│       ├── EvaluateWeeklyProjectUseCase.cs                  (editado)
│       ├── SubmitWeeklyProjectUseCase.cs                    (editado)
│       └── GetWeeklyDetailUseCase.cs                        (editado)
├── Focadu.Infrastructure/
│   ├── Services/
│   │   ├── ForgejoOptions.cs                                (novo)
│   │   └── ForgejoService.cs                                (novo)
│   ├── Persistence/
│   │   ├── Configurations/UserForgejoAccountConfiguration.cs (novo)
│   │   ├── Repositories/UserForgejoAccountRepository.cs      (novo)
│   │   └── FocaduDbContext.cs                                (editado: DbSet novo)
│   ├── Migrations/20260918155552_AddForgejoIntegration.cs    (novo)
│   └── DependencyInjection.cs                                (editado)
└── Focadu.Api/Program.cs                                     (editado: ForgejoOptions)

frontend/src/
├── routes/WeeklyProjectPage.tsx                              (editado)
└── api/types.ts                                              (editado)

docker-compose.yml, docker-compose.homolog.yml,
backend/docker-compose.yml, .env.example, docs/DOCKER.md      (editados)
```

## Testes

- **365 testes de domínio passando** (`dotnet test`, sem nenhum quebrado pelas mudanças).
- **Build limpo**: `dotnet build` (backend) e `tsc -b`/`oxlint` (frontend) sem erros.
- **Os 3 `docker-compose*.yml` validados** (`docker compose config -q`).
- **Teste de ponta a ponta ao vivo, contra a stack de verdade rodando neste host** (não só leitura
  de código): subiu o container Forgejo, fez o bootstrap administrativo, criou o repositório-
  template da Semana 1, registrou e matriculou um usuário de teste via API real, confirmou que
  `UserForgejoAccount` e o fork foram criados automaticamente, confirmou que `GET /api/weeklies/
  {id}` devolve URL/usuário/token corretos, e **de fato rodou `git clone`/`git commit`/`git push`**
  com as credenciais retornadas pela API - os dois funcionaram. Confirmou também que o endpoint de
  árvore/blob que `EvaluateWeeklyProjectUseCase` usa devolve o conteúdo pusheado corretamente. Os 3
  bugs da seção acima só apareceram nesse teste ao vivo, nunca teriam sido pegos só lendo código.
  Dados de teste limpos ao final (usuário, matrícula, conta/fork no Forgejo) - o usuário real
  (Rafael) e o restante do banco ficaram intactos.

## Dúvidas ou pontos abertos para a próxima fase

- **SAST em si (Fase 24c) continua não implementado** - os 8 checks já estão escopados, mas o
  webhook receiver que dispararia isso a cada `git push` não foi construído nesta fase (fora de
  escopo deliberado, ver rascunho - "próxima fase, depois que o fork/provisionamento básico
  estivesse validado").
- **Só a Semana 1 tem repositório-template** - as outras 11 semanas do curso piloto precisam do
  mesmo tratamento (criar o repo-template + setar `ForgejoTemplateSlug`) antes do fluxo valer pra
  matrículas reais no curso inteiro. Nada impede matricular hoje - as semanas sem slug configurado
  simplesmente não recebem repositório (mesmo comportamento de antes desta fase).
- **`FORGEJO__server__ROOT_URL` aponta pra `localhost`** - correto pro teste de hoje (tudo no
  mesmo host), mas precisa virar o endereço real alcançável pelos alunos (domínio próprio, IP do
  servidor, ou túnel Cloudflare como os outros serviços já usam, ver Fase 40) antes de qualquer
  aluno de fora desta máquina tentar `git clone`/`git push` de verdade. Marcado explicitamente nos
  comentários do `docker-compose.yml`.
- **Wiring da curadoria pra gerar repositório-template automaticamente** (hoje é 100% manual, só
  a Semana 1 foi feita à mão pra validar o mecanismo) - segue como próximo passo natural, não
  decidido ainda se vira uma skill própria ou se entra em `curar-conteudo`.
- **Backup do volume `focadu-forgejo-data`** - não existe (mesma lacuna que já existia pro volume
  do Postgres antes desta fase, `docs/DOCKER.md` não documenta backup de nenhum volume ainda).
