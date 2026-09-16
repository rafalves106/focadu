# Resumo — Fase 40: Dockerização (Backend + Frontend) e CI/CD de Deploy Automático

## O que foi implementado

**Dockerização:**
- `backend/Dockerfile`: multi-stage (`sdk:10.0` restaura/publica só `Focadu.Api.csproj` →
  `aspnet:10.0` runtime, porta interna 8080, `HEALTHCHECK` em `/health`).
- `frontend/Dockerfile`: multi-stage (`node:22-alpine` builda → `nginx:alpine` serve `dist/`,
  porta interna 80). `VITE_API_BASE_URL` como build ARG (default vazio).
- `frontend/nginx.conf`: proxy same-origin de `/api/` para o container do backend - o SPA chama
  caminhos relativos, nunca cross-origin de verdade, sem precisar de subdomínio de API dedicado
  nem mexer em CORS.
- `backend/.dockerignore`, `frontend/.dockerignore`.
- `docker-compose.yml` (produção) e `docker-compose.homolog.yml` (homologação - stack completa e
  isolada: nomes de container, volume de Postgres e portas de host próprios). Portas de host via
  `.env`: produção frontend `5280`/backend `5282`/postgres `5432`; homolog frontend
  `5290`/backend `5292`/postgres `5433`.
- `.env.example` na raiz, documentando todas as variáveis novas.

**Mudanças de código no backend (necessárias pra rodar em container, não só infra):**
- `Program.cs`: `dbContext.Database.MigrateAsync()` automático no boot, antes de `app.Run()` (e
  antes do `if (args.Contains("seed"))`) - a imagem runtime não tem `dotnet-ef`/SDK instalado, não
  tinha como aplicar migration manualmente dentro do container.
- `SeedWebSecurityCourseUseCase.CuratedContentPath`: passou a checar a env var
  `CURATED_CONTENT_ROOT` primeiro - se definida, usa ela direto (`Path.Combine(root, "curadoria",
  CourseSlug, ...)`), sem subir diretório procurando `.git` (que não existe dentro de um
  container - a imagem só tem o publish output).

**Sincronização de `secret/`:** montado como bind mount **read-only** no container do backend
(`/secret`), com `CURATED_CONTENT_ROOT=/secret` - uma atualização do clone de `focadu-secret` no
host fica visível pro container sem rebuild de imagem.

**CI/CD (dois repositórios):**
- `focadu/.github/workflows/ci.yml`: build+test do backend (.NET), lint+build do frontend (Node).
- `focadu/.github/workflows/deploy.yml`: dispara via `workflow_run` após o CI passar (só em push
  a `main`/`develop`, nunca em PR) - resolve ambiente pela branch, `git reset --hard` no código E
  no `secret/` correspondente, `docker compose up -d --build`, roda o seed (idempotente),
  healthcheck HTTP no frontend.
- `focadu-secret/.github/workflows/deploy.yml` (repo separado, só branch `main`): `git reset
  --hard` nos dois checkouts do host (produção e homolog), restart + seed nos dois backends (sem
  rebuild, `secret/` é bind mount).
- Runner: `[self-hosted, Windows, falveshub-server]` (registro em si é passo manual futuro, ver
  `docs/DOCKER.md`).

**Documentação:** `docs/DOCKER.md` (guia prático - subir localmente, variáveis, runbook de
deploy, registro do runner) + esta seção em `docs/ARQUITETURA.md` ("Docker e Deploy (Fase 40)").

## Decisões técnicas tomadas que não estavam no prompt original

- **Migrations automáticas no boot em TODO ambiente** (não só Dev, ao contrário do projeto
  "financas" usado como referência, que aplica só em Dev e tem runbook manual pra produção). Escolha
  deliberada: o pedido explícito era deploy 100% automático sem acesso manual à máquina - um
  runbook manual de migration quebraria exatamente esse objetivo. Como `MigrateAsync` é
  idempotente e o compose já garante Postgres saudável antes do backend subir
  (`depends_on: condition: service_healthy`), o risco é baixo pro perfil deste projeto
  (uso pessoal/single-tenant, não um sistema financeiro com dados de terceiros).
- **Proxy same-origin via nginx** (`/api/` → backend), em vez de `VITE_API_BASE_URL` apontando pra
  um subdomínio de API separado. Mesma solução do "financas" na parte de docker-compose (não na
  parte Vercel, que não se aplica aqui). Motivo: `frontend/src/api/client.ts` já monta os caminhos
  como `${BASE_URL}${path}` com `path` incluindo `/api/...` e cai pra string vazia sem
  `VITE_API_BASE_URL` - encaixa direto no truque de proxy sem mudar nada no client. Evita precisar
  de uma segunda entrada de Cloudflare Tunnel por ambiente e evita tocar na allowlist de CORS
  (`Program.cs`, continua hardcoded em `localhost:5173`).
- **`CURATED_CONTENT_ROOT` como env var direta (não `IConfiguration`/`appsettings`):** é um único
  valor lido em um lugar só, não parte de uma seção de configuração maior - não justificava passar
  pelo `IConfiguration` do ASP.NET Core.
- **`docker-compose.homolog.yml` como arquivo standalone completo, não um `override.yml`
  camadinha por cima do de produção:** produção e homologação rodam em diretórios de checkout
  totalmente separados no host (`C:\Servidor\focadu` vs `C:\Servidor\focadu-hml`, cada um com seu
  próprio `.env`), nunca no mesmo diretório - um override faria sentido se fossem o mesmo
  checkout com uma camada por cima, o que não é o caso aqui.
- **appsettings.json não foi editado para a connection string** - o pedido original listava isso
  como entregável, mas o `ConnectionStrings:Focadu` já é sobrescrito por env var
  (`ConnectionStrings__Focadu`) automaticamente pelo provider de configuração padrão do ASP.NET
  Core (env vars têm precedência sobre `appsettings.json` fora da caixa) - editar o JSON não
  mudaria nenhum comportamento, só reescreveria o mesmo valor.
- **Não foi criado nenhum mecanismo de reseed incremental** (ver "Dúvidas" abaixo) - ficaria fora
  do escopo de "dockerizar + CI/CD", que foi o pedido original.

## Estrutura de arquivos criada

```
backend/Dockerfile
backend/.dockerignore

frontend/Dockerfile
frontend/nginx.conf
frontend/.dockerignore

docker-compose.yml
docker-compose.homolog.yml
.env.example

.github/workflows/ci.yml
.github/workflows/deploy.yml

secret/.github/workflows/deploy.yml   (repo separado, focadu-secret)

docs/DOCKER.md
docs/fase-40/resumo-implementacao-fase-40.md
```

Arquivos existentes alterados: `backend/src/Focadu.Api/Program.cs` (migration automática +
using novo), `backend/src/Focadu.Application/Seed/SeedWebSecurityCourseUseCase.cs`
(`CURATED_CONTENT_ROOT`), `docs/ARQUITETURA.md`, `CLAUDE.md` ("Estado atual").

## Testes

- `dotnet build Focadu.slnx --configuration Release`: sucesso (0 erros; os 3 warnings de conflito
  de versão do EF Core em `Focadu.Tests.csproj` já existiam antes desta fase, não relacionados).
- Build das imagens Docker e subida completa da stack (`docker compose up -d --build`) **não
  foram exercitados de ponta a ponta nesta sessão** - a máquina Windows + Docker Desktop de
  destino ainda não está pronta (consolidação de servidor em andamento, ver contexto do prompt
  original). Recomendação: antes do primeiro deploy real, rodar
  `docker compose up -d --build` localmente (ou na máquina de destino assim que disponível) e
  seguir o checklist de validação em `docs/DOCKER.md`.

## Dúvidas ou pontos abertos para a próxima fase

- **Reseed incremental não existe.** `SeedWebSecurityCourseUseCase` é idempotente por Curso -
  depois que "Web Security" já existe no banco, editar um `dia-N.json` e reiniciar/re-rodar o
  seed não atualiza nada. Isso não é um problema introduzido por esta fase (já era assim antes,
  fora do contexto Docker), mas fica mais visível agora que o pipeline de CI/CD do
  `focadu-secret` promete "refletir mudanças de curadoria sem precisar mexer no código" - hoje
  isso só é verdade para um ambiente com banco vazio (primeiro deploy, ou homolog logo após reset
  de banco). Se o curadoria for editada com frequência em ambientes já seedados, vale considerar
  um mecanismo de reseed por semana/dia no futuro.
- **Registro do runner self-hosted nos dois repositórios** (`focadu` e `focadu-secret`) ainda não
  foi feito - depende da máquina Windows + Docker Desktop estar pronta. Passo a passo em
  `docs/DOCKER.md`.
- **Branch `develop` ainda não existe** em nenhum dos dois repositórios locais - precisa ser
  criada a partir de `main` antes do primeiro push de homologação (`git checkout -b develop` +
  push, nos dois repos).
- **Build Docker real (imagens + stack completa) ainda não foi testado** nesta sessão - ver
  "Testes" acima.
- **CORS continua hardcoded em `localhost:5173`/`127.0.0.1:5173`** (pendência já documentada
  antes desta fase) - só passaria a importar de verdade se `VITE_API_BASE_URL` um dia apontar pra
  um domínio diferente do da frontend (hoje não aponta, graças ao proxy nginx same-origin).
