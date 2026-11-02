# Resumo — Fase 49: Remove o mapeamento da branch develop do deploy

## O que foi implementado

- `.github/workflows/deploy.yml`:
  - `workflow_run.branches` de `[main, develop]` para `[main]`.
  - Removido o `elif [ "$branch" = "develop" ]` do passo "Resolver ambiente pela branch", que
    apontava pra `/Users/falves/Dev/Servidor/focadu-hml`, `docker-compose.homolog.yml` e a porta
    5290 do healthcheck.
  - Comentário do cabeçalho atualizado (homologação descontinuada em 17/09/2026).
- Efeito: produção (`main`) é o único ambiente de deploy. Um push em `develop` continua rodando o
  CI (`ci.yml` não foi alterado), mas não dispara mais deploy.
- Contexto: a homologação foi descontinuada em 17/09/2026 (containers, imagens e volume Postgres
  removidos, ver `CONTEXTO.md` na raiz do servidor). As etapas equivalentes do deploy do repo
  `focadu-secret` já tinham sido removidas em 21/09/2026: apontavam pra um checkout que não existe
  mais e faziam o job falhar em todo push, pulando o restart do backend.
- Documentação: `docs/DOCKER.md` (seção "Deploy automático" e "Antes do primeiro deploy
  automático"), `docs/ARQUITETURA.md` (CI/CD, convenção de pasta no host, cabeçalho) e `CLAUDE.md`.

## Decisões técnicas tomadas que não estavam no prompt original

- Mantive o `else` do passo de resolução ("Branch não mapeada para nenhum ambiente de deploy",
  `exit 1`) como rede de segurança, embora o filtro `branches: [main]` já impeça o job de rodar
  para qualquer outra branch.
- Não mexi no `ci.yml`: rodar testes em `develop` e em PRs continua útil e não é "mapeamento de
  ambiente".
- Não removi `docker-compose.homolog.yml`, a branch remota `develop`, a tabela de portas de
  homologação do `DOCKER.md` nem a seção de registro de runner Windows (o runner real é macOS):
  ficam fora do que foi pedido e cada um é uma decisão separada.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
.github/workflows/deploy.yml
docs/DOCKER.md
docs/ARQUITETURA.md
docs/fase-49/resumo-implementacao-fase-49.md   (este arquivo)
CLAUDE.md                                       ("Estado atual")
```

## Testes

- YAML válido (`gatilho: [main]`, 6 passos).
- Executei o script real do passo "Resolver ambiente pela branch" para três branches: `main` gera
  as mesmas 3 saídas de antes (`path`, `compose_file`, `frontend_port`); `develop` e `feature-x`
  terminam com `exit 1` e a mensagem "não mapeada".
- O workflow completo só se testa de verdade rodando um deploy: a primeira execução real é o
  próximo push na `main`.

## Dúvidas ou pontos abertos para a próxima fase

- **Push pendente de confirmação.** O `deploy.yml` só vale depois de estar em `origin/main`; o
  próprio push dispara CI + deploy já com o workflow novo, que é o teste real.
- Restos da homologação que continuam no repo e podem ser removidos numa decisão separada:
  `docker-compose.homolog.yml`, a branch remota `develop`, a tabela de portas e as instruções de
  homologação local em `docs/DOCKER.md`.
