## Docker e Deploy (Fase 40)

Guia pratico completo (comandos, variaveis, runbook de deploy) em `docs/DOCKER.md` - esta secao
so resume as decisoes de arquitetura.

**Backup e portas (Fase 100):** o `deploy.yml` faz `pg_dump -Fc` do Postgres em `~/backups/focadu-pre-deploy-<data>.dump` **antes**
do `up --build` (e portanto antes de a migration rodar no boot da Api). Falha fechado: banco no ar e dump vazio = o deploy para; sem
container (primeiro deploy) segue. Arquivo `umask 077` (so o dono; tem hash de senha e dado pessoal) e guarda os 14 ultimos. O
`publicar-conteudo.yml` ja fazia o seu proprio dump antes de importar. **Ainda nao existe** copia fora da VM nem criptografia (precisa
de um destino, ex.: Object Storage da Oracle, e de uma chave). Restauracao testada em 14/10/2026: `pg_restore --exit-on-error` do dump de
13/10 num Postgres 16 temporario (sem rede) saiu com 0 e trouxe as 47 tabelas. O compose publica o Postgres (`5432`) e a Api (`5282`) so em
`127.0.0.1`; o frontend (`5280`) e o Forgejo (`3020`, `2222`) continuam em todas as interfaces, porque o `cloudflared` da VM aponta para
`localhost:5280` e `localhost:3020`. De fora da VM so a porta 22 responde (a lista de entrada da Oracle bloqueia o resto).

**Dois Dockerfiles, multi-stage:**
- `backend/Dockerfile`: SDK 10.0 restaura/publica so `Focadu.Api.csproj` -> runtime `aspnet:10.0`
  (porta interna 8080, `HEALTHCHECK` em `/health`, `curl` instalado so pra isso).
- `frontend/Dockerfile`: `node:22-alpine` builda (`npm ci && npm run build`) -> `nginx:alpine`
  serve `dist/` (porta interna 80). `VITE_API_BASE_URL` e build ARG (Vite embute em build-time,
  nao da pra trocar depois em runtime) - default vazio, ver proxy abaixo.

**Frontend e backend nunca ficam em dominios separados** - `frontend/nginx.conf` faz proxy
same-origin de `/api/` pro container do backend (mesmo truque do projeto "financas"). Como
`frontend/src/api/client.ts` ja monta URLs como `${BASE_URL}${path}` com `path` incluindo `/api/...`
e `BASE_URL` cai pra string vazia quando `VITE_API_BASE_URL` nao e definida, o SPA em producao
chama caminhos relativos e o navegador nunca faz uma requisicao cross-origin de verdade. Isso
evita precisar de subdominio de API dedicado no Cloudflare Tunnel e evita mexer na allowlist de
CORS (`Program.cs`; configuravel por `Cors__AllowedOrigins` desde a Fase 99 - so precisaria mudar se um dia
o backend for exposto num dominio proprio).

**`docker-compose.yml`** (producao) vive na raiz do repo, ao lado de `.env.example`. Servicos:
`postgres`/`backend`/`frontend`/**`forgejo`** (Fase 46, ver secao propria "Forgejo interno"
acima). Portas de host (via `.env`, nao versionado): frontend `5280`/backend `5282`/postgres
`5432`/forgejo `3020`.

**Sincronizacao com `secret/` (Fase 40, achado importante):** o conteudo curado
(`secret/curadoria/*.json`) so e lido pelo comando `dotnet run -- seed`
(`SeedWebSecurityCourseUseCase`), nunca por nenhum endpoint HTTP em runtime normal (ver "Seed de
conteudo" acima). `CuratedContentPath` originalmente resolvia o caminho subindo diretorios ate
achar `.git` - isso nao existe dentro de um container (a imagem so tem o publish output). Fase 40
adicionou um atalho: se a env var `CURATED_CONTENT_ROOT` estiver definida, o metodo usa ela
diretamente (`Path.Combine(root, "curadoria", CourseSlug, ...)`), sem subir diretorio nenhum. O
compose monta `secret/` do host como bind mount **read-only** no container do backend (path fixo
`/secret`) e seta `CURATED_CONTENT_ROOT=/secret` - assim uma atualizacao do clone de
`focadu-secret` no host fica visivel pro container sem rebuild de imagem, so precisa reiniciar (ou
re-executar o seed).

**Ressalva que fica pro futuro, nao resolvida nesta fase:** `SeedWebSecurityCourseUseCase` e
idempotente **por Curso** - depois que "Web Security" ja existe no banco, `ExecuteAsync` retorna
sem ler nenhum arquivo de novo. Ou seja: editar um `dia-N.json` ja seedado e reiniciar/re-rodar o
seed **nao** atualiza o conteudo ja carregado no Postgres; isso so reflete de verdade num banco
ainda vazio (primeiro deploy de um ambiente, ou logo apos um reset de banco). Reseed
incremental (por semana/dia, nao so por curso inteiro) ainda nao existe - ver `docs/fase-40/
resumo-implementacao-fase-40.md` pra mais detalhe.

**CI/CD (dois repositorios, dois gatilhos):**
- `focadu/.github/workflows/ci.yml`: build+test do backend (.NET) e lint+build do frontend
  (Node), em push/PR pra `main`.
- `focadu/.github/workflows/deploy.yml`: dispara via `workflow_run` apos o CI passar (so em push,
  nunca em PR) **so na branch `main`** (producao e o unico ambiente de deploy), `git reset --hard` no path do
  codigo E no `secret/` (o mesmo diretorio onde se desenvolve: edicao nao commitada e perdida),
  `docker compose up -d --build`, roda o seed (idempotente, seguro toda vez), healthcheck HTTP no
  frontend.
- `focadu-secret/.github/workflows/deploy.yml` (repo separado, so branch `main`): `git reset
  --hard` no `secret/` do checkout de producao, restart + seed do backend (sem rebuild de imagem,
  ja que `secret/` e bind mount).
- Runner: `[self-hosted, macOS, falveshub-server]` (ARM64), um por repositorio, todos neste Mac em
  `/Users/falves/actions-runners/<repo>/` como servico launchd - ver `docs/DOCKER.md`.
- Convencao de pasta no host: `/Users/falves/Dev/Servidor/focadu` (producao, branch `main`), com
  `secret/` dentro como clone de `focadu-secret`.

**Fuso horario do container (Fase 43, bug real relatado ao vivo):** o container do backend roda
o relogio do SO em UTC por padrao - sem nenhuma variavel `TZ` setada, `DateTime.Now` (usado por
`SystemClock.Today()`, a "hora local" de que as regras de acesso a Daily dependem) na verdade
retornava hora UTC, nao hora de Brasilia. Concluir uma Daily entre ~21h e 23h59 no horario local
gravava `CompletedAt` (UTC) ja no dia seguinte em UTC; a comparacao de "1 Daily por dia corrido"
(`Weekly.EvaluateDailyAccess`, correcao da Fase 38b) fazia `ToLocalTime()` sobre esse timestamp
mas o "local" do container era o proprio UTC - entao ela achava que a conclusao ja tinha
acontecido "hoje" e bloqueava o usuario o dia inteiro seguinte, so liberando de novo na virada do
dia em UTC (21h de Brasilia, nao meia-noite local). Correcao: `TZ: America/Sao_Paulo` fixo (nao
via `.env`) no `environment` do servico `backend` do `docker-compose.yml` - imagem runtime
(`aspnet:10.0`, Debian) ja tem `tzdata`, `TimeZoneInfo.FindSystemTimeZoneById` funciona sem
mudanca de codigo. Não precisa de rebuild de imagem, so recreate do container (`docker compose up
-d backend`) pra pegar a env var nova.