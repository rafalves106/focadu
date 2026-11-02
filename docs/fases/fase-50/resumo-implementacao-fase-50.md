# Resumo — Fase 50: Remove os restos da homologação (focadu-hml)

## O que foi implementado

- Removido `docker-compose.homolog.yml` (stack isolada de homologação: containers `focadu-hml-*`,
  volumes próprios, portas 5290/5292/5433/3030/2232). Nenhum workflow, script ou código o
  referenciava, só documentação.
- `.env.example`: saíram as notas e valores de homologação (nomes de banco, portas, `JWT_SECRET_KEY`
  diferente entre ambientes, pasta `focadu-hml\secret`) e a referência a `README.Docker.md`, que não
  existe (o guia é `docs/DOCKER.md`).
- `docs/DOCKER.md`: saíram o checkout `focadu-hml`, as instruções de subir homologação local, a
  linha de homologação da tabela de portas e as menções em "Variáveis de ambiente", "Deploy
  automático" e "Antes do primeiro deploy automático".
- `docs/ARQUITETURA.md`: mesma limpeza nas seções de Forgejo, config de e-mail, Docker/Deploy e
  fuso horário; cabeçalho passou a "Fase 50".
- Comentários sem menção à homologação em `.github/workflows/deploy.yml`, em
  `secret/.github/workflows/deploy.yml` e em `DependencyInjection.cs`.
- `CLAUDE.md`: "Estado atual" e os marcos das Fases 40, 41, 43 e 44 sem homologação.
- Fora deste repo: `secret/rascunhos/repositorios-gerenciados-projeto-semanal.md` (commit próprio no
  `focadu-secret`) e, na raiz do servidor (sem git), `CONTEXTO.md` e `setup-windows.ps1` (sem
  `focadu-hml`: contagens de projetos/rotas de 7 para 6, clone único do `secret`, rota
  `hml-focadu.falveshub.com` removida).
- Contexto: o ambiente foi descontinuado em 17/09/2026 (containers, imagens e volume Postgres
  removidos). A Fase 49 deixou estes restos como "decisão separada"; a decisão foi remover.

## Decisões técnicas tomadas que não estavam no prompt original

- Não editei os `docs/fase-N/` anteriores (40, 41, 43, 44, 45, 46, 49) que citam homologação: são
  histórico imutável (`docs/CONVENCOES.md`). Já o `CLAUDE.md` e o `ARQUITETURA.md` são vivos e foram
  editados.
- Não mexi no `ci.yml`: rodar testes em `develop` não é "ambiente" (mesma decisão da Fase 49).
- Não removi a branch remota `develop`: apagar branch remota é ação externa e à parte.
- Mantive uma menção curta de "descontinuado, não recriar" no `CLAUDE.md` e no `CONTEXTO.md`, para
  que uma sessão futura entenda por que `financas-hml` continua na tabela e `focadu-hml` não.
- Não toquei em `financas-hml` (outro projeto, ambiente ainda em execução).
- O conteúdo do curso Web Security cita "staging"/"homologação" como conceito ensinado (DAST, EASM,
  risco técnico x de negócio), não como o ambiente da Focadu. Não foi alterado.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
docker-compose.homolog.yml                       (removido)
.env.example
.github/workflows/deploy.yml                     (só comentário)
backend/src/Focadu.Infrastructure/DependencyInjection.cs   (só comentário)
docs/DOCKER.md
docs/ARQUITETURA.md
docs/fase-50/resumo-implementacao-fase-50.md     (este arquivo)
CLAUDE.md                                        ("Estado atual")
```

## Testes

- `grep` por homologação/`hml`/portas 5290, 5292, 5433, 3030 e 2232 no repo (exceto
  `docs/fase-N/` históricos e `curadoria/`): sobraram só os registros intencionais desta fase.
- YAML válido nos dois `deploy.yml` (`focadu` e `focadu-secret`).
- `docker compose -f docker-compose.yml config -q` (com variáveis fictícias): OK. O compose de
  produção não foi alterado.
- Fences ` ``` ` do `DOCKER.md` balanceadas.
- Não rodei `dotnet build`: a única mudança em C# é um comentário.

## Dúvidas ou pontos abertos para a próxima fase

- **Push pendente de confirmação.** Push na `main` dispara CI e deploy de produção.
- Branch remota `develop`: se for apagada, tirar também `develop` de `ci.yml` e de
  `docs/DOCKER.md`/`docs/ARQUITETURA.md` (seções de CI).
- Verificar no dashboard do Cloudflare Zero Trust se ainda existe rota/Public Hostname para
  `hml-focadu.falveshub.com` (não há como checar daqui).
- A seção de registro de runner Windows do `docs/DOCKER.md` continua descrevendo Windows enquanto o
  runner real é macOS (pendência já apontada na Fase 49, fora desta fase).
