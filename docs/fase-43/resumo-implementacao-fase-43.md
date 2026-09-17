# Resumo — Fase 43: Fuso Horário do Container Bloqueando a Daily

## O que foi implementado

- Bug real relatado ao vivo: usuário concluiu a Daily do dia, mas no dia seguinte o sistema
  recusou liberar uma nova sessão com `daily_limite_diario_atingido` ("Você já concluiu uma Daily
  hoje... Volte amanhã"), mesmo sem ter feito nada ainda naquele dia.
- Causa raiz: o container do backend roda o relógio do SO em UTC (confirmado com
  `docker exec focadu-backend date` → `UTC`), sem nenhuma variável `TZ` setada em lugar nenhum
  (nem `backend/Dockerfile`, nem `docker-compose.yml`, nem `docker-compose.homolog.yml`).
  `SystemClock.Today()` usa `DateTime.Now` deliberadamente (não UTC — ver comentário na própria
  classe, pensado pro "dia do calendário vivido pelo usuário"), mas sem `TZ` essa "hora local" do
  container é UTC de verdade. `Weekly.EvaluateDailyAccess` (regra de "1 Daily por dia corrido",
  correção da Fase 38b) faz `CompletedAt.Value.ToLocalTime()` pra comparar com `today` — o
  comentário daquela correção já citava literalmente "qualquer horário da noite no fuso do
  Brasil" como o cenário perigoso, mas a correção assumia que o relógio do host já estava no fuso
  certo, o que nunca foi verdade em produção.
- Efeito concreto: qualquer conclusão de Daily entre ~21h e 23h59 no horário de Brasília (UTC-3)
  grava `CompletedAt` já no dia seguinte em UTC. `EvaluateDailyAccess` então acha que a conclusão
  aconteceu "hoje" (calendário UTC) e bloqueia uma nova sessão até a virada do dia em UTC — ou
  seja, até as 21h do dia seguinte no horário local, não à meia-noite local como o usuário espera.
- Correção: `TZ: America/Sao_Paulo` fixo (não via `.env` — é infraestrutura do ambiente, não
  configuração por instalação) no `environment` do serviço `backend`, em **`docker-compose.yml`
  e `docker-compose.homolog.yml`**, replicado nos dois checkouts do host (`focadu`, branch `main`,
  produção; `focadu-hml`, branch `develop`, homologação — repositórios/branches distintos que
  precisam do mesmo fix em paralelo, não é uma dependência única).
- Nenhuma mudança de código C# — é puramente configuração de ambiente do container.
- Containers `focadu-backend` e `focadu-hml-backend` recriados no host (`docker compose up -d
  backend`, sem rebuild de imagem) pra aplicar a env var nova imediatamente, sem esperar o próximo
  deploy automático via CI/CD.

## Decisões técnicas tomadas que não estavam no prompt original

- `TZ` foi setado como valor fixo no compose (não `${TZ:-America/Sao_Paulo}` via `.env`): o fuso
  correto pras regras de negócio da Daily não é uma escolha de ambiente/instalação, é uma
  constante do produto (a "Daily" é pensada em torno do calendário de Brasília
  independentemente de onde o container roda) — não faz sentido deixar configurável.
- Verificado ao vivo, antes de aplicar a correção, que a imagem runtime (`aspnet:10.0`, base
  Ubuntu 24.04 dentro do container em execução) já tem `tzdata` instalado
  (`/usr/share/zoneinfo/America/Sao_Paulo` existe) — descartada a hipótese de precisar instalar
  `tzdata` no `backend/Dockerfile`.
- Aplicado o mesmo fix nos dois `docker-compose*.yml` de cada checkout (`docker-compose.yml` e
  `docker-compose.homolog.yml`, mesmo o par que não é o efetivamente usado por aquele checkout
  específico) — os quatro arquivos são mantidos idênticos entre si (ver "Docker e Deploy" em
  `docs/ARQUITETURA.md`), deixar só um par corrigido criaria drift silencioso pro próximo
  ambiente que vier a usar o outro arquivo.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
focadu/docker-compose.yml               (+ TZ no environment do backend)
focadu/docker-compose.homolog.yml       (+ TZ no environment do backend)
focadu-hml/docker-compose.yml           (+ TZ no environment do backend)
focadu-hml/docker-compose.homolog.yml   (+ TZ no environment do backend)
focadu/docs/ARQUITETURA.md              (secao "Docker e Deploy" + cabecalho)
focadu/docs/fase-43/resumo-implementacao-fase-43.md  (este arquivo)
focadu/CLAUDE.md                        ("Estado atual")
```

## Testes

- `docker exec focadu-backend date` e `docker exec focadu-hml-backend date`: antes da correção,
  ambos mostravam `UTC`; depois de recriar os containers, ambos mostram `-03` (horário de
  Brasília correto).
- Confirmado `/usr/share/zoneinfo/America/Sao_Paulo` presente dentro do container em execução
  antes de aplicar a correção (descarta exceção de `TimeZoneInfo.FindSystemTimeZoneById` no
  boot).
- Não foi simulada uma conclusão de Daily perto da virada do dia após a correção (exigiria
  manipular o relógio do container ou esperar até ~21h de Brasília) — fica como verificação
  funcional pendente na próxima conclusão real de Daily nesse horário.

## Dúvidas ou pontos abertos para a próxima fase

- A correção foi commitada e os containers já recriados manualmente no host pra alívio
  imediato do bug; falta decidir se/quando fazer `git push` de `main` e `develop` — isso disparia
  o pipeline de CI/CD (`deploy.yml`) e recriaria os mesmos containers de novo automaticamente
  (idempotente, sem efeito adicional esperado), mas é uma ação visível (push a um repositório
  remoto) que não foi automatizada aqui.
- `docs/ARQUITETURA.md` e `docs/DOCKER.md` ainda descrevem o runner self-hosted como
  `[self-hosted, Windows, falveshub-server]` e os paths do host como `C:\Servidor\...`, mas
  `deploy.yml` já roda em `[self-hosted, macOS, falveshub-server]` contra
  `/Users/falves/Dev/Servidor/...` (commit "ci: runner e paths ajustados pra macOS" migrou o
  workflow sem atualizar essa documentação). Não corrigido nesta fase por estar fora do escopo do
  bug de fuso horário — vale uma fase (ou fixup) dedicada só a essa atualização de doc.
