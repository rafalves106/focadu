# Contexto de Infraestrutura, Deploy e Integrações Externas

## 1. Topologia de Produção e Host

- **Host Atual**: VM Linux ARM64 na Oracle Cloud (`focadu-vm-vnic`). O ambiente de homologação (`focadu-hml`) foi **descontinuado** e não deve ser recriado.
- **Rede Externa**: Exposição via Cloudflare Tunnel para `focadu.falveshub.com`. Apenas a porta 22 (SSH) responde externamente pela VM.
- **Compose de Produção (`docker-compose.yml`)**: 4 Containers na mesma rede:
  - `frontend` (porta 5280) - Nginx + Vite SPA. Proxy same-origin de `/api/` para o backend (não usamos subdomínios separados nem CORS no Cloudflare).
  - `backend` (porta 5282) - .NET Api (ASP.NET Core Minimal APIs).
  - `postgres` (porta 5432) - PostgreSQL.
  - `forgejo` (porta 3020 e 2222) - Servidor Git privado para projetos semanais (sem Postgres, usa SQLite embutido).
- **Fuso Horário do Container**: O container do backend tem `TZ=America/Sao_Paulo` forçado.

## 2. CI/CD e Processo de Deploy

O deploy ocorre 100% via GitHub Actions usando _self-hosted runners_ configurados dentro da VM da Oracle Cloud.

- **Continuous Integration (`ci.yml`)**: Roda no Ubuntu-latest da nuvem em Push/PR na `main`. Faz Build+Test (.NET) e Lint+Build (Vite).
- **Continuous Deployment (`deploy.yml`)**: Dispara via `workflow_run` (só se o CI passar, apenas em push na `main`).
  - Executa um `git reset --hard` na VM (cuidado: perde qualquer edição local na VM).
  - Faz backup do banco de dados (Postgres) localmente via `pg_dump`.
  - Dá um `docker compose up -d --build`.
  - Executa as migrations automaticamente no boot da API.
  - Roda o seed de curadoria via `dotnet run -- seed`.

## 3. Repositório de Curadoria (`secret/`)

- A pasta `secret/` na VM é um clone local e atualizado do repositório privado `focadu-secret` (conteúdo editorial).
- No Docker, o `secret/` é mapeado como um bind-mount _read-only_ em `/secret` no container do backend, com a flag `CURATED_CONTENT_ROOT=/secret`. Atualizar os arquivos não exige rebuild, apenas restart/re-seed da API.
- **Limitação de Seed**: O método `SeedWebSecurityCourseUseCase` é idempotente por Curso. Se você editar um dia já seedado, o comando de seed ignorará a mudança porque o curso já existe no banco (para forçar, só atualizando via banco de dados temporariamente).

## 4. Forgejo Interno (Projetos Semanais)

Os repositórios de projetos práticos são mantidos no nosso próprio Git (Forgejo).

- **Criação e Fluxo**: A matrícula NÃO faz mais o fork (alteração Fase 105). O repositório do aluno é provisionado sob demanda em `WeeklyProjectRepositoryProvisioner` apenas quando as Dailies obrigatórias (conteúdo) da semana terminam e o projeto é aberto.
- **Privacidade (Fase 100)**: Os repositórios de templates (gerenciados pelo admin) e os forks dos alunos são estritamente **privados** (`RequirePrivateForks`). Os alunos acessam seus repósitoris via token administrativo clonado.
- O aluno gera/revoga o token no painel (`POST /api/users/me/forgejo-token`). O token é mantido no Forgejo; nós só guardamos os últimos 8 caracteres para verificação de tela.

## 5. Linguagens e Variantes de Projeto

- Projetos semanais podem ter **variantes de linguagem** (ex: `Python` vs `JavaScript`).
- Essa preferência é selecionada no perfil e escolhida definitivamente pelo aluno antes do Fork, quando o projeto é desbloqueado.
- O Forgejo avalia o fork automaticamente através do Groq, buscando o Snapshot (`GetContentSnapshotAsync` via Git Trees API) para enviar ao LLM.

## 6. Integrações de IA (Groq)

- `IContentEvaluationService` e `IProjectEvaluationService`: Consomem a API do Groq (modelos LLM OSS e Whisper).
- Requerem explicitamente que o LLM responda em "português do Brasil" e obrigatoriamente operam em `JSON Mode`. Se a formatação falhar, é tratado como `ExternalServiceException`.
