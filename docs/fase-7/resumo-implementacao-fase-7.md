# Resumo — Fase 7: Etapas de Conteúdo, Projeto Semanal, Menu de Configurações e Feedback Unificado

## O que foi implementado

**Parte 1 — Sessão Leitura e Sessão Vídeo (mudança de domínio):**
- Dois novos valores em `ActivityType`: `Reading = 5`, `Video = 6` (apendados no fim do enum, não
  inseridos no meio, pra não remexer os ordinais já persistidos como string no banco).
- `DailyActivity.ctor`: `ContentId` agora é obrigatório pra `VoiceSummary`, `Reading` e `Video`
  (regra generalizada, mesma exceção de domínio de antes).
- `SubmitActivityResponseUseCase.ResolveScore`: `Reading`/`Video` sempre pontuam 100 - não há
  avaliação, "concluir a etapa" é o próprio "acerto". Reaproveita o mesmo `ActivityResponseRecorder`
  dos outros 4 tipos (mesma tabela, mesmo pipeline de conclusão/penalidade), só nunca reprova, logo
  nunca soma `PenaltyPoints` nem dispara reforço.
- `GET /api/curated-content/{id}` (novo endpoint) - o frontend precisava buscar o `CuratedContent`
  de uma `DailyActivity` pra renderizar a etapa (`DailyActivityDto` só trai `ContentId`, nunca o
  conteúdo). Reaproveita `IWeeklyRepository.GetCuratedContentByIdAsync`, que a autoria de conteúdo
  (Fase 4) já usava.
- Seed (`SeedWebSecurityCourseUseCase`): os 4 dias da Semana 1 ganharam `Reading`/`Video` no início
  da sequência, na ordem confirmada (leitura → resumo falado, quando existe → vídeo → atividades
  avaliáveis), com os `OrderIndex` dos tipos existentes deslocados pra abrir espaço.
- Frontend: `ReadingActivity`/`VideoActivity` (novos componentes), plugados em `TodayPage` como mais
  dois branches de `activity.type` (sem mudar `resolveStep` - já caem no `{kind:'activity'}` padrão).
  `VideoActivity` embeda o YouTube de verdade (`youtube-nocookie.com`, `rel=0` + `modestbranding=1`)
  a partir de `CuratedContent.ExternalUrl` - o mockup do Figma mostra um player estático (Figma não
  renderiza iframe), aqui virou o player real.

**Parte 2 — Projeto Semanal:**
- `WeeklyProject.Submit(url)` já existia no domínio desde a Fase 1, só faltava caminho até ele.
  `SubmitWeeklyProjectUseCase` (novo) + `POST /api/weeklies/{weeklyId}/project/submit` (novo
  endpoint - rota escolhida em cima do aggregate `Weekly`, não um `weekly-projects/{id}` avulso,
  porque não existe repositório próprio pra `WeeklyProject`).
- Frontend: `WeeklyProjectPage` (nova tela, `/start?course=&weekly=&project=1`), mostra `SpecText`,
  campo de URL de submissão, e status atual (badge deriva do `WeeklyProjectStatus`).

**Parte 3 — Menu de Configurações (overlay):**
- `SettingsMenu` (novo componente), montado em `TodayPage` sobre a tela de estudo -
  `backdrop-blur` nativo (sem precisar borrar a árvore de trás manualmente).
- ESC e o botão "voltar" do navegador, enquanto a sessão está ativa, abrem o menu em vez de sair -
  ver `useSessionExitGuard` em `TodayPage.tsx` (hook local: intercepta `keydown`/`popstate`, empurra
  uma entrada de histórico "sentinela" pra segurar o botão voltar).
- Ações reais: fechar (ESC ou botão) e "Sair e salvar progresso" (navega pra `/start` - progresso já
  está salvo a cada resposta enviada ao servidor, não há nada extra pra persistir aqui). Aparência/
  Som/Notificações/Limite de gravação/Perfil/Atalhos ficam como placeholders visuais, conforme pedido.

**Parte 4 — Feedback IA unificado:**
- `FeedbackPanel` (novo componente compartilhado): gauge circular de Score + inset com a resposta
  do usuário (quando há `transcript`) + feedback textual (quando há `aiFeedback`) + linha de detalhe
  específica do tipo + botão "Continuar". Usado pelos 5 componentes de atividade
  (`OptionsAnswer`/`ClozeFreeTextActivity`/`RoleplayActivity`/`VoiceSummaryActivity`), sem mudar
  nenhum comportamento funcional - só trocou o bloco de "reveal" final de cada um.

## Decisões técnicas tomadas que não estavam no prompt original

- **Score fixo 100 pra Reading/Video** (em vez de outro mecanismo de "concluído"): reaproveita
  `ActivityResponse`/`Daily.SubmitActivityResponse` tal como já existem - `Passed` sempre `true`
  (`Score >= PassingScore`), nunca soma `PenaltyPoints`. Verificado que se encaixa limpo antes de
  implementar (não precisou de gambiarra nem de campo novo).
- **`GET /api/curated-content/{id}`**: não estava no prompt, mas é pré-requisito de dados - sem ele
  o frontend não tinha como saber o título/texto/link de uma `DailyActivity` Reading/Video.
- **Sidebar "Material de hoje" filtrada por atividade do dia**: `WeeklyDetailDto.curatedContents`
  traz os 4 dias juntos (`CuratedContent` não tem `DailyId`, só pertence à `Weekly`) - o sidebar
  filtra pelos `ContentId` das `DailyActivity` da Daily atual, senão mostraria a semana inteira.
  Descoberto e corrigido durante a verificação ao vivo desta fase (ver seção de Testes).
- **`FeedbackPanel` não usa a estrutura de 2 colunas (acertos/pontos de melhoria) do Figma**: o
  domínio só guarda `AiFeedback` como 1 string única (`GroqContentEvaluationService`), não uma lista
  estruturada - virou 1 bloco de texto em vez de bullets separados, pra não inventar dado que a Api
  não tem.
- **`WeeklyProjectPage` não replica título/objetivos/recursos separados do mockup**: `WeeklyProject`
  só tem `SpecText` (1 texto livre, ver seed) - virou o corpo inteiro do card, sem checklist/links
  fabricados.
- **`Sair e salvar progresso`** troca o rótulo do design ("Sair da conta"): o app não tem conceito
  de conta/login (usuário único hardcoded) - o rótulo original seria enganoso.
- **Cor `--color-project` (`#FFB800`)**: token novo no `@theme` pro tema âmbar do Projeto Semanal,
  separado de `--color-accent` (verde), conforme pedido no prompt ("token novo... adicione ao
  @theme").
- **`SessionTopBar`/`QuickQuestionOrb` (`SessionShell.tsx`) e `MaterialSidebar.tsx`**: extraídos
  como componentes compartilhados entre Reading/Video/Projeto Semanal - o chrome (barra de
  progresso + orbe decorativo + sidebar de material) é idêntico nos 3, só o corpo do card muda.
- **`useSessionExitGuard`**: o app usa `<BrowserRouter>` declarativo (não `createBrowserRouter`),
  que não expõe `useBlocker` - a interceptação do botão voltar usa o truque padrão de
  `history.pushState` sentinela + `popstate`, sem trocar o roteador do app inteiro.

## Estrutura de arquivos criada

```
backend/src/
  Focadu.Domain/Enums/ActivityType.cs                    <- +Reading, +Video
  Focadu.Domain/Activities/DailyActivity.cs               <- ContentId obrigatorio generalizado
  Focadu.Application/Dailies/SubmitActivityResponseUseCase.cs  <- Reading/Video = Score 100
  Focadu.Application/Content/GetCuratedContentUseCase.cs  <- novo
  Focadu.Application/Weeklies/SubmitWeeklyProjectUseCase.cs  <- novo
  Focadu.Application/Seed/SeedWebSecurityCourseUseCase.cs  <- ordem leitura->video->avaliaveis
  Focadu.Api/Contracts/WeeklyProjectRequests.cs            <- novo
  Focadu.Api/Program.cs                                    <- +2 endpoints
tests/Focadu.Tests/
  Dailies/DailyTests.cs                                    <- +Theory Reading/Video ContentId
  Dailies/SubmitActivityResponseScoreTests.cs               <- +Theory Reading/Video Score
  Weeklies/WeeklyProjectTests.cs                            <- novo

frontend/src/
  api/types.ts                       <- ActivityType +Reading/+Video, WeeklyProjectStatus vira const
  api/client.ts                      <- getCuratedContent, submitWeeklyProject
  assets/reading/                    <- SVGs (dots, play, check, orbe) - Figma, bytes exatos
  components/
    FeedbackPanel.tsx                <- novo (Parte 4)
    SessionShell.tsx                 <- novo (SessionTopBar, QuickQuestionOrb)
    MaterialSidebar.tsx              <- novo
    ReadingActivity.tsx              <- novo (Parte 1)
    VideoActivity.tsx                <- novo (Parte 1)
    SettingsMenu.tsx                 <- novo (Parte 3)
    OptionsAnswer/ClozeFreeTextActivity/RoleplayActivity/VoiceSummaryActivity.tsx  <- usam FeedbackPanel
  routes/
    WeeklyProjectPage.tsx            <- novo (Parte 2)
    TodayPage.tsx                    <- +Reading/Video, +SettingsMenu, +useSessionExitGuard
    StartPage.tsx                    <- +rota ?project=, link pro projeto na WeeklyView
  index.css                          <- +--color-project
```

## Testes

- Backend: `dotnet test` - 57 aprovados, 0 falhas (inclui os novos: `ContentId` obrigatório pra
  Reading/Video, Score sempre 100 pra Reading/Video, `WeeklyProject.Submit`/`Evaluate`).
- Verificação ao vivo (Postgres real via `docker compose`, seed, `dotnet run`, `vite dev`,
  Playwright headless) - fluxo completo exercitado:
  1. `/hoje` abre direto na etapa de Leitura (`ETAPA 1 DE 4 — LEITURA`), conteúdo real da MDN,
     sidebar "Material de hoje" com Leitura ativa + Vídeo do dia. "CONCLUÍ A LEITURA" avança pro
     Resumo Falado (ordem `leitura -> resumo falado -> vídeo -> quiz` confirmada na prática).
  2. ESC durante a sessão abre o `SettingsMenu` (fundo desfocado); botão "voltar" do navegador
     também - a URL permanece em `/hoje`, sem sair da sessão.
  3. Etapa de Vídeo renderiza o embed real do YouTube (vídeo tocando de fato, confirmado via
     requisições de telemetria do próprio player) e o sidebar marca a Leitura com ✓.
  4. Quiz respondido corretamente mostra o `FeedbackPanel` unificado ("Acertou! 🎉" + gauge 100/SCORE).
  5. `WeeklyProjectPage` carrega o `SpecText` real da Semana 1; submeter uma URL muda o badge de
     "PENDENTE" pra "AGUARDANDO AVALIAÇÃO" (`Status` -> `Submitted`) de ponta a ponta pela Api real.
  - Um bug real foi encontrado e corrigido durante essa verificação: o sidebar "Material de hoje"
    mostrava o conteúdo da semana inteira (12 itens, 4 dias) em vez de só os itens da Daily atual -
    corrigido filtrando por `daily.activities[].contentId` (ver "Decisões técnicas" acima).
- `tsc -b`, `oxlint`, `vite build` limpos no frontend; `dotnet build` limpo no backend.

## Dúvidas ou pontos abertos para a próxima fase

- **`Sair e salvar progresso`** hoje só navega pra `/start` - não existe nenhum estado adicional
  pra persistir além do que já foi salvo a cada resposta, mas se uma fase futura adicionar rascunho
  local (ex: texto ainda não enviado de um Cloze/FreeText), esse botão precisará de lógica de fato.
- **Aparência/Som/Notificações/Perfil/Atalhos** no `SettingsMenu` continuam só visuais - nenhum
  desses tem persistência (nem local nem no backend) ainda.
- **`rel=0` no embed do YouTube não remove 100% dos vídeos recomendados no final** - é o teto que a
  API atual do YouTube permite sem uma integração paga/diferente (ver `ponytail:` em
  `VideoActivity.tsx`).
- **Diagram continua fora da experiência do aluno** (mesma pendência já documentada desde a Fase 6) -
  Reading/Video passaram a ter tela; Diagram ainda não.
- **`WeeklyProjectPage` simplifica a estrutura do mockup** (título/objetivos/recursos adicionais
  separados) porque o domínio só tem `SpecText` como texto único - se o produto quiser essa
  estrutura de verdade, `WeeklyProject` precisa de campos novos (ex: lista de objetivos, lista de
  recursos) antes do frontend poder renderizá-los sem inventar dado.
