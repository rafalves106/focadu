# Focadu — contexto do projeto

> Leia isto primeiro em qualquer sessão nova. Este arquivo é um **mapa de orientação e regras de
> processo** — não duplica o estado técnico detalhado, que vive em `docs/ARQUITETURA.md`. Se algo
> aqui divergir de `docs/ARQUITETURA.md`, o `ARQUITETURA.md` vence (é o documento vivo).

## O que é

Focadu é uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto é "Web
Security" (currículo completo desde a Fase 26: 4 módulos / 12 semanas / 12 projetos; desde a Fase 69,
72 dias - 6 por semana, o 6º é a ponte pro projeto, "code comigo" desde a Fase 79). A
missão do produto é forçar compreensão real de fundamentos — não resposta fácil de IA — através de
sessões diárias com múltiplas etapas, avaliação por voz via Groq (transcrição Whisper + nota/
feedback por LLM), sistema de pontuação/reforço adaptativo, atividades variadas (quiz, ligar-
palavras, cloze, roleplay, leitura, vídeo) e prova pública de evolução (commit no GitHub +
publicação no LinkedIn ao fim de cada módulo). É construído do zero, em fases sequenciais, cada
uma via um prompt técnico colado no Claude Code — ver "Mapa da documentação" abaixo para como o
histórico disso é preservado.

Desde a Fase 12 o app é multiusuário com autenticação real (JWT). Desde a Fase 13a o domínio é
**Template vs. Instância**: `Course`/`Monthly`/`WeeklyTemplate`/`DailyTemplate`/`DailyActivity` são
currículo compartilhado (admin-authored); `Weekly`/`Daily`/`ActivityResponse`/`WeeklyProject`/
`ModulePublication` são progresso por usuário, criados na matrícula (`Enrollment`, via
`EnrollUserInCourseUseCase`).

## Estrutura do monorepo

```
focadu/
├── CLAUDE.md          <- este arquivo
├── docs/              <- documentação de todo o projeto (não só backend), ver mapa abaixo
├── backend/           <- .NET, Hexagonal (Ports & Adapters) + DDD (Dockerfile próprio)
├── frontend/          <- Vite + React + TypeScript (Dockerfile + nginx.conf próprios)
├── docker-compose.yml / .env.example   <- stack de produção, ver docs/DOCKER.md
├── .github/workflows/ <- ci.yml (build+test+lint) e deploy.yml (runner self-hosted Linux, pós-CI)
├── .claude/           <- skills (`skills/`), agentes `editor-pedagogico` e `revisor-editorial` e `launch.json`
├── whatsapp-service/  <- serviço Node isolado de notificação, fase futura (ainda placeholder)
└── secret/            <- git próprio, ignorado pelo repo principal (ver .gitignore).
                          Documento de produto/negócio (MESTRE.md) + curadoria de conteúdo
                          didático + rascunhos de ideias não decididas. NÃO é a referência
                          técnica — isso é sempre docs/ARQUITETURA.md.
```

## Stack

- **Backend**: .NET 10, C# puro no domínio, PostgreSQL + EF Core (Code-First), xUnit, ASP.NET Core
  minimal APIs. Camadas com regra de dependência única: `Api -> Infrastructure -> Application ->
  Domain` (`Domain` nunca depende de nada externo). `Focadu.Tests` cobre só domínio puro e funções
  `internal static` da Application — não há fakes de repositório no projeto.
- **Frontend**: Vite + React 19 + TypeScript + React Router 7 + Tailwind CSS v4 (tokens via
  `@theme`), client HTTP tipado com fetch nativo, sem lib de estado extra.
- **Serviços externos**: Groq (Whisper `whisper-large-v3` p/ transcrição, `openai/gpt-oss-120b` p/
  avaliação e analogias personalizadas, sempre JSON mode) e GitHub API (commit de módulo, base do
  futuro SAST). Validação de post no LinkedIn é só estrutural (formato da URL).

## Mapa da documentação — leia antes de explorar o código a frio

| Arquivo | O que é | Quando muda |
|---|---|---|
| `docs/ARQUITETURA.md` | **Fonte da verdade técnica.** Retrato sempre atual do estado do projeto (schema, endpoints, decisões, pendências). É grande (~200KB) — busque a seção relevante em vez de ler tudo; o cabeçalho tem a linha "Última fase que atualizou este documento", que é a forma mais barata de saber em que fase o projeto está. | Toda fase, editado em cima do que existe, nunca recriado do zero. |
| `docs/ESTADO-HISTORICO.md` | Marcos das Fases 25–87 com o porquê de cada decisão, arquivado deste arquivo em 30/09/2026. | Não editar; só consultar. |
| `docs/DOCKER.md` | Guia prático de Docker/deploy: subir local, variáveis (`.env`), runbook, runner. | Quando o deploy mudar. |
| `docs/CONVENCOES.md` | A própria convenção de documentação/fechamento de fase descrita abaixo. | Só se a convenção em si mudar. |
| `docs/fase-N/resumo-implementacao-fase-N.md` | Histórico imutável de cada fase (o que foi feito, decisões, dúvidas em aberto). | Escrito uma vez ao fechar a fase N, nunca editado depois. |
| `secret/MESTRE.md` | Princípios de decisão, filosofia de produto e regras de negócio ("o porquê"), em repo próprio e ignorado. Não duplica o nível de detalhe técnico do `ARQUITETURA.md`. | Quando o escopo de produto muda (passo 4 do fechamento de fase). |
| `secret/curadoria/`, `secret/rascunhos/` | Conteúdo didático curado e ideias não decididas ainda. Geridos pelas skills `curar-conteudo` e `registrar-rascunho` já em `.claude/skills/`. | Via as skills acima. |

## Regra de fechamento de fase (obrigatória — não pedir autorização, é o próprio fechamento)

Definida em `docs/CONVENCOES.md`; resumo aqui porque este arquivo é sempre carregado e aquele não.
Ao final de **toda fase de implementação**:

1. Criar `docs/fase-N/resumo-implementacao-fase-N.md` (modelo fixo em `docs/CONVENCOES.md`).
2. Atualizar `docs/ARQUITETURA.md` in-place (nunca recriar do zero) para refletir o estado novo,
   incluindo a linha do cabeçalho "Última fase que atualizou este documento".
3. Se a fase mudou o resumo de alto nível do produto (não só detalhe técnico), atualizar a seção
   "Estado atual" deste arquivo (abaixo) com a fase/data mais recente.
4. Se a fase mudou **escopo de produto**, atualizar `secret/MESTRE.md` (commit + push próprios no
   `focadu-secret`) e marcar como implementado o rascunho que a originou, se houver.
5. Commitar tudo isso (código + os dois/três docs acima) num único commit descritivo — sem pedir
   confirmação separada, isso faz parte do fechamento da fase, não é uma ação avulsa.

## Economia de tokens — quem faz o quê (modelo, agentes, contexto)

Regra geral: **o modelo mais barato que dá conta**, e o contexto principal fica limpo.

| Tarefa | Quem faz | Por quê |
|---|---|---|
| Implementar fase, decisões de arquitetura, bug difícil, revisão de segurança | Sessão principal (Sonnet; Opus só se travar) | Precisa do contexto inteiro |
| Buscar/mapear código ("onde fica X", "quem chama Y") em vários arquivos | Subagente `Explore` (Haiku) | Devolve só a conclusão, não despeja arquivos no contexto |
| Reescrever texto de aula (leitura fácil) | Agente `editor-pedagogico` (Sonnet) | Só lê e devolve Markdown; não precisa de Opus |
| Curar dia (`curar-conteudo`), retrofit visual, rascunho | Skills do projeto, **um dia por vez** | Nunca em lote (estoura contexto) |
| Rodar testes/build e resumir falhas, varrer logs do Impostor | Subagente ou `Bash` com saída filtrada (`| tail`, `grep`) | Log cru não entra no contexto |

Hábitos obrigatórios:
- Ler `docs/ARQUITETURA.md` por seção (grep no cabeçalho), nunca inteiro (~200KB).
- Não reler arquivo que acabou de ser editado; não narrar opções que não serão seguidas.
- Tarefa longa e independente (ex.: curar semana) → sessão nova por unidade (dia/semana), com `/clear` ou `/compact` entre elas.
- Só spawnar agente quando a tarefa gera muita leitura e pouca conclusão. Tarefa pequena: fazer direto.
- Esforço: `/effort` baixo/médio pra ajustes simples e docs; alto só pra fase de implementação.

## Skills do projeto já configuradas

- `curar-conteudo` — cura conteúdo didático de um dia de qualquer curso (Web Security, Linux, Python pra
  Web Security) e grava em `secret/curadoria/<curso>/semana-N/dia-N.json`.
- `registrar-rascunho` — detecta ideia solta/não decidida sobre o produto e registra em
  `secret/rascunhos/<slug>.md`.
- `aplicar-elementos-visuais` — retrofita um dia já curado com os elementos visuais das Fases
  30/31 (diagrama de fluxo/comparação/camadas/partes, bloco de código), um dia por vez, nunca em
  lote.
- `rodar-projeto` — sobe Postgres (Docker) + API .NET + frontend Vite em background e confirma com
  smoke test. Usar em vez de montar os comandos à mão.

## Comandos de verificação

- Backend: `dotnet build backend/Focadu.slnx` e `dotnet test backend/tests/Focadu.Tests/Focadu.Tests.csproj`
  (avisos de conflito de versão do EF Core em `Focadu.Tests.csproj` são pré-existentes). O CI hospedado
  exclui `CuratedContentAllFilesTests`, `CertificationCoverageFileTests` e `CuratedCourseImporterTests`
  (precisam do repo `focadu-secret`) — **rodá-los localmente depois de editar qualquer curadoria**.
- Frontend (em `frontend/`): `npx tsc -b`, `npm run lint` (oxlint) e `npm run build`. Não existe
  framework de teste de frontend.
- Seed: `dotnet run --project backend/src/Focadu.Api -- seed` (idempotente por Curso). Migrations
  aplicam sozinhas no boot da Api; gerar nova com `dotnet ef migrations add` (não precisa de Postgres,
  via `FocaduDbContextFactory`).
- Chaves externas (`Groq:ApiKey`, `GitHub:Token`, `Smtp:*`, `Frontend:BaseUrl`) via user-secrets/env;
  ausentes **não impedem o boot** — só falham, com erro claro, quando o recurso é usado.

## Convenções e armadilhas já descobertas (leia antes de mexer em código)

Cada uma custou um bug real ou uma conversa; o porquê está em `docs/fase-N/` e `docs/ESTADO-HISTORICO.md`.

- **Score é sempre calculado no servidor**, nunca recebido do cliente (Fases 3/4). Gabarito
  (`IsCorrect`, `ExpectedAnswer`, `TerminalQuality`) vai `null` no DTO até a 1ª resposta.
- **Template vs. Instância** (Fase 13a): `Weekly`/`Daily` de instância expõem `Number`/`Title`/
  `Activities` como *pass-through* do template — nunca duplicar. Dado derivável (`DailyStatus`,
  ranking, badges, Score) é **calculado sob demanda**, não persistido.
- **"Qual Daily vem a seguir" é por progresso, não por calendário** (`DailySequencing`, Fase 38b).
  `Daily.Date` serve só pra exibição e pra distinguir Replay/ReadOnly, nunca pra liberar conteúdo.
- **Tempo**: `IClock.Today()` usa `DateTime.Now` de propósito (dia vivido pelo usuário); timestamps
  de auditoria são UTC. O container precisa de `TZ=America/Sao_Paulo` no compose (Fase 43).
- **EF Core**: `Guid` gerado no domínio com `ValueGenerated.Never` centralizado em
  `FocaduDbContext.OnModelCreating` (sem isso o tracker emite `UPDATE` em vez de `INSERT`); enums
  como string. Bug de EF/Postgres só aparece rodando contra banco real, nunca em teste de domínio.
- **Testes**: só domínio puro e funções `internal static` da Application (`InternalsVisibleTo`).
  Sem fakes de repositório e sem teste dos adapters Groq — avaliação por IA é verificada ao vivo.
- **Adapters Groq**: JSON mode quando a saída é estruturada; **"em português" explícito em todo
  prompt** (Fase 38b); resposta malformada vira `ExternalServiceException`, nunca nota inventada.
  Resumo Falado = 2 chamadas (correção da transcrição, depois nota — Fase 42); a nota mede completude
  contra a **instrução** da atividade, não contra o conteúdo curado inteiro. Personalização por
  interesses só entra no feedback, nunca no Score.
- **Erros da Api**: sempre o envelope `{ error, message }`; `DomainException.Code` decide o status
  (`ApiExceptionHandler`).
- **Frontend**: estado que sobrevive à navegação vive em store módulo-level com `useSyncExternalStore`
  (`lib/`); hook e componente nunca no mesmo arquivo (quebra fast refresh). **As sessões automatizadas
  não têm navegador: o Claude não confere layout, áudio ou microfone ao vivo — avisar o Falves do que
  ficou sem verificação visual** em vez de afirmar que funciona.
- **Seed/curadoria**: seed é idempotente por Curso e não recarrega edição de dia já seedado. Pra ver
  edição em banco local: `UPDATE` direto em `CuratedContents.BodyText` (preserva progresso) ou recriar
  o curso.
- **Processo**: onde o prompt é ambíguo em schema/domínio, perguntar ao Falves antes (padrão desde a
  Fase 1). **Nunca** adicionar linha `Co-Authored-By`/atribuição ao Claude em commits ou PRs deste
  repositório (preferência do Falves, ver memória do projeto).

## Estado atual

Última fase concluída: **Fase 91 — Sessão em telas de notebook** (01/10/2026; missão no terminal v3: Fase 90; mais de um curso: Fase 89).

Histórico completo dos marcos (Fases 25–87, com o porquê de cada decisão): `docs/ESTADO-HISTORICO.md` —
só abrir quando precisar. Estado técnico vivo: `docs/ARQUITETURA.md`; detalhe por fase: `docs/fase-N/`.

Resumo do que existe hoje:
- **Cursos**: Web Security (4 módulos / 12 semanas / 72 dias — 6 por semana, o 6º é a ponte "code comigo" —
  e 12 projetos semanais), Linux e Python pra Web Security (pré-requisitos, semana sem Projeto Semanal,
  seed genérico por `secret/curadoria/<slug>/curso.json`). Cursos livres, sem trava, com recomendação
  (Fase 84). Linux publicado em 30/09/2026.
- **Front**: tudo em pixel art (mapa, start, daily, perfil, squad, loja, ranking, visão da semana), telas sem
  rolagem externa, guia das telas com tour (`lib/guiaTelas.ts`).
- **IA (Groq/GitHub)**: avaliação de Resumo Falado, analogia "Pra você", chat rápido, revisão do Caderninho,
  avaliação de ponte/Projeto Semanal, dica da Focada no laboratório de código; prompts citam o curso (Fase 85).
- **Laboratório de código (Fases 86 e 87)**: nos dias com bloco `lab` (pontes Python/JavaScript da Semana 1 do Web
  Security, Linux Dias 6 e 12) o aluno escreve e **roda o código na própria tela** (Pyodide + Scapy, JavaScript e
  Bash num Linux emulado no v86, sempre no navegador); a saída que vai pra avaliação é a do laboratório e a dica
  da Focada (3 por passo) não gasta tentativa. O código do aluno roda em Workers de `/lab/` com CSP que só libera
  `connect-src` em `/lab/` (não alcança a API). Formato do bloco em `secret/curadoria/CURADORIA.md` 5.2, verificador
  em `secret/curadoria/scripts/lab/`. Ver `docs/fase-86/`, `docs/fase-87/`.
- **Missão no terminal (Fase 88)**: nos dias normais do Linux (piloto: Dia 2) a atividade `TerminalMission` dá ao aluno um
  Linux embutido, já logado como usuário comum, com missões de comando conferidas no navegador (sem IA, sem nota, sem
  tentativa). Formato em `secret/curadoria/CURADORIA.md` 5.3, verificador `scripts/lab/verificar-missoes.mjs`. Ver `docs/fase-88/`.
- **Telas de notebook (Fase 91)**: abaixo de 1440×820 a sessão diária (inclusive laboratório e missão) e o Projeto Semanal
  trocam as colunas laterais por trilhos de 64px que abrem gavetas (`SideSlot`, `useIsWideSession`). Ver `docs/fase-91/`.
- **Missão no terminal v3 (Fase 90)**: cada missão diz situação, objetivo e passos; ao lado do terminal, a cola "Comandos de
  hoje" (clique copia pro campo); prompt com o diretório atual e `clear` que deixa o último comando visível. Ver `docs/fase-90/`.
- **Mais de um curso (Fase 89)**: com 2+ matrículas o "Hoje" pergunta o curso (o último aberto já vem marcado) e Trilha,
  Ranking, Perfil e o ranking do Squad têm seletor de curso (`CourseSwitcher`, `lib/courseChoice.ts`). Ver `docs/fase-89/`.
- **Infra**: deploy automático por push (CI/CD) na Oracle Cloud, em runner self-hosted Linux ARM64
  (`[self-hosted, Linux, focadu-oracle]`), sem homologação, Forgejo interno pros repositórios de Projeto
  Semanal. Detalhes na seção "Host de produção e deploy" abaixo; `docs/DOCKER.md` ainda tem trechos de
  quando o host era um Mac.

Regras que valem a partir daqui:
- **Toda tela é desenhada no Figma e aprovada antes do código** (decisão do dono, Fase 74).
- **Mudou uma tela, atualize o guia dela** em `frontend/src/lib/guiaTelas.ts`.
- Conteúdo curado novo com diagrama/bloco de código: via skill `aplicar-elementos-visuais`, um dia por vez
  (seis dias do Web Security ficaram de propósito sem diagrama — ver `secret/curadoria/CURADORIA.md` seção 4).

Pendências conhecidas: auditoria estática de segurança (SAST) dos repositórios de projeto semanal (escopo
definido na Fase 24c, não implementada).

## Host de produção e deploy

**Produção roda na VM da Oracle Cloud** (runner `oracle-focadu`, máquina `focadu-vm-vnic`, Linux ARM64),
confirmado no log do Deploy de 02/10/2026 (`deploy.yml`: `[self-hosted, Linux, focadu-oracle]`). **Não é
mais o Mac** — o `/Users/falves/Dev/Servidor/CONTEXTO.md` (21/09, deploy no Mac via `falveshub-server`)
e partes de `docs/DOCKER.md` estão desatualizados nisso; o `deploy.yml` é a verdade.

- Público: `focadu.falveshub.com` (Cloudflare Tunnel, domínio `falveshub.com`). Compose de produção:
  front `:5280`, api `:5282`, db `:5432`; containers `focadu-frontend/-backend/-postgres/-forgejo`.
  `rafalves106/focadu-secret` (privado, conteúdo editorial) fica clonado em `secret/` na VM.
- Push em `main` → CI (`ci.yml`, em `ubuntu-latest`) → `deploy.yml` (via `workflow_run`, na VM) →
  `git reset --hard origin/main` no código e no `secret/` → `docker compose up -d --build` → seed
  idempotente → healthcheck. **O `reset --hard` roda no próprio diretório de trabalho da VM: edição
  não commitada em arquivo versionado lá se perde no deploy.** Um commit só de docs também dispara
  o deploy inteiro.
- O `.env` de produção (JWT, Groq, SMTP, Forgejo; nunca versionado) mora na VM. `GITHUB_TOKEN` fica
  **deliberadamente em branco** (a prova pública de projeto usa o Forgejo interno) — não preencher sem
  perguntar.
- Homologação (`focadu-hml`, branch `develop`) foi **descontinuada** (17/09, Fases 49/50/53) — não
  recriar. A rota `hml-focadu.falveshub.com` ainda dava 502 em 21/09 (remover no Cloudflare Zero Trust).
- O checkout em `/Users/falves/Dev/Servidor/focadu` (Mac) não é mais usado pelo deploy.

## Histórico por fase (1–91, uma linha cada)

Detalhe de cada uma em `docs/fase-N/resumo-implementacao-fase-N.md`; o porquê das decisões 25–87 em
`docs/ESTADO-HISTORICO.md`. 13a/13b/27b/38b existem como fases próprias; 24b/24c só têm commit.

**Fundação (1–11)**
- **1** Domínio e schema .NET hexagonal/DDD: penalidade (3 pts → Daily de reforço), 2 dias fracos → reforço semanal, nota de corte 80.
- **2** Monorepo Git + API real (8 endpoints, envelope `{error,message}` com `DomainException.Code`).
- **3** Score no servidor (Quiz/WordMatch), seed do curso, 1º frontend; achou o bug do EF (`ValueGenerated.Never`) e o CORS.
- **4** Autoria de conteúdo curado, conclusão da Daily, telas WordMatch/Cloze/Roleplay; Score no servidor pros 4 tipos.
- **5** Voz: Whisper + Groq, `ActivityType.VoiceSummary`; `GET /api/today` determinístico.
- **6** Tela `/admin/conteudo` de autoria; diagramas da Semana 1. **7** Leitura e Vídeo, Projeto Semanal, menu de configurações.
- **8** Telas de navegação (Start, visão da semana, detalhe do curso). **9** Polimento das atividades (IntroCard, OptionCard, resumo de conclusão).
- **10** Estados de erro (`ApiErrorScreen`, `ErrorBoundary`, timeout). **11** Publicação pública (commit no GitHub + LinkedIn), bloqueio entre semanas.

**Multiusuário e gamificação (12–24)**
- **12** Auth JWT em cookie `HttpOnly`, splash/login. **13a** Template vs. Instância + matrícula (`Enrollment`). **13b** Onboarding com interesses + correção do `/admin/conteudo`.
- **14** Gems (cap mensal 20/20/30) + Streak. **15** Bônus de superação em reforço (+2). **16** Score de estudo ponderado + ranking. **17** Marketplace de cosméticos, badges e indicação.
- **18** Perfil em 3 abas. **19/20** Fidelidade visual (sessão diária; navegação/perfil; `/hoje` fora do shell).
- **21** Avaliação de projeto por IA (lê o repo), analogias "Pra você", narração de voz, `CuratedDayImporter`. **22** Modal global de sessão expirada.
- **23** Ligar Palavras em 2 colunas (`WordMatchPair`). **24** Squad (24b sucessão de liderança, 24c paginação do ranking e checks do SAST).

**Currículo e IA (25–35)**
- **25** Mapa 2D navegável (hoje desativado). **26** Currículo Web Security completo (60 dias/12 projetos), seed genérico, teste que varre toda a curadoria.
- **27** Analogia estendida a voz e LinkedIn; **27b** avaliação automática do projeto ao submeter. **28** Badge de status da IA. **29** Caderninho de anotações.
- **30/31** Diagramas no Texto Cru (4 tipos) e bloco de código. **32** Suporte Rápido de IA; **33** histórico curto + `/clear`.
- **34** `cursor:pointer` global. **35** Reler anotações antes de gravar o Resumo Falado.

**Sessão e correções ao vivo (36–45)**
- **36** "Etapa anterior", contador de erros no header, Pomodoro. **37** Sessão em 2 colunas + chat fixo.
- **38/38b** Bloqueio do Projeto Semanal, carrossel de cursos, **sequenciamento por progresso** (`DailySequencing`). **39** Correção de transcrição + título do dia.
- **40** Docker + CI/CD de deploy. **41** Redefinição de senha por SMTP. **42** Nota injusta do Resumo Falado (2 chamadas). **43** `TZ=America/Sao_Paulo` no container.
- **44** Flash "tudo errado" em Ligar Palavras. **45** Certificações de mercado por módulo (informativo).

**Forgejo, travas e conteúdo (46–60)**
- **46** Repositórios de Projeto Semanal no Forgejo interno (fork do template na matrícula). **47/48** Analogia sem contexto forçado + guarda de idioma.
- **49/50/53** Fim da homologação e da branch `develop`; docs do host corrigidas. **51/52** Itálico e código inline (crase) no Texto Cru.
- **54** Travas de acesso (reforço no mesmo dia, "1 Daily por dia" na matrícula inteira, projeto libera a próxima semana). **55** Reforço fora da cota; projeto pendente bloqueia todas as semanas seguintes.
- **56** Botão de reforço sempre visível. **57** Reforço puxa as anotações do dia base. **58** Projeto Semanal renderiza Markdown.
- **59** Linguagem do Projeto Semanal (Python/JavaScript, piloto Semana 1). **60** Token do Forgejo gerado sob demanda (não fica no banco).

**Pixel art e telas sem rolagem (61–76)**
- **61** Projeto Semanal sem rolagem externa. **62** Menu global do Figma. **63** Projeto Semanal v2 + anotação presa ao projeto.
- **64** Identidade pixel art + a Focada (mascote/mentora). **65** Mapa da trilha. **66** Start com vários cursos. **67** Casca global sem rolagem. **68** Sessão diária.
- **69** Semana de 6 dias (ponte, 72 dias) + ofensiva com folga e pausa. **70** Perfil e Squad. **71** Loja, agente e vitrine semanal. **72** Perfil "tela do agente" e QG do Squad.
- **73** Ranking (placar de fliperama). **74** Visão da semana, Certificações, Caderninho e telas de entrada. **75** Guia das telas ("?" + tour). **76** A Focada em Ranking, Perfil e QG.

**Squad, ponte e cursos (77–85)**
- **77** Squad com pedidos de entrada. **78** Revisão por IA do Caderninho. **79** Ponte "code comigo" (6 passos de código). **80** Chat com código formatado; ponte sem analogias.
- **81** Cursos de pré-requisito (seed genérico, curso escondido, semana sem projeto). **82** Linux pronto pra publicar. **83** Telas de curso sem Projeto Semanal.
- **84** Cursos livres com recomendação. **85** Prompts de IA citam o curso certo.

**Laboratório e telas pequenas (86–91)**
- **86/87** Laboratório de código (backend; front com Pyodide/JavaScript/Bash em v86, tudo no navegador). **88** Missão no terminal (Linux embutido). **89** Mais de um curso (Hoje pergunta o curso).
- **90** Missão no terminal v3. **91** Sessão, laboratório e Projeto Semanal em telas de notebook (trilhos e gavetas).
