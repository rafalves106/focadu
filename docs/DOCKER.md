# Docker e Deploy

Guia prático de como rodar o Focadu em Docker e como o deploy automático funciona. Decisões de
arquitetura por trás disso estão em `docs/ARQUITETURA.md`, seção "Docker e Deploy (Fase 40)" —
este arquivo é só o "como fazer".

## Os dois repositórios

- **`rafalves106/focadu`** — código (backend .NET + frontend Vite). Este repo.
- **`rafalves106/focadu-secret`** — conteúdo curado (curadoria, rascunhos, MESTRE.md), privado,
  clonado à parte dentro de `secret/` (gitignored aqui, tem seu próprio `.git`, **não é
  submodule**).

Os dois precisam estar clonados lado a lado no host, com `secret/` sendo literalmente o clone de
`focadu-secret` dentro da pasta `secret/` do checkout de `focadu`:

```
/Users/falves/Dev/Servidor/focadu/          <- clone de rafalves106/focadu, branch main
/Users/falves/Dev/Servidor/focadu/secret/   <- clone de rafalves106/focadu-secret, branch main
```

Note que `secret/` é sempre a branch `main` de `focadu-secret` (ver
`secret/.github/workflows/deploy.yml`).

## Subir localmente com Docker

Na raiz do repo (`focadu/`):

```bash
cp .env.example .env
# edite .env: no minimo DB_PASSWORD e JWT_SECRET_KEY (32+ caracteres) sao obrigatorios,
# o compose falha de proposito sem eles.

docker compose up -d --build
```

Isso sobe `postgres` + `backend` (porta host `5282`, interna `8080`) + `frontend` (porta host
`5280`, interna `80`, nginx). Acesse `http://localhost:5280`.

Primeira subida — popular o currículo (idempotente, seguro rodar mais de uma vez):

```bash
docker compose exec backend dotnet Focadu.Api.dll seed
```

Migrations do EF Core aplicam sozinhas no boot do backend (não precisa rodar `dotnet ef database
update` manualmente contra o container).

### Atualizando conteúdo curado sem rebuild

`secret/` é montado como bind mount **read-only** no container do backend (path fixo `/secret`,
env var `CURATED_CONTENT_ROOT=/secret`). Editar algo em `secret/curadoria/` no host e reiniciar o
container já é o suficiente pra o backend enxergar o arquivo novo:

```bash
docker compose restart backend
```

**Ressalva importante:** isso só importa conteúdo **novo** de verdade se o curso "Web Security"
ainda não existir no banco daquele ambiente. O seed é idempotente por Curso — depois que ele já
rodou uma vez com sucesso, `docker compose exec backend dotnet Focadu.Api.dll seed` (ou um
restart) não reimporta nem sobrescreve um `dia-N.json` que já tinha sido lido antes. Isso vale
sobretudo logo após um reset de banco (banco vazio = seed de verdade insere tudo de novo, já com
o conteúdo mais recente).

## Variáveis de ambiente

Ver `.env.example` na raiz — cobre banco de dados, backend (`JWT_SECRET_KEY` obrigatório,
`GROQ_API_KEY`/`GITHUB_TOKEN`/`SMTP_*` opcionais), `SECRET_PATH` (onde fica o clone de
`focadu-secret` no host) e `FRONTEND_PORT`/`VITE_API_BASE_URL`.

`VITE_API_BASE_URL` vazio é o default recomendado: o frontend chama caminhos relativos
(`/api/...`) e o nginx do próprio container faz proxy same-origin pro backend (ver
`frontend/nginx.conf`) — não precisa de subdomínio de API dedicado no Cloudflare Tunnel.

`SMTP_*` (Fase 41, redefinição de senha) são opcionais pro app subir, mas **`FRONTEND_BASE_URL`
precisa ser preenchido com o domínio público de verdade em produção** antes do 1º uso
real do fluxo — sem ele, o link do email de redefinição aponta pro fallback de dev
(`http://localhost:5173`), inútil pra quem recebe o email fora da máquina de desenvolvimento.

## Portas (convenção fixa)

| Ambiente | Frontend | Backend | Postgres | Forgejo (web/API) | Forgejo (SSH) |
|---|---|---|---|---|---|
| Produção | `5280` | `5282` | `5432` | `3020` | `2222` |

Forgejo foge da porta padrão 3000 de propósito - já em uso por outro projeto (`homepage-homepage-1`) neste mesmo host, confirmado ao vivo ao subir o container pela primeira vez (18/09/2026).

Forgejo (repositórios de Projeto Semanal, ver `secret/rascunhos/repositorios-gerenciados-projeto-
semanal.md`) é o único serviço novo desde a Fase 40 — SQLite, sem Postgres próprio (app isolada,
sem join com o domínio C#). `FORGEJO_ADMIN_TOKEN` não é gerado automaticamente: após o primeiro
boot do container, crie manualmente a conta administrativa `focadu-admin` (via UI ou `forgejo
admin user create` dentro do container) e gere um Personal Access Token com escopo admin — cole
o valor em `FORGEJO_ADMIN_TOKEN` no `.env` correspondente. Sem isso configurado, o backend sobe
normalmente; só o provisionamento automático de repositório na matrícula fica degradado
(`WeeklyProject` fica sem `SubmissionUrl`, mesmo comportamento de antes desta integração).

## Deploy automático (CI/CD)

Dois repositórios, dois workflows, convergindo no mesmo host:

**`focadu/.github/workflows/ci.yml`** — build+test do backend (.NET) e lint+build do frontend
(Node), em todo push/PR pra `main`.

**`focadu/.github/workflows/deploy.yml`** — dispara via `workflow_run` assim que o CI acima
termina com sucesso (só em push, nunca em PR) **na branch `main`** — produção é o único ambiente
de deploy. O workflow
atualiza o código (`git reset --hard`) tanto no checkout do repo quanto no `secret/`, sobe a stack
(`docker compose up -d --build`), roda o seed (idempotente) e valida com um healthcheck HTTP no
frontend.

> **Atenção:** o `git reset --hard` roda no próprio diretório de trabalho
> (`/Users/falves/Dev/Servidor/focadu`), que neste Mac é o checkout de produção *e* onde se
> desenvolve. Edição não commitada em arquivo versionado é **descartada** no deploy: commite (ou
> faça stash) antes de dar push na `main`. O mesmo vale para o `secret/` no push do `focadu-secret`.

**`focadu-secret/.github/workflows/deploy.yml`** (no OUTRO repositório) — dispara em push na
branch `main` de `focadu-secret`. Atualiza o `secret/` do checkout de produção e reinicia +
reseeda o backend — sem rebuild de imagem, já que `secret/` é bind mount.

### Runners self-hosted (macOS)

O host de produção é este Mac (Apple Silicon). O GitHub não compartilha runner entre repositórios de
conta pessoal, então há **um runner por repositório**, todos na mesma máquina, em
`/Users/falves/actions-runners/<repo>/`. Para o Focadu são dois, `falveshub-server-focadu` e
`falveshub-server-focadu-secret`, ambos com as labels `self-hosted`, `macOS`, `ARM64` e
`falveshub-server` (o `runs-on` dos workflows é `[self-hosted, macOS, falveshub-server]`).

Cada runner roda como serviço `launchd` (`actions.runner.rafalves106-<repo>.falveshub-server-<repo>`,
plist em `~/Library/LaunchAgents`). Por ser um LaunchAgent do usuário, ele só sobe com a sessão do
usuário aberta.

Para registrar um runner novo, em cada repositório (`rafalves106/focadu` e
`rafalves106/focadu-secret`):

1. GitHub → **Settings → Actions → Runners → New self-hosted runner**, escolher **macOS / ARM64** e
   seguir os comandos de download que o GitHub mostra, dentro de `/Users/falves/actions-runners/<repo>/`.
2. Configurar com `./config.sh --url https://github.com/rafalves106/<repo> --token <token>
   --labels falveshub-server --name falveshub-server-<repo>`. As labels `self-hosted`, `macOS` e
   `ARM64` o GitHub adiciona sozinho; só `falveshub-server` é nossa e precisa bater com o `runs-on`.
3. Instalar como serviço: `./svc.sh install && ./svc.sh start`.

### Antes do primeiro deploy automático

- Criar o diretório `/Users/falves/Dev/Servidor/focadu` no host, com o clone de `focadu` (branch `main`) +
  `secret/` clonado dentro.
- Criar o `.env` (nunca commitado) com os valores reais.
- Rodar `docker compose up -d --build` manualmente uma primeira vez, pra validar que a stack
  sobe antes de depender do runner/CI.
