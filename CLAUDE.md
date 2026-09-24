# Focadu — contexto do projeto

> Leia isto primeiro em qualquer sessão nova. Este arquivo é um **mapa de orientação e regras de
> processo** — não duplica o estado técnico detalhado, que vive em `docs/ARQUITETURA.md`. Se algo
> aqui divergir de `docs/ARQUITETURA.md`, o `ARQUITETURA.md` vence (é o documento vivo).

## O que é

Focadu é uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto é "Web
Security" (currículo completo desde a Fase 26: 4 módulos / 12 semanas / 12 projetos; desde a Fase 69,
72 dias - 6 por semana, o 6º é a ponte pro projeto). A
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
├── backend/           <- .NET, Hexagonal (Ports & Adapters) + DDD
├── frontend/          <- Vite + React + TypeScript
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

## Skills do projeto já configuradas

- `curar-conteudo` — cura conteúdo didático de um dia do curso e grava em
  `secret/curadoria/<curso>/semana-N/dia-N.json`.
- `registrar-rascunho` — detecta ideia solta/não decidida sobre o produto e registra em
  `secret/rascunhos/<slug>.md`.
- `aplicar-elementos-visuais` — retrofita um dia já curado com os elementos visuais das Fases
  30/31 (diagrama de fluxo/comparação/camadas/partes, bloco de código), um dia por vez, nunca em
  lote.

## Estado atual

Última fase concluída: **Fase 69 — Semana de 6 dias (ponte pro projeto) e ofensiva com folga e pausa** (23/09/2026).

Marcos recentes (mais detalhe em `docs/ARQUITETURA.md` e nos `docs/fase-N/` correspondentes):
- **Semana de 6 dias + ofensiva com folga e pausa (Fase 69, dor do dono como aluno: o projeto da Semana 1
  era difícil de começar)**: a semana passou a ter 6 Dailies + Projeto e o curso foi de 60 pra 72 dias
  (semana N = Dias 6N-5 a 6N). O 6º dia é a **ponte**, prática e numa versão por linguagem
  (`DailyTemplate.Language`, curadoria em `semana-N/ponte/`); a escolha da linguagem do projeto foi pra
  entrada dela (`DailyAccessMode.NeedsProjectLanguage`, `BridgeLanguageScreen`). Só a Semana 1 tem ponte
  curada. A ofensiva trocou "fim de semana não quebra" por **folga móvel** (1 dia a cada 7) e fica
  **pausada** com o projeto aberto até a semana fechar, no máximo 14 dias (`StreakPauseWindows`). O
  próximo `seed` (deploy) renumera o banco (`Curriculum72Migration`, testada numa cópia de produção) e dá
  a ponte a quem ainda não entregou o projeto (`SyncBridgeDaysUseCase`). Mapa da trilha com 6 pontos por
  semana. Ver `docs/fase-69/`.
- **Sessão diária em pixel art (Fase 68, Figma "Daily — redesign proposto")**: tudo em `/hoje` roda na
  casca `SessionLayout` (lê o `SessionContext` da TodayPage): topo com o conta-giros (saiu do menu, que
  agora é global e único - sem badges de sessão), 3 colunas sem rolagem externa, cadeia de etapas em
  blocos, rodapé fixo (`SessionFooter`). A Focada apresenta os blocos, reage a acerto/erro e dá o
  feedback da IA; atalhos 1-N/Enter; tudo em VT323. Telas de erro e a avaliação do projeto também em
  pixel art. Mock pra ver a sessão sem produção: `npm run dev:mock` (porta 5199). Ver `docs/fase-68/`.
- **Casca global sem rolagem externa (Fase 67, 1º passo das telas em pixel art antes da v0.1.0)**:
  a partir de `lg` o `App` tem a altura da janela e o conteúdo fica num `<main>` que ocupa o resto —
  tela "sem rolagem externa" só precisa de `lg:min-h-0 lg:flex-1 lg:overflow-hidden`, sem descontar a
  altura do menu. O `PageShell` (Ranking, Perfil, Loja, Certificações, Caderninho) saiu da coluna
  estreita e usa as margens das telas pixel art com `ScrollArea`. Plano das telas restantes em
  `secret/rascunhos/telas-pixel-art-antes-da-0-1-0.md`. Ver `docs/fase-67/`.
- **Tela de start redesenhada (Fase 66, pedido do dono)**: desenho no Figma ("Start — redesign
  proposto") e implementação em pixel art, 2 colunas, sem rolagem vertical. À esquerda, os cursos
  como "save slots" (o escolhido troca o centro) e o cartão do agente (gemas, streak da semana); no
  centro, a missão do dia do curso escolhido (etapas em cadeia, recompensa, um botão), o caminho da
  semana até o castelo do projeto e a fala da Focada. `GET /api/today` ganhou `?courseId=` (a cota
  diária é por curso). O que já está na trilha saiu da tela. Ver `docs/fase-66/`.
- **Mapa da trilha em pixel art (Fase 65, pedido do dono)**: a tela do curso (`/start?course=`) virou
  um mapa-mundi — uma região desenhada por mês (arte e posições geradas por script em
  `secret/curadoria/scripts/mapa/`, mesma fonte do Figma), dias como pontos, Projeto Semanal como
  castelo, selo de reforço, névoa nas semanas trancadas, balão com "Entrar", e a Focada andando até a
  próxima Daily e dizendo uma das 11 falas aprovadas. Layout em 3 colunas como o Projeto Semanal;
  Caderninho e Certificações viraram botões que abrem telas próprias (`NotebookPage` nova). Backend
  só ganhou campos em `GET /api/courses/{id}`. Celular segue com a lista. Ver `docs/fase-65/`.
- **Identidade pixel art + Focada (Fase 64, combo pedido pelo dono)**: linha editorial no Figma
  "Focadu — Pixel Art" (paleta fechada, guia de regras, sprites 16×16) aplicada no app — ícones e
  emojis viraram sprites (`assets/pixel/`, sempre `pixelated` e em múltiplos de 16px), logo FOCADU
  com a mira de foco no "O" no centro do menu, favicon, menu em sprites (solo à esquerda,
  multiplayer à direita) e cursor de mira. No Projeto Semanal, a **Focada** (foca mascote/mentora)
  fala o tempo todo num diálogo pixel art: briefing escrito pela curadoria (`"briefing"` no
  `projeto.json`, voz em `secret/curadoria/GUIA-DE-VOZ-FOCADA.md`) + fala do estado do projeto; o
  enunciado completo foi pro `README.md` do repositório, gerado do `specText` (que segue fonte única
  da IA). Em produção falta aplicar o patch do briefing da Semana 1 e republicar os modelos com o
  README novo. Ver `docs/fase-64/`.
- **Projeto Semanal, 2ª versão do layout + anotação do projeto (Fase 63)**: repositório (copiar
  `git clone`/usuário/token) e referências à esquerda, anotação rápida e chat à direita. A anotação
  feita ali fica presa ao **projeto** (`Note.WeeklyProjectId`, pedido do dono), não a uma Daily, e
  aparece no Caderninho como "Semana N, Projeto". Ver `docs/fase-63/`.
- **Menu global do Figma (Fase 62, node 178:143)**: Hoje/Trilhas/Ranking | START | Squad/Loja/@usuário
  + avatar, 73px no desktop largo. Configurações e o status da IA saíram da barra e foram para o menu
  que abre no clique do usuário (decisão do dono). Ver `docs/fase-62/`.
- **Projeto Semanal sem rolagem externa (Fase 61, Figma node 178:132)**: a página cabe na altura da
  tela e só os cartões rolam por dentro, com barra minimalista que aparece ao rolar e some com
  desfoque (`ScrollArea`); barra de progresso centralizada no topo; chat de IA fixo e alto na coluna
  direita. O dono quer isso no sistema inteiro — abordagem documentada em `docs/fase-61/`.
- **Token do git do Projeto Semanal fora do banco (Fase 60, pedido do dono)**: o token do Forgejo
  ficava em texto puro no Postgres e aparecia sempre na tela. Agora o aluno gera sob demanda
  (`POST /api/users/me/forgejo-token`), vê uma única vez e a Focadu guarda só os 8 últimos
  caracteres; gerar outro revoga o anterior. Ponto aberto registrado: os forks de aluno no Forgejo
  são públicos (clone anônimo funciona) — decidir antes de abrir para outros alunos. Ver `docs/fase-60/`.
- **Linguagem do Projeto Semanal, piloto Semana 1: Python/JavaScript (Fase 59, pedido do dono, logo
  após a Fase 58)**: o aluno marca no perfil quais linguagens topa usar nos Projetos Semanais e, quando
  o projeto de uma semana já curada por linguagem é desbloqueado, escolhe **de forma definitiva** (sem
  troca depois, confirmação em 2 passos) em qual vai realizá-lo — só então ganha o repositório-modelo
  (fork só do esqueleto, a implementação é do aluno) e as referências (bibliotecas/documentação) curadas
  manualmente pra ela. `WeeklyTemplate` ganhou variantes de linguagem e referências; semana sem elas
  segue 100% como antes desta fase. Conferido ponta a ponta contra Postgres+Forgejo descartáveis (fork
  real, avaliação por IA lendo o repositório certo) e visualmente no Chrome. Só a Semana 1 está curada
  (2 repositórios-modelo + 10 referências, cada link conferido); as outras 11 semanas ficam pendentes.
  Ver `docs/fase-59/`, inclusive 2 incidentes de teste já resolvidos com o dono (migration aplicada por
  engano em produção — sem dano real, decidido deixar como está; e uma chamada real à API do Groq,
  gratuita, sem problema) e o que falta pra Semana 1 valer em produção (publicar os repositórios-modelo
  no Forgejo real + aplicar `secret/curadoria/patches/2026-09-21-semana-1-linguagens.sql`).
- **Projeto Semanal renderiza Markdown (Fase 58, pedido do dono: 1º item de uma rodada de correções
  visuais)**: a especificação do projeto era um `<p whitespace-pre-line>`, então `###`, `- item`,
  `**negrito**` e crases apareciam crus, como texto corrido. Agora passa pelo `MarkdownBlock`, que ganhou
  **lista numerada** (`1.`) e **sub-bullets indentados** — os 12 projetos usam os dois, e 28 dias de leitura
  também (melhoram junto). Regressão conferida contra o componente antigo sobre todo o conteúdo curado (0
  mudanças fora das sintaxes novas) e tela real das 12 semanas em Chrome. Ver `docs/fase-58/`, que também
  lista o que ficou aberto (espaçamento dos títulos, título do projeto descartado no seed, padding em celular).
- **Reforço puxa as anotações do dia base (Fase 57, bug real visto ao vivo)**: no Resumo Falado de uma
  sessão de reforço o painel "Suas anotações de hoje" aparecia vazio — ele buscava por data da Daily, e o
  reforço é outra Daily (com a data do dia em que foi gerado); as notas ficam presas à Daily de origem.
  Agora `GET /courses/{id}/notes?dailyId=` devolve a Daily pedida **mais a Daily base que gerou o reforço**
  (`NoteDailyScope`), o modal vira "Anotações do dia base" e cada nota diz de qual dia veio. Ver `docs/fase-57/`.
- **Botão de sessão de reforço sempre visível (Fase 56, pedido do dono)**: o único caminho até um reforço
  era o link da tela de conclusão da Daily de origem, que aparece uma vez só — se o aluno saísse dali ou o
  clique falhasse, perdia o acesso. Agora `GET /api/today` devolve `DailyStateDto.PendingReinforcementDailyId`
  (reforço ainda não concluído) e o front mostra o botão no dashboard e nos avisos de "Hoje" bloqueado, até o
  reforço ser concluído. Conferido em navegador real (Playwright) contra ambiente descartável. Ver `docs/fase-56/`.
- **Reforço fora da cota e bloqueio de todas as semanas seguintes (Fase 55, duas decisões do dono)**:
  a conclusão de um reforço não gasta mais a cota de "1 Daily por dia" (só Dailies originais contam) —
  senão fazer o reforço antes da Daily do dia adiaria a Daily para amanhã. E "se existe um projeto
  pendente, todas as semanas seguintes ficam bloqueadas, do mesmo curso": a trava passou de "só a
  semana `N-1`" para "qualquer semana anterior ainda não fechada" (`DailySequencing.FindPendingClosureBefore`),
  e a trilha do curso usa a mesma regra via `WeeklyOverviewDto.IsLocked` (calculado no servidor).
  Ver `docs/fase-55/`.
- **Travas de acesso (Fase 54, 3 bugs reais vistos ao vivo ao fechar a Daily 5)**: (1) o botão "Ir para
  a sessão de reforço" dava 409 — o reforço nasce na Weekly da Daily que acabou de gastar a cota
  diária; agora o reforço não é barrado pela cota. (2) "Hoje" abria a Daily 6 (Semana 2) no mesmo dia —
  "1 Daily por dia" e "1 em andamento" só olhavam a própria Weekly; agora valem pra matrícula inteira
  (`EvaluateDailyAccess(..., otherWeekliesDailies)`). (3) A Semana 2 abria sem o projeto da Semana 1 —
  a única trava entre semanas só ligava com o projeto já avaliado; novo `Weekly.RequiresProjectToUnlock()`
  + `DailyAccessMode.WeekPendingClosure` (`/hoje` mostra a semana que falta fechar, com o card do
  projeto). O front mostra o motivo do 409 em vez de "Algo Deu Errado". Ver `docs/fase-54/`.
- **Sem `develop` e docs do host corrigidas (Fase 53)**: a branch `develop` foi apagada nos repos
  `focadu` e `focadu-secret` (nada exclusivo nelas) e saiu do `ci.yml`, que agora roda só em `main`.
  As docs (`DOCKER.md`, `ARQUITETURA.md`, `.env.example`) passaram a descrever o host real — este Mac,
  runners macOS em `/Users/falves/actions-runners/<repo>/`, pasta `/Users/falves/Dev/Servidor/focadu` —
  em vez de Windows. `DOCKER.md` ganhou o aviso de que o deploy faz `git reset --hard` no próprio
  diretório de trabalho (edição não commitada é perdida) — ver `docs/fase-53/`.
- **Código inline (crase) no Texto Cru (Fase 52)**: mesma família da Fase 51 — o `MarkdownBlock`
  mostrava as crases literais (`client_secret` aparecia com elas). `renderInline` agora renderiza
  código inline como `<code>` monoespaçado (o miolo é sempre texto puro, então `*`/`**` de dentro de
  crase nunca viram itálico/negrito), a crase dupla (a forma Markdown de escrever uma crase literal,
  Dia 18) e os títulos `###`/`####` passam por `renderInline` (4 títulos dos dias 21 e 22 têm código).
  Vale também pro Caderninho — ver `docs/fase-52/`.
- **Itálico no Texto Cru (Fase 51, bug real visto ao vivo)**: a reescrita pedagógica das 60 leituras
  (agente `editor-pedagogico-websec`) passou a usar `*sigla*` em 317 trechos (antes: 7), mas o
  `MarkdownBlock` só renderizava `**negrito**` e `[link](url)` — os asteriscos apareciam literais na
  tela. `renderInline` agora renderiza `*itálico*`, itálico dentro de negrito e `***negrito+itálico***`,
  com regra mais restrita que o CommonMark (o texto tem muito `*` que não é ênfase: `{{7*7}}`,
  `"Resource": "*"`, `*.exemplo.com`). Vale também pro Caderninho de Anotações — ver `docs/fase-51/`.
- **Sem homologação (Fases 49, 50 e 53)**: o ambiente `focadu-hml` (branch `develop`) foi
  descontinuado em 17/09/2026. A Fase 49 tirou o mapeamento de `develop` do `deploy.yml`; a
  Fase 50 removeu o que sobrava: `docker-compose.homolog.yml` e as instruções, portas e
  variáveis de homologação em `docs/DOCKER.md`, `.env.example` e `docs/ARQUITETURA.md`.
  Produção é o único ambiente. A Fase 53 apagou a branch remota `develop` (nos repos `focadu` e
  `focadu-secret`) e a tirou do `ci.yml`. Os `docs/fase-N/` antigos que citam
  homologação são histórico imutável e não foram editados — ver `docs/fase-49/`,
  `docs/fase-50/` e `docs/fase-53/`.
- **Guarda de idioma nas analogias (Fase 48, bug real visto ao vivo)**: logo após o deploy da Fase
  47 o modelo devolveu as analogias do dia 5 em inglês, e o cache nunca é reavaliado. Agora
  `GroqAnalogyGenerationService` rejeita resposta com cara de inglês (nada é gravado, a leitura abre
  sem analogias e a próxima abertura tenta de novo). Só entra em produção com o deploy do backend —
  ver `docs/fase-48/`.
- **Analogia "Pra você" sem contexto forçado (Fase 47)**: o interesse/hobby do aluno deixou de ser
  o eixo obrigatório da analogia gerada pela IA — agora só entra quando reproduz o mecanismo da
  seção elemento por elemento; senão, cenário universal do cotidiano (correio, portaria, chaves…).
  O prompt antigo fazia o modelo inventar mecânica de jogo pra caber (ex.: "lista de bans do CS"
  pra explicar OCSP). Testado ao vivo contra a API do Groq; `temperature` 0.8 → 0.4. Só vale pra
  analogias geradas dali pra frente (cache `PersonalizedAnalogy` não é reavaliado) e só entra em
  produção com o deploy do backend — ver `docs/fase-47/`.
- **Repositórios de Projeto Semanal no Forgejo interno (Fase 46)**: o aluno deixa de criar/colar
  manualmente uma URL de repositório GitHub — a Focadu hospeda tudo sozinha num Forgejo
  self-hosted (container novo, SQLite). Na matrícula, a conta do aluno no Forgejo é criada e o
  repositório da semana nasce como fork de um repositório-template (mantido pela curadoria,
  `WeeklyTemplate.ForgejoTemplateSlug`), via impersonação administrativa — o aluno só recebe a
  URL + um token de acesso na tela do Projeto Semanal (usar como senha do `git clone`/`push`).
  `EvaluateWeeklyProjectUseCase` migrou de `IGitHubService` pro Forgejo interno
  (`IForgejoService`); o fluxo GitHub+LinkedIn de prova pública de *módulo* (`ModulePublication`,
  Fase 11) continua intocado e separado — publicar o projeto no GitHub pessoal do aluno é manual
  (`git remote add` + `git push`, sem orquestração da Focadu). Testado ao vivo, ponta a ponta
  (matrícula real → fork → `git clone`/`push` funcionando) — achou e corrigiu 3 bugs reais da
  integração com a API do Forgejo, ver `docs/fase-46/`. Só a Semana 1 do curso piloto tem
  repositório-template configurado por enquanto; SAST (Fase 24c) continua sem o webhook receiver.
  Origem: `secret/rascunhos/repositorios-gerenciados-projeto-semanal.md`.
- **Certificações de mercado sugeridas por módulo (Fase 45)**: informativo (nunca emissão de
  certificado) mostrando ao aluno quais certificações de segurança reconhecidas pelo mercado
  (CompTIA Security+, eJPT, CEH, PNPT — lista aberta) o currículo já cobre, por `Monthly` (os 4
  módulos grandes). Curadoria 100% manual e estática (`secret/curadoria/web-security/
  certificacoes.json`, primeiro arquivo de curadoria em nível de curso nessa pasta), sem endpoint
  novo (embutido em `GET /api/courses/{id}` e `GET /api/weeklies/{id}`). Aparece em 4 lugares:
  aba nova em `CourseDetailPage`, card resumo na `StartDashboard`, bloco/reforço na Visão Semanal
  + `SuccessStep` da publicação, e tela dedicada (`/start?course=&certifications=1`). Origem:
  `secret/rascunhos/informativo-certificacoes.md`.
- **Flash de "tudo errado" em Ligar Palavras (Fase 44, bug real relatado ao vivo)**: ao confirmar
  a resposta, `WordMatchActivity.handleSubmit` marcava a atividade como respondida
  (`setLastResponse`, o que revela o gabarito) **antes** de terminar o refetch que preenche
  `CorrectDefinitionId` dos termos. Por 1 render, o veredito de cada par era calculado contra
  `CorrectDefinitionId` ainda `null` (escondido pelo backend antes de responder) - e a tela
  piscava tudo vermelho por um instante antes do resultado real aparecer. Corrigido invertendo a
  ordem: só marca como respondido depois que o gabarito já chegou - ver `docs/fase-44/`.
- **Fuso horário do container bloqueando a Daily (Fase 43, bug real relatado ao vivo)**: o
  container do backend rodava o relógio do SO em UTC (sem `TZ` setada em lugar nenhum), então
  `SystemClock.Today()` (que usa `DateTime.Now` de propósito, pro "dia do calendário vivido pelo
  usuário") na prática retornava a data em UTC. Concluir uma Daily entre ~21h e 23h59 no horário
  de Brasília gravava `CompletedAt` já no dia seguinte em UTC, e a trava de "1 Daily por dia
  corrido" (`Weekly.EvaluateDailyAccess`, Fase 38b) bloqueava o usuário o dia inteiro seguinte,
  só liberando de novo às 21h local (virada do dia em UTC), nunca à meia-noite local esperada.
  Corrigido com `TZ: America/Sao_Paulo` fixo no `environment` do serviço `backend` do
  `docker-compose.yml` — puramente configuração de ambiente, sem mudança de código C#. Containers
  recriados manualmente no host pra alívio imediato; `git push` ainda pendente de confirmação (ver `docs/fase-43/`).
- **Correção de nota injusta no Resumo Falado (Fase 42, bug real relatado ao vivo)**: a correção de
  transcrição da Fase 39 não pegava um erro comum do Whisper - trocar um termo técnico pelo seu
  antônimo foneticamente parecido (ex. "simétrica" por "assimétrica"), o que gera uma frase
  gramaticalmente válida só que com o sentido invertido, e que o modelo então avalia como erro
  conceitual do aluno. Verificado ao vivo contra a API da Groq que isso só é corrigido de forma
  confiável numa chamada dedicada só à correção, separada da chamada que calcula a nota (antes era
  1 chamada só, decisão de custo da Fase 39, revertida aqui). Achado um 2º bug no mesmo caso: a nota
  também penalizava por não cobrir um subtópico do conteúdo curado inteiro que a instrução da
  atividade nunca pediu - completude agora é medida contra a instrução, não contra a referência
  inteira. Requer redeploy do backend pra valer em produção - ver `docs/fase-42/`.
- **Redefinição de senha por email (Fase 41)**: `LoginPage` ganhou o link "Esqueci minha senha"
  (antes deliberadamente ausente, sem infraestrutura de email nenhuma no projeto). Fluxo completo
  de token de uso único (1h de validade, hash SHA-256 nunca o token em texto puro) enviado por
  SMTP genérico (`SmtpClient` puro do .NET, funciona com Gmail/Outlook/qualquer provedor que o
  usuário já tenha, sem amarrar a um serviço novo) - decisão do usuário entre SMTP/API
  transacional/stub sem envio real. Requer configurar `Smtp:*` (user-secrets/env) e
  `Frontend:BaseUrl` (o link do email aponta pro `localhost:5173` de dev até isso ser preenchido
  de verdade em produção, ver `docs/DOCKER.md`) - **ainda não configurado no host de
  produção**, ver `docs/fase-41/`.
- **Dockerização completa + CI/CD de deploy automático (Fase 40)**: `backend/Dockerfile` e
  `frontend/Dockerfile` (multi-stage), `docker-compose.yml` (produção), consolidando o Focadu na
  mesma infra Cloudflare Tunnel dos demais projetos pessoais (`falveshub.com`). Frontend faz proxy
  same-origin de `/api/` pro backend via nginx (sem subdomínio de API separado). `secret/` vira
  bind mount read-only no container do backend (`CURATED_CONTENT_ROOT`), já que o conteúdo
  curado só é lido pelo comando `seed` (idempotente por Curso — não recarrega edição de dia já
  seedado, ver `docs/ARQUITETURA.md` "Docker e Deploy"). Migrations do EF Core passaram a aplicar
  automaticamente no boot da Api (antes só manual via `dotnet ef database update`). Dois
  workflows do GitHub Actions (`focadu/.github/workflows/deploy.yml` e
  `focadu-secret/.github/workflows/deploy.yml`) automatizam o deploy em runner self-hosted
  próprio (`falveshub-server`) — guia prático completo em `docs/DOCKER.md`. Runners macOS já
  registrados: o deploy automático roda neste Mac.
- **Avaliação de Resumo Falado corrige a transcrição do Whisper antes de avaliar (Fase 39, bug
  real relatado ao vivo)**: erro de reconhecimento de fala (termo técnico deturpado foneticamente)
  não derruba mais a nota injustamente — a IA corrige o que é claramente ruído de transcrição
  (usando o conteúdo de referência como vocabulário) antes de avaliar, mas nunca corrige um erro
  conceitual real do aluno. `ActivityResponse.Transcript` continua guardando o texto bruto para
  auditoria; a versão corrigida vai para o campo novo `CorrectedTranscript`. Visão de semana
  (`WeeklyDetailPage`) passou a mostrar o título do material de cada dia em vez de só "Dia N", e a
  trilha do curso (`CourseDetailPage`) destaca visualmente a semana atual em vez de um emoji fixo
  por semana.
- **Sequenciamento de Daily deixou de ser por calendário (Fase 38b, bug real relatado ao vivo)**:
  até aqui, `Daily.Date` era fixado de uma vez só na matrícula (1 dia útil por Daily) e todo
  acesso/agendamento comparava esse calendário hipotético com "hoje" - qualquer folga entre esse
  ritmo assumido e o ritmo real do aluno pulava Dailies inteiras (concluir a Daily 1 num dia
  liberou calendarmente a Daily 4, prendendo 2 e 3 em `Locked` pra sempre). Agora "a próxima
  Daily" é sempre a de menor `DayNumber` ainda não concluída em toda a matrícula
  (`DailySequencing`), nunca mais uma comparação de data - ver `docs/fase-38/`.
- Bloqueio do Projeto Semanal antes das Dailies da semana estarem completas, badge de status
  "bloqueado"/carrossel de cursos na tela de início, e aviso amigável quando a sessão de hoje já
  foi concluída (em vez de erro genérico) - Fase 38, rodadas 1-3.
- Analogia personalizada por IA ("Pra você") corrigida pra sempre responder em português (Fase
  38b) - era o único adapter Groq do projeto sem essa instrução explícita no prompt.
- Sessão diária ganhou um 2º sidebar (Fase 37): coluna esquerda com "Material de hoje" + Timer
  Pomodoro, coluna direita com Caderninho de Anotações + Suporte Rápido de IA (agora card fixo,
  antes botão flutuante — o botão flutuante continua só no Projeto Semanal, que não tem esse
  layout de 2 colunas).
- Timer Pomodoro (Fase 36, `secret/rascunhos/timer-pomodoro-sessao.md`): manual (aluno liga/
  desliga), predefinições fixas (25/5, 50/10, 15/3) escolhidas no próprio widget, fim de ciclo com
  bipe + destaque visual. 100% client-side/cosmético por decisão explícita — sem Gems, sem
  relatório de tempo estudado. Versão compacta no `GlobalNav`, sincronizada mesmo saindo da sessão.
- "Etapa anterior" na sessão diária (Fase 36): dá pra voltar e revisar uma atividade já respondida
  da mesma Daily sem refazê-la. Contador de erros saiu do HUD fixo sobre a tela de sessão e virou
  badge no `GlobalNav` (Fase 36) — reportado como confuso perto da barra de progresso.
- Resumo Falado ganhou um botão pra reler as próprias anotações do dia antes de gravar (Fase 35) -
  só antes, trava durante a gravação em si (avaliação continua sendo de recall real).
- Suporte Rápido de IA (Fase 32, histórico curto na Fase 33, painel fixo na sessão desde a Fase
  37): chat curto/direto via Groq pra tirar dúvida sobre o que está na tela (leitura/vídeo/projeto)
  ou o curso em geral. Guarda as últimas ~4 trocas da conversa (pra um "explica melhor" continuar
  fazendo sentido); no botão flutuante (Projeto Semanal), fechar (✕/clique fora) só oculta o painel
  — só "Limpar" (ou digitar `/clear`) apaga o histórico de verdade.
- Currículo do curso piloto (Web Security) **completo** desde a Fase 26: 4 módulos / 12 semanas /
  60 dias / 12 projetos.
- Personalização por analogia (interesses do usuário) estendida a leitura, avaliação de voz e
  rascunho de LinkedIn (Fases 21/22 e 27).
- Avaliação automática do Projeto Semanal ao submeter (Fase 27b).
- Badge de status de IA (saúde dos provedores Groq/GitHub) no `GlobalNav` (Fase 28).
- Caderninho de anotações pessoal do aluno (Fase 29).
- Texto Cru da curadoria ganhou suporte a diagrama (` ```diagrama `, 4 tipos: sequência,
  comparação, camadas, partes) e bloco de código (` ``` `) — Fases 30/31. **Retrofit dos 60 dias
  do curso concluído em 14/09/2026** (97 diagramas aplicados via skill `aplicar-elementos-visuais`,
  um dia por vez) — 6 dias (6, 12, 14, 18, 25, 40) ficaram conscientemente sem nenhum, por não
  terem estrutura real que justificasse (ver nota de backlog em `secret/curadoria/CURADORIA.md`
  seção 4). Conteúdo curado novo continua avaliado sob os mesmos critérios, via a mesma skill.
- Mapa/personagem 2D (Fase 25) implementado mas **temporariamente desativado**; hub de entrada
  (`/start` sem params) voltou a ser o `StartDashboard` em cards — ver `docs/ARQUITETURA.md`.
- Pendência conhecida em aberto: auditoria estática de segurança (SAST) de repositórios de
  projeto semanal — escopo e checks já definidos (Fase 24c), implementação ainda não feita.
