---
name: rodar-projeto
description: "Sobe o Focadu localmente (Postgres via Docker, API .NET em background, frontend Vite em background) e confirma com smoke test que ambos respondem de verdade. Use quando o usuário pedir para rodar, subir, iniciar ou testar o projeto/app/aplicação localmente, ou invocar /rodar-projeto. Não usar para deploy em produção nem para rodar só a suíte de testes (`dotnet test` isolado)."
metadata:
  version: 1.0.0
---

# Rodar o Focadu localmente

Fonte da verdade do setup: seção "Como configurar a chave JWT" / "Como rodar localmente" de
`docs/ARQUITETURA.md`. Este SKILL só automatiza esses mesmos passos e valida que funcionaram —
se os dois divergirem, `docs/ARQUITETURA.md` vence.

## 1. Postgres

```bash
docker ps --filter name=focadu-postgres --format '{{.Status}}'
```

Se não aparecer nada `(healthy)`, suba:

```bash
cd backend && docker compose up -d
```

## 2. Migrations (idempotente — seguro rodar sempre)

```bash
cd backend
dotnet ef database update -p src/Focadu.Infrastructure --startup-project src/Focadu.Infrastructure
```

## 3. Secrets da API (dev = `dotnet user-secrets`, nunca `appsettings.json`)

```bash
cd backend/src/Focadu.Api && dotnet user-secrets list
```

- `Jwt:SecretKey` é **obrigatório** — sem ele a API não sobe (falha no boot). Se estiver
  ausente, **avise o usuário e peça uma chave** em vez de inventar uma (é a chave que assina
  sessões); só gere você mesmo se o usuário pedir explicitamente.
- `Groq:ApiKey` e `GitHub:Token` são opcionais para só **subir** o app: sem eles a API sobe
  normalmente, mas avaliação por voz, analogias e commit de módulo ficam degradados. Só
  sinalize a ausência, não bloqueie a subida por causa deles.

## 4. Seed do curso (idempotente, encerra sozinho — não é o servidor)

```bash
dotnet run --project ../../backend/src/Focadu.Api -- seed   # ajuste o path relativo ao cwd
```

Roda os dois seeders (curso "Web Security" + catálogo de cosméticos) e sai sem subir HTTP —
seguro rodar toda vez, ele mesmo detecta se já existe.

## 5. Subir a API em background

```bash
cd backend/src/Focadu.Api
dotnet run --urls http://localhost:5282
```

Use a URL explícita (bate com `frontend/.env.local` → `VITE_API_BASE_URL`) em vez de confiar
no profile do `launchSettings.json`. Rode em background (`run_in_background: true` na tool
Bash) redirecionando stdout/stderr pro scratchpad da sessão — não pro `/tmp` solto.

## 6. Subir o frontend em background

```bash
cd frontend
[ -d node_modules ] || npm install
cp -n .env.example .env.local   # só se .env.local ainda não existir
npm run dev
```

Também em background, mesmo esquema de log no scratchpad. Porta default do Vite é `5173`.

## 7. Smoke test — não declare sucesso sem isto

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5282/health   # espera 200 -> {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/         # espera 200
```

Se algum dos dois não vier 200, leia o log correspondente no scratchpad antes de reportar
qualquer coisa como "rodando".

## Ao terminar

Relate as duas URLs (`http://localhost:5282` API, `http://localhost:5173` frontend) e onde
ficaram os logs. Não mate os processos sozinho ao final da tarefa — eles devem continuar de pé
para o usuário usar o app; só pare se o usuário pedir.

## Referências

- `docs/ARQUITETURA.md` — seções "Como configurar a chave JWT" e "Como rodar localmente"
  (contém também a connection string default do Postgres e onde ela pode ser sobrescrita).
