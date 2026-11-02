# Resumo — Fase 53: Remove a branch develop e corrige as docs do host (macOS)

## O que foi implementado

- **Branches remotas apagadas** (só `main` resta nos dois repos). SHAs, para recuperar se preciso:
  - `focadu`: `develop` (`aad7c8f`) e `feat/dashboard-status-e-carrossel` (`8bfcc5e`).
  - `focadu-secret`: `develop` (`794aaa3`).
  - Antes de apagar, conferi que não havia nada exclusivo: a `develop` do `focadu` só tinha 6 linhas
    (o `TZ` em `docker-compose.yml`/`docker-compose.homolog.yml`, e o `TZ` e o runner macOS já estão na
    `main`); a `develop` do `secret` tinha 1 commit equivalente a um já na `main`; a `feat/...` já estava
    mergeada. A exclusão não disparou nenhum workflow.
- `.github/workflows/ci.yml`: `push` e `pull_request` só em `main`. `deploy.yml`: comentário sem `develop`.
- **Docs do host corrigidas de Windows para macOS.** `docs/DOCKER.md`, `docs/ARQUITETURA.md`,
  `.env.example` e `CLAUDE.md` passam a descrever o host real: este Mac (Apple Silicon), runners
  `[self-hosted, macOS, falveshub-server]` em `/Users/falves/actions-runners/<repo>/` como serviço
  `launchd`, pasta `/Users/falves/Dev/Servidor/focadu`. A seção de registro de runner foi reescrita para
  macOS (`config.sh`, `svc.sh`).
- **Aviso novo no `DOCKER.md`:** o deploy faz `git reset --hard` no próprio diretório de trabalho, então
  edição não commitada em arquivo versionado é descartada.
- Fora do repo (sem git): `CONTEXTO.md` e `setup-windows.ps1` na raiz do servidor.
- Contexto: itens 5 e 8 da lista de pontos em aberto de 21/09/2026. Decisões do usuário: apagar as
  branches, e "será rodado no mac".

## Decisões técnicas tomadas que não estavam no prompt original

- **A doc do runner foi escrita a partir do que existe, não de suposição:** `gh api
  repos/.../actions/runners` (os=macOS, online, labels `self-hosted,macOS,ARM64,falveshub-server`),
  `launchctl list`, os plists em `~/Library/LaunchAgents` e os processos `Runner.Listener` em
  `/Users/falves/actions-runners/`. Os passos de registro seguem a documentação do GitHub para macOS; não
  executei `config.sh` (não registrei runner novo).
- Não alterei o `git reset --hard` do `deploy.yml`: mudá-lo (por exemplo, deploy num checkout separado do
  de desenvolvimento) é decisão de infraestrutura, então só documentei o risco.
- `docs/fase-N` anteriores ficaram como estão (histórico imutável): os que falam em Windows ou `develop`
  descrevem o que era verdade na época.
- `up.sh` e `migrate.sh` (raiz) são da migração do servidor Linux antigo, com nomes de pasta antigos;
  não foram tocados.
- `financas-hml` permanece (decisão do usuário); o `CONTEXTO.md` continua listando.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
.github/workflows/ci.yml
.github/workflows/deploy.yml                (só comentário)
.env.example                                (só comentário)
docs/DOCKER.md
docs/ARQUITETURA.md
docs/fase-53/resumo-implementacao-fase-53.md (este arquivo)
CLAUDE.md                                   ("Estado atual")
```

## Testes

- YAML válido em `ci.yml` e `deploy.yml`; `grep` de sobras: nenhum `develop` nem Windows/`C:\` nos docs
  vivos e nos workflows (só as menções históricas, intencionais, no `CLAUDE.md`).
- `git ls-remote --heads` nos dois repos: só `main`.
- Não testei o CI com a nova regra de gatilhos: a primeira execução real é o próximo push na `main`.

## Dúvidas ou pontos abertos para a próxima fase

- **Push pendente.** O checkout tinha edições não commitadas de outra frente de trabalho (backend: `Weekly`,
  `DailySequencing`, `DailyAccessMode` e testes). O deploy as apagaria com o `reset --hard`, então o push
  aguarda essa frente commitar (ou fazer stash).
- O deploy resetar o diretório de trabalho continua sendo um risco de processo. Uma saída é fazer o
  deploy num checkout dedicado, separado do de desenvolvimento.
- Cloudflare: `hml-focadu.falveshub.com` ainda resolve e responde 502 (rota e registro DNS a remover no
  dashboard).
- Os runners são LaunchAgents do usuário: só sobem com a sessão aberta. Vale confirmar se o Mac tem login
  automático após reinício.
