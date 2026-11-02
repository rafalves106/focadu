## Frontend (Fase 3, telas de atividade completadas nas Fases 4 e 5, autoria na Fase 6)

**Layout sem rolagem externa (Fase 61, por enquanto so no Projeto Semanal):** a pagina ocupa a altura
que sobra abaixo do `GlobalNav` (`lg:h-[calc(100dvh-57px)] lg:overflow-hidden`) e so os cartoes rolam,
via `ScrollArea` (`components/ScrollArea.tsx`): barra nativa escondida (`scrollbar-none`, `index.css`)
+ barra propria de 4px que aparece so enquanto rola e some com desfoque. Todo contêiner flex no
caminho ate a area que rola precisa de `min-h-0`. Abaixo de `lg`, fluxo empilhado com rolagem normal.
Plano do dono: levar pro sistema inteiro - abordagem e armadilhas em `docs/fase-61/`.
`WeeklyProjectPage` segue o Figma node `178:132` (2a versao, Fase 63): esquerda REPOSITORIO (clone
+ credenciais com icone de copiar) e REFERENCIAS; centro DESAFIO SEMANAL com entrega fixa no
rodape; direita ANOTACAO RAPIDA (`QuickNotePanel`, nota presa ao projeto) e TIRA DUVIDAS
(`StudyAssistantPanel`; as variantes antigas sem `fill`/`tall` sairam na Fase 74). Rotulos via `CardLabel`. O botao flutuante `QuickQuestionOrb` nao e
mais usado em nenhuma tela. **Cartoes laterais em pixel art (ajustes da Fase 65, 23/09/2026):**
repositorio, referencias, anotacao rapida (264px, 240 do Figma + 10%) e tira-duvidas usam a mesma
linguagem dos cartoes da trilha - `pixel-box`, rotulos/botoes em Silkscreen (`CardLabel pixel`, com
"// " na frente), texto e campos em VT323 com borda reta. O campo do chat cresce com a mensagem
(ate `max-h-40`, depois rola por dentro); o link do Caderninho na anotacao virou icone.

**Fidelidade visual da Sessao Diaria (Fase 19):** fase so de estilo, sem mudanca de logica/API/
estrutura de dados - as 8 telas de atividade (Leitura/Resumo Falado/Video/Quiz/Ligar Palavras/
Cloze/Roleplay/Feedback IA) e as pecas compartilhadas (`SessionShell`/`MaterialSidebar`/
`IntroCard`/`OptionCard`/`CodeHighlight`/`FeedbackPanel`/`PenaltyGauge`) tiveram cores/tipografia/
espacamento/raios conferidos contra o Figma. Maior mudanca estrutural (ainda assim so layout):
Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado ganharam o mesmo chrome que Reading/Video ja
tinham desde a Fase 7 (`SessionTopBar` + cartao + `MaterialSidebar` + orbe) via `SessionLayout`
(novo, `SessionShell.tsx`) - antes usavam `ActivityScreen` (`Layout.tsx`), um shell generico sem
esse chrome. Token novo: `--color-stroke` (`#2A2A2A`, borda - distinto de `--color-surface-alt`,
que e fundo). Fonte nova: Inter virou `--font-sans`, o default do app inteiro (nenhuma tela tinha
fonte propria antes desta fase). Divergencias do Figma mantidas conscientemente (nenhuma delas e
"resgate de conteudo descartado" - sao elementos sem dado real por tras, ver
`docs/fase-19/resumo-implementacao-fase-19.md`): grafo de arraste do Ligar Palavras (Fase 4/9,
reafirmado), 2 colunas do Feedback IA (Fase 7, reafirmado), indicador "arvore de decisao" numerada
do Roleplay (profundidade do grafo e variavel), legenda "Baseado em" do Resumo Falado (exigiria
chamada de API nova), campo de justificativa do Cloze como microfone (Justification e sempre texto
no dominio), fonte "Cousine" do bloco de codigo (reaproveitado Fira Code em vez de somar uma 4a
familia de fonte), rodape de telemetria fake em qualquer tela (nenhuma tela deste app mostra numero
sem dado real por tras).

**Fidelidade visual de Navegacao & Perfil + correcao de rota full-bleed (Fase 20):** `/hoje` saiu
do shell `<App/>` (full-bleed, `TodayRoute` - ver acima) - resolve a pendencia da Fase 19 (nav
global sobrepondo o HUD da sessao). `SessionLayout`/`IntroCard` ganharam mais folga no topo
(`pt-20`) pra nao colidir com o PenaltyGauge/botao de configuracoes agora que o nav nao da mais
essa folga de graca. As 8 telas de Navegacao/Perfil (StartDashboard/WeeklyDetailPage/
WeeklyProjectPage/SettingsMenu/Perfil-3-abas/RankingPage/MarketplacePage) e componentes
compartilhados (StreakIndicator/StatusBadge/WeeklyProjectCard/RankingScopeTabs/RankingTable)
conferidos contra o Figma - nenhum token novo (reconciliado com `--color-stroke`/`--font-sans` da
Fase 19). Maiores fabricacoes confirmadas e mantidas fora (mesmo criterio de sempre, ver
`docs/fase-20/resumo-implementacao-fase-20.md`): Nivel/XP, "Sessoes completas", Platinas por curso,
"blockchain focadu" no Perfil; ranking global com podium/XP/usuarios ficticios e painel "Seu
Desempenho" com delta/percentil/sparkline no Ranking; grid "Seus Cursos" com 2 cursos bloqueados
"libera no nivel X" no StartDashboard (so existe 1 Course Active, decisao da Fase 8 reafirmada).
**"Sair da Conta" (SettingsMenu) virou o botao vermelho de largura total do Figma** - divergencia
documentada desde a Fase 13a, corrigida nesta fase por decisao explicita (nao obrigatoria, mas
natural durante o refinamento da mesma tela).

**Etapa Anterior + Contador de Erros no Header + Timer Pomodoro (Fase 36):** 3 mudancas
independentes na tela de sessao, todas a partir de verificacao ao vivo/pedido direto do Falves.
(1) `SessionTopBar`/`IntroCard` ganharam `onBack` opcional ("← Etapa anterior") - revisita a
atividade anterior da MESMA Daily sem refazer nada (cada atividade decide seu proprio "ja
respondida" via `activity.responses`); `TodayPage.handleContinue` parou de recalcular "1a atividade
pendente" (`resolveStep`) a cada Continuar (so no carregamento inicial agora) e passou a avancar 1
posicao a partir do `step` atual, senao voltar e seguir em frente pulava direto pro fim da revisao.
Reading/Video (unicos sem nenhum indicador de "ja respondida") ganharam "✓ Já concluída" +
"PRÓXIMA ETAPA" pra nao parecer etapa nova ao revisitar. (2) O contador de erros (`PenaltyGauge`,
`fixed left-6 top-[72px]` desde a Fase 15) saiu do HUD fixo - confundido com contador de etapa por
ficar perto do `SessionTopBar` - e virou `PenaltyHeaderBadge` no `GlobalNav`, publicado via novo
`lib/dailyPenaltyContext.ts` (store `useSyncExternalStore`, mesmo padrao de
`studyAssistantContext.ts`). `SessionLayout`/`IntroCard` tiveram o `pt-20` (folga historica pro HUD
fixo) reduzido pra `pt-8` - virou espaco vazio sem funcao, sobrava scroll demais. (3) Timer
Pomodoro novo (`lib/pomodoroTimer.ts` + `components/pomodoro/`) - ver "Fora de escopo" pra por que
e 100% client-side, e as entradas de `PomodoroWidget`/`PomodoroHeaderBadge` acima pro
funcionamento.

**Sessao em 2 Colunas + Suporte Rapido de IA em Painel Fixo (Fase 37):** pedidos explicitos de
refinamento visual da sessao. `SessionLayout` ganhou `leftSidebar` (2a coluna, `items-stretch` pra
igualar a altura do cartao central) - `useMaterialSidebar.tsx` passou a devolver
`{ weekly, materialSidebar, sidebar }` em vez de so `sidebar`: `materialSidebar` (esquerda) tem
"Material de hoje" + `PomodoroWidget` (que ganhou `flex-1` pra preencher o espaco sobrando -
"esse card podia ocupar esse espaco"); `sidebar` (direita) tem `QuickNotePanel` + o novo
`StudyAssistantPanel` (Suporte Rapido de IA em card fixo - "algo mais parecido com um chat" em vez
do botao flutuante `QuickQuestionOrb`, que continua so em WeeklyProjectPage). Estado do chat
extraido pro hook `useStudyAssistantChat` (compartilhado pelos 2 componentes). Layout da pagina
ganhou mais orcamento de largura (`max-w-[1360px]`->`max-w-[1600px]`, `px-10`->`px-6`) pra caber os
2 sidebars de 280px sem espremer o cartao central.

```
frontend/
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado - VITE_API_BASE_URL)
  src/
    main.tsx              <- BrowserRouter + AuthProvider + SettingsProvider (Fase 25, ver
                              contexts/SettingsProvider.tsx) + Routes ("/" Splash, "/login" fora do
                              ProtectedRoute; /esqueci-senha e /redefinir-senha (Fase 41) tambem
                              fora, mesmo motivo; onboarding/onboarding/perfil/selecionar-curso/start
                              fora do <App/> - so start SEM params fica sem shell de verdade, ver
                              routes/StartPage.tsx; /hoje voltou pra DENTRO do <Route
                              element={<App/>}> na Fase 25, usa <TodayPage/> direto - era
                              <TodayRoute/> fora do shell desde a Fase 20, ver App.tsx abaixo);
                              /conquistas vira <Navigate to="/perfil?tab=conquistas"/> desde a
                              Fase 18)
    App.tsx                <- shell com <GlobalNav/> (Fase 25, ver components/GlobalNav.tsx -
                              substitui o antigo <nav> de 2 links) + <ErrorBoundary
                              key={pathname+search}><Outlet/></ErrorBoundary> (Fase 10; `+search`
                              desde a Fase 25, cobre /hoje trocando de Daily via `?daily=` sem
                              trocar de pathname). `children` prop opcional (Fase 25) - StartPage
                              chama `<App>...</App>` manualmente nas 5 sub-telas de `/start?...`
                              que ainda querem o menu global (a 6a, sem params, fica sem shell,
                              full-bleed - ver "Mapa do Mundo" abaixo). Fase 20-24: `/hoje` ficava
                              fora deste shell (full-bleed) pro nav fixo nao sobrepor o
                              PenaltyGauge/botao de configuracoes - Fase 25 reverteu isso
                              (PenaltyGauge reposicionado, botao de configuracoes proprio removido -
                              ver "Menu global unico" abaixo), `/hoje` volta a ganhar o shell
    index.css               <- @import "tailwindcss" + tokens @theme (paleta + fontes da identidade
                              visual, ver secao "Frontend" acima)
    assets/reading/          <- SVGs do design Figma (dots, play, check, orbe) - bytes exatos, Fase 7
    lib/
      statusBadge.ts           <- dailyStatusBadgeProps (Fase 8) - separado de components/StatusBadge.tsx
                                   pra nao co-exportar funcao junto com componente (fast refresh)
      apiError.ts               <- classifyApiError/ApiFailure (Fase 10) - classifica qualquer erro
                                   de fetch/Api numa das 5 categorias que as telas de erro sabem renderizar
      validation.ts               <- isValidEmail/MIN_PASSWORD_LENGTH (Fase 12) - compartilhado por
                                   LoginForm/RegisterForm, servidor nunca confia so nisso
      onboarding.ts                <- resolveLandingPath(user) (Fase 13b) - unico lugar que decide
                                   /onboarding vs /selecionar-curso vs /start; usado por SplashPage
                                   e pelo onSuccess de login/registro (LoginPage), nunca duplicado
      cosmeticStyle.ts               <- RARITY_STYLE (Fase 18, movido de CosmeticItemCard - fonte
                                   unica pra "raridade -> cor", reaproveitado por
                                   EquippedFramePreview) + nameColorClass(token) - token do
                                   CosmeticItem equipado (Name, nao hex) -> classe de cor de verdade
      worldPosition.ts                <- getSavedWorldPosition/saveWorldPosition (Fase 25) -
                                   localStorage por userId, ultima posicao do personagem no mapa
                                   (continuidade cosmetica, mesmo principio de nao-sincronizar-entre-
                                   dispositivos ja usado pro limite de gravacao)
      dailyPenaltyContext.ts            <- REMOVIDO na Fase 68 (o conta-giros saiu do GlobalNav e vive
                                   no topo da propria sessao - ver "Sessao diaria em pixel art")
      sessionContext.ts (Fase 68)       <- SessionContext (Daily, Weekly, etapa em tela, onBack,
                                   goToActivity) fornecido pela TodayPage + SessionFooterContext
      sessionSteps.ts (Fase 68)         <- agrupa as atividades em blocos (cadeia) e o rotulo da etapa
      focadaSessionLines.ts (Fase 68)   <- falas padrao da Focada na sessao (bloco, acerto/erro, fim)
      useSessionKeys.ts (Fase 68)       <- atalhos 1-9/Enter da sessao (ignora campos de texto)
      useIsDesktop.ts (Fase 68)         <- true a partir de `lg` (colunas vs. gaveta do celular)
      pixelProse.ts (Fase 68)           <- classes que poem MarkdownBlock/DiagramBlock em VT323
      pomodoroTimer.ts                  <- store modulo-level do Timer Pomodoro (Fase 36, ver
                                   secret/rascunhos/timer-pomodoro-sessao.md) - mesmo padrao
                                   useSyncExternalStore de dailyPenaltyContext.ts, com setInterval
                                   proprio (independente de qualquer componente montado - o timer continua contando ao
                                   navegar pra fora da sessao; desde a Fase 68 so aparece dentro dela).
                                   Manual (aluno liga/desliga, sem relacao com Daily.Start/Resume/
                                   Complete); predefinicoes fixas (25/5, 50/10, 15/3) em vez de
                                   duracao livre; fim de ciclo troca de fase automaticamente + bipe
                                   (Web Audio API, sem asset de audio novo) + destaque visual por
                                   ~5s. 100% client-side/cosmetico - sem endpoint novo, sem Gems,
                                   reseta se a aba fechar (ver "Fora de escopo")
      useStudyAssistantChat.ts           <- hook (Fase 37) com a logica do Suporte Rapido de IA
                                   (enviar pergunta, historico, /clear, erro), extraida de dentro de
                                   StudyAssistantWidget quando o "material de hoje" ganhou uma 2a
                                   apresentacao (StudyAssistantPanel, card fixo) - os 2 componentes
                                   compartilham o mesmo estado/comportamento, so a apresentacao muda
    contexts/
      authContextObject.ts         <- createContext + AuthContextValue (Fase 12) - so o objeto/tipo,
                                   separado do Provider e do hook pelo mesmo motivo de statusBadge.ts;
                                   login/register devolvem o UserDto (Fase 13b), pra quem chama nao
                                   depender do proximo render do contexto pra saber quem logou
      AuthContext.tsx                <- AuthProvider (Fase 12) - carrega GET /api/auth/me 1x no mount
      useAuth.ts                      <- hook useAuth() (Fase 12)
      settingsContextObject.ts         <- createContext + SettingsContextValue (Fase 25), mesmo
                                   padrao de authContextObject.ts
      SettingsProvider.tsx               <- Provider (Fase 25) - estado do SettingsMenu (Fase 7)
                                   virou 1 instancia so pro app inteiro (antes era estado local de
                                   TodayPage) - GlobalNav abre de qualquer tela, useSessionExitGuard
                                   (TodayPage, ESC/voltar do navegador em sessao ativa) continua
                                   abrindo tambem, agora os dois compartilham o mesmo estado.
                                   Renderiza <SettingsMenu/> 1x como irmao de children (mesmo padrao
                                   de AuthProvider+SessionExpiredModal). onExit continua
                                   `window.location.href` (nao navigate) - preservado identico
      useSettings.ts                      <- hook useSettings() (Fase 25), mesmo padrao de useAuth.ts
    api/
      types.ts               <- espelha os DTOs de Focadu.Application (enums como numero, com
                                   consts tipo ActivityType/AnswerMode/ActivityStatus/TerminalQuality/
                                   WeeklyProjectStatus/DailyStatus/CourseStatus (Fase 8, viraram
                                   const), ACTIVITY_TYPE_LABEL/CURATED_CONTENT_TYPE_NAMES,
                                   PublicationPlatform/PublicationStatus/ModulePublicationDto/
                                   GitHubRepoDto (Fase 11)
      client.ts               <- fetch tipado, ApiError, VITE_API_BASE_URL, suporte a FormData
                                   (upload de audio, Fase 5, sem forcar Content-Type json); request()
                                   usa AbortSignal.timeout() desde a Fase 10 (10s padrao, 95s pro
                                   endpoint de audio - ver "Timeout de requisicoes"); credentials:
                                   'include' desde a Fase 12 (senao o cookie de sessao nunca vai/volta)
      useApiResource.ts        <- hook pra loading/error/cancelamento (usado pelas sub-telas de /start e /admin/conteudo);
                                   `error` e um `ApiFailure` classificado (nao string) + `retry()` desde a Fase 10
    routes/
      SplashPage.tsx             <- "/" (Fase 12) - checa sessao (AuthProvider) e redireciona pra
                                   /login, ou resolveLandingPath(user) (onboarding/selecao de
                                   curso/start - Fase 13b), duracao minima de 700ms. Fase 74: logo
                                   pixel grande + barra de 16 blocos
      LoginPage.tsx                <- "/login" (Fase 12) - abas Entrar/Criar Conta; onSuccess de
                                   ambos os forms passa pelo mesmo resolveLandingPath (Fase 13b).
                                   Fase 41: link "Esqueci minha senha" -> /esqueci-senha. Fase 74:
                                   pixel art (EntryPitch a esquerda a partir de `lg` + EntryCard)
      ForgotPasswordPage.tsx      <- /esqueci-senha (Fase 41) - fora do <ProtectedRoute/>. Fase 74:
                                   EntryScreen + EntryCard; depois do envio a Focada confirma.
                                   POST /api/auth/forgot-password sempre "sucesso", mesma tela pra
                                   email cadastrado ou nao
      ResetPasswordPage.tsx       <- /redefinir-senha?token= (Fase 41) - token vem da query string
                                   (link do email); POST /api/auth/reset-password,
                                   token_invalido/token_expirado mostrados como veio do backend
      OnboardingWelcomePage.tsx   <- /onboarding (Fase 13b, passo 1/3) - "Pular tour" conclui o
                                   perfil com interesses vazios (User.CompleteProfile aceita lista
                                   vazia) e pula direto pra /selecionar-curso
      ProfileInterviewPage.tsx    <- /onboarding/perfil (Fase 13b, passo 2/3) - Entrevista de
                                   Perfil, ChoiceChip multi-select + notas livres, salva via
                                   PUT /api/users/me/profile (CompleteProfileUseCase). `?edit=1`
                                   (Fase 18): mesma tela reaproveitada pra editar depois do
                                   onboarding (pre-popula com UserDto.interests/
                                   additionalProfileNotes, volta pro /perfil ao salvar em vez de
                                   seguir pra /selecionar-curso)
      CourseSelectionPage.tsx     <- /selecionar-curso (Fase 13b, passo 3/3) - GET
                                   /api/courses/available, matricula via POST /api/enrollments.
                                   Fase 74: cursos como "save slots" com o castelo
                                   (as 3 telas de onboarding usam components/entry/Entry.tsx)
      EmptyStateStartPage.tsx     <- guarda de seguranca em /start (Fase 13b) - renderizada por
                                   StartDashboard quando GET /api/today devolve 404
                                   `nenhuma_matricula_ativa`; StreakIndicator fixo em 0 (Fase 14,
                                   sem chamada a API - quem nao se matriculou nunca tem streak)
      TodayPage.tsx            <- /hoje (orquestra os 7 tipos de atividade e o fluxo de conclusao -
                                   Fase 7); ReinforcementIntroScreen como gate quando
                                   `daily.isReinforcement` e nenhuma atividade ainda respondida
                                   (Fase 15). Fase 25: `TodayRoute` removido (o `<App/>` cobre o
                                   `<ErrorBoundary key={pathname+search}>` agora, `/hoje` esta dentro
                                   do shell de novo) - `TodayPage` e o elemento de rota direto; botao/
                                   estado proprio de Configuracoes saiu (usa `useSettings()`, ver
                                   contexts/SettingsProvider.tsx). Fase 68: fornece o `SessionContext` e toda tela
                                   (etapas, avisos, conclusao) roda dentro da casca `SessionLayout`;
                                   o conta-giros voltou pra dentro da sessao (topo). Fase
                                   36 tambem trouxe "Etapa anterior" (`goToActivity`, pino manual num
                                   `activityId` especifico - `handleContinue` passou a so avancar 1
                                   posicao a partir do `step` atual, nunca mais recalcular "1a
                                   pendente" do zero via `resolveStep` a cada Continuar, que divergia
                                   ao voltar e depois seguir em frente)
      StartPage.tsx             <- /start (so o roteador por query string - Fase 8: as 3 telas
                                   viraram arquivos proprios abaixo, StartPage so decide qual mostrar);
                                   `<WeeklyDetailPage key={weeklyId} .../>` desde a Fase 11 (ver
                                   "Bug real: modal preso ao trocar de Weekly" abaixo); `?ranking=1`
                                   -> RankingPage (Fase 16, mesmo padrao de flag de `?project=`);
                                   sem params -> `WorldMapPage` no desktop desde a Fase 25 (era
                                   `StartDashboard` ate a Fase 24), `StartDashboard` de volta no
                                   celular (`useIsMobile()`, viewport < 768px - mapa exige teclado,
                                   sem sentido num touchscreen; `StartDashboard` roda dentro de
                                   `<App>` como sempre rodou). **Desativado pro lancamento (pos-
                                   Fase 26, commit `51bd45c`)**: sem params volta a cair sempre em
                                   `StartDashboard`, desktop e celular - `isMobile`/`WorldMapPage`
                                   pararam de ser referenciados aqui (nada apagado, so o `if`
                                   sumiu). Reverter e restaurar o branch acima, ver comentario em
                                   `StartPage.tsx`
      world/WorldMapPage.tsx     <- /start sem params (Fase 25, Parte A) - hub de entrada virou mapa
                                   top-down. **Sem referencia em StartPage desde o lancamento pos-
                                   Fase 26** (ver nota acima) - arquivo intacto, so nao esta no
                                   caminho de nenhuma rota no momento
                                   top-down (`assets/world/mapa-vilarejo.png`, arte trazida pelo
                                   Falves) com personagem controlavel (setas/WASD, sem colisao contra
                                   predio - so as 5 trigger zones das portas importam), FULL-BLEED
                                   (unica tela sem `<GlobalNav/>`, ver App.tsx acima); GemBadge/
                                   StreakIndicator sobrepostos no HUD (mesma fonte de dado da Fase 14
                                   que o StartDashboard usava); guarda de `nenhuma_matricula_ativa`
                                   preservada identica (renderiza EmptyStateStartPage). Posicao
                                   persistida entre visitas via `lib/worldPosition.ts` (localStorage
                                   por userId) - salva no instante de entrar numa casa (`handleEnterZone`
                                   chama `pushAwayFromZone`, NAO a posicao exata do gatilho - fix
                                   real, nascer dentro do proprio raio da trigger zone fazia o 1o
                                   movimento re-disparar a mesma zona, personagem preso entrando e
                                   saindo da mesma casa) e em segundo plano ~400ms depois que o
                                   personagem para (`useEffect` debounced,
                                   cobre sair sem passar por trigger zone). Personagem e
                                   so placeholder (bolinha + indicador de direcao) - sem asset de
                                   personagem ainda, ver "Fora de escopo" abaixo. `HouseLabel`
                                   (components/world/) sempre visivel acima de cada porta - so o
                                   titulo (Hoje/Trilha do Curso/etc), posicao derivada da propria
                                   trigger zone (x igual, y = topo do circulo + gap). Botao "Ajustar
                                   zonas" no canto (state local, sem query param) mostra os circulos
                                   das 5 trigger zones + coordenada atual do personagem - nao e
                                   feature, e ferramenta de calibracao contra a arte
      world/worldConfig.ts        <- coordenadas das 5 trigger zones (espaco de pixels da imagem,
                                   2304x1296) + pra onde cada uma navega - torre->Hoje, castelo->
                                   Trilha do Curso (Ranking continua ancorado la dentro), casinha->
                                   Perfil, celeiro->Loja, campo de treino->Squad
      world/useWorldMovement.ts    <- hook do loop de movimento (keydown/keyup + requestAnimationFrame,
                                   sem lib externa - mesmo principio de "fetch nativo sem lib extra"
                                   do resto do frontend) + deteccao de entrada em trigger zone.
                                   `normalizeKey` (Fase 25, fix real) - `event.key` vem maiusculo
                                   com Caps Lock ligado/Shift segurado, nao batia com as entradas
                                   minusculas de MOVE_VECTORS (WASD parava de funcionar
                                   silenciosamente, setas continuavam OK por nao serem letras)
      lib/useIsMobile.ts (Fase 25)   <- hook - true com viewport < 768px (breakpoint `md`), usado
                                   por StartPage pro fallback mobile em /start
      GlobalNav.tsx (Fase 25)       <- menu global unico (components/) - substitui o antigo <nav> de
                                   2 links do App.tsx. Fase 62 (Figma node 178:143): Hoje, Trilhas,
                                   Ranking | botao central | Squad, Loja + UserMenu ("@usuario" + avatar;
                                   abre Meu perfil, Configuracoes e o status da IA - os dois ultimos
                                   sairam da barra, o Figma nao os tem). 73px de altura e texto 24px
                                   em `xl` (>= 1280px), tamanho antigo abaixo; altura em
                                   `--nav-height` (index.css), descontada pelas telas sem rolagem
                                   externa. Botao central "volta pro mapa" - placeholder (emoji),
                                   sem PNG pixel art de verdade ainda (ver "Fora de escopo").
                                   Fase 68: menu global e UNICO - os badges de sessao da Fase 36
                                   (`PenaltyHeaderBadge`, `PomodoroHeaderBadge`) foram removidos; o
                                   conta-giros e o Pomodoro vivem dentro da sessao diaria.
                                   `courseId` resolvido com busca propria (GET /api/courses, mesmo
                                   fallback Active->primeiro que WorldMapPage/StartDashboard sempre
                                   usaram) - self-contained, mesmo padrao de UserMenu. Sem
                                   destaque de "item ativo" (NavLink so compara pathname, destacaria
                                   Trilha/Ranking juntos incorretamente - usa Link simples).
                                   Responsivo (Fase 25, descoberto testando o fallback mobile - 7
                                   itens + botao central + badge nao cabiam em ~390px): abaixo do
                                   breakpoint `md`, os 2 grupos de texto viram um botao "☰" que abre
                                   um menu suspenso em lista (fecha ao navegar); botao central e
                                   UserMenu (so o avatar) continuam sempre visiveis. Acima
                                   de `md`, layout identico ao original
      StartDashboard.tsx          <- /start sem params. Fase 66: 2 colunas pixel art, sem rolagem -
                                   cursos em "save slots" + cartao do agente | missao do dia, rumo ao
                                   castelo e fala da Focada do curso escolhido (`?curso=`). Pecas em
                                   components/start/, derivacoes em lib/startScreen.ts
      WeeklyDetailPage.tsx        <- /start?weekly= - visao da semana (Fase 8; pixel art na Fase 74):
                                   trilha da semana (components/week/WeekTrail.tsx) + coluna com a
                                   Focada, resumo, certificacoes e regras; faixa + PublicationModal
                                   quando `requiresPublicationToUnlock` (Fase 11)
      CourseDetailPage.tsx        <- /start?course= - Fase 65: mapa da trilha em pixel art (CourseMap +
                                   fala da Focada + HUD do curso + Resumo com atalhos), 3 colunas com
                                   altura da tela; lista de semanas so no celular/curso sem mapa (ver
                                   "Mapa da trilha"). Historico: trilha completa (semanas + mini-grid de dias)
                                   (Fase 8); badge "🔒 Bloqueado" na Weekly seguinte a uma que ainda
                                   precisa de publicacao (Fase 11); links "🏆 Ver Ranking" ->
                                   /start?course=&ranking=1 (Fase 16) e "🎖️ Conquistas" -> /conquistas
                                   (Fase 17). Fase 39: `findCurrentWeekId` destaca (borda accent) a
                                   1a semana acessivel e ainda incompleta em `WeekSummaryCard`, no
                                   lugar do emoji ▶️/🔒 fixo por semana (🔒 continua so quando bloqueada)
      RankingPage.tsx            <- /start?course=&ranking=1 (Fase 16; Fase 73: placar de fliperama
                                   em pixel art, sem rolagem externa a partir de lg)
      MarketplacePage.tsx        <- /loja (Fase 17, tela 14 do inventario original). Fase 25: "em
                                   breve" (pedido do Falves - vai montar um kit inicial de pixel
                                   art pros cosmeticos) - so `GemBadge` + `ComingSoon` (novo,
                                   components/), filtro por slot (CosmeticSlotFilter) + grid
                                   (CosmeticItemCard) saíram desta tela (arquivos continuam no
                                   repo, sem uso); `purchaseCosmeticItem`/`equipCosmetic`/
                                   `unequipCosmetic` (api/client.ts) intactos, so nao exercitados
                                   aqui mais
      ProfilePage.tsx            <- /perfil (Fase 18). Fase 72: "tela do agente", sem abas - palco
                                   (AgentStage) | cartoes (ProfileCards); guarda-roupa e conquistas
                                   em modal via ?abrir= (os ?tab= antigos ainda valem)
      SquadPage.tsx              <- /squad (Fase 72): QG do Squad - SquadHero, feed + ranking; 404 =
                                   NoSquadView
      WeeklyProjectPage.tsx      <- projeto pratico da semana (Fase 7; a especificacao
                                   renderiza via MarkdownBlock desde a Fase 58, antes era
                                   texto corrido com a sintaxe crua; escolha de linguagem
                                   com confirmacao em 2 passos desde a Fase 59, piloto
                                   Semana 1)
      AdminContentPage.tsx       <- /admin/conteudo (autoria de CuratedContent, Fase 6) - navega
                                   com WeeklyTemplateId desde a Fase 13b (getCourseCurriculum/
                                   getWeeklyTemplate, sem exigir matricula)
    components/
      ProtectedRoute.tsx           <- guarda de rota client-side (Fase 12) - so le AuthContext, nunca
                                   busca sessao de novo sozinho; backend exige [Authorize] em tudo
                                   isso desde a Fase 13a
      EquippedFramePreview.tsx      <- Fase 18 - placeholder de avatar (iniciais do nome + anel
                                   colorido por raridade quando uma Moldura esta equipada, sem
                                   upload/ilustracao real); hoje so no UserMenu (o perfil usa
                                   o AgentAvatar quadrado desde a Fase 70)
      UserMenu.tsx                   <- Fase 62 (substitui HeaderUserBadge, Fase 18) - "@usuario"
                                   (DisplayName sem espacos/acentos, minusculo - User nao tem
                                   username) + avatar com moldura; clique abre Meu perfil,
                                   Configuracoes e o status da IA; fecha no clique fora/Esc. Cor do
                                   nome: cosmetico equipado ou verde `accent`. Ponto no avatar
                                   quando a IA nao esta ok
      AiStatusBadge.tsx              <- Fase 28 (Fase 62: so o detalhe, `AiStatusDetails`, sem o
                                   selo) - resumo + nome/status/erro por provedor; estado vem de
                                   `lib/useAiStatus.ts` (GET /api/system/ai-status, polling 45s)
      auth/
        PixelFields.tsx              <- Fase 74 - PixelTextField/PixelPasswordField/PixelFormError dos 4 forms
        BackToLogin.tsx              <- Fase 74 - "‹ Voltar pro login" das telas de senha
        LoginForm.tsx                <- email + senha (Fase 12); onSuccess recebe o UserDto (Fase 13b);
                                   so pixel art desde a Fase 74 (login e SessionExpiredModal)
        RegisterForm.tsx              <- nome + email + senha + confirmacao (Fase 12); onSuccess
                                   recebe o UserDto (Fase 13b); `referralCode` opcional (Fase 17,
                                   vem de /login?ref=, ver LoginPage)
        ForgotPasswordForm.tsx       <- Fase 41 - so email, onSubmitted(email) (nao ha UserDto, essa
                                   chamada nunca cria sessao)
        ResetPasswordForm.tsx        <- Fase 41 - nova senha + confirmacao (mesmo padrao de
                                   RegisterForm), recebe `token` por prop (vem da query string de
                                   ResetPasswordPage), onSuccess() sem payload
      entry/Entry.tsx              <- Fase 74 - pecas das telas fora do app: PixelLogo, OnboardingStepper
                                   ("Passo N de 3" em blocos), EntryTopBar, EntryScreen, EntryCard,
                                   ChoiceChip (substituiu o InterestChip) e EntryPitch (login)
      onboarding/                  <- Fase 13b (so o LanguagePreferenceModal sobrou aqui)
      gamification/                 <- Fase 14
        GemBadge.tsx                     <- gema + total (caixa reta pixel desde a Fase 74)
        StreakIndicator.tsx               <- "Ofensiva de N dias" - EmptyStateStartPage (fixo em 0), pixel desde a Fase 74
        (PenaltyHeaderBadge.tsx removido na Fase 68 - virou session/ErrorGauge.tsx)
      pomodoro/                     <- Fase 36 (ver secret/rascunhos/timer-pomodoro-sessao.md)
        PomodoroWidget.tsx                 <- versao "design exclusivo" do Timer Pomodoro, empilhada
                                   no sidebar esquerdo da sessao (SessionLayout, Fase 68: pixel art) -
                                   digitos grandes, barra de progresso (accent=foco/project=pausa),
                                   pills de preset (25/5, 50/10, 15/3), play/pausar/zerar. Fase 37:
                                   ganhou `flex-1` (cresce pra preencher a coluna esquerda inteira,
                                   pedido explicito - antes sobrava vao vazio empilhado acima dele)
        (PomodoroHeaderBadge.tsx removido na Fase 68 - menu global unico)
      assistant/                    <- Fase 37
        StudyAssistantPanel.tsx              <- Suporte Rapido de IA em card fixo (pedido explicito:
                                   "algo mais parecido com um chat" em vez do botao flutuante) -
                                   empilhado no sidebar direito da sessao (ver useMaterialSidebar.tsx),
                                   ao lado do QuickNotePanel. Mesmo estado/logica que
                                   StudyAssistantWidget via useStudyAssistantChat (lib/), so a
                                   apresentacao muda (card sempre visivel em vez de painel que abre
                                   por cima de tudo). Lista de mensagens com altura fixa (h-[200px],
                                   scroll proprio) - pedido explicito de "tamanho similar ao
                                   Pomodoro" pros 2 lados do sidebar ficarem equilibrados
      ReinforcementIntroScreen.tsx  <- Fase 15 - transicao pra Daily de reforco, reaproveita IntroCard
      ranking/                     <- Fase 16; Fase 73 trocou RankingScopeTabs/RankingTable/
                                   CurrentUserRankingCard por Scoreboard.tsx
        Scoreboard.tsx                    <- PodiumPanel, ScoreBoard (HIGH SCORE), NextTarget, HowToClimb
      agent/                        <- Fase 71 (substitui marketplace/, cujos CosmeticItemCard e
                                   CosmeticSlotFilter sairam - sem uso desde a Fase 25)
        AgentSprite.tsx                   <- agente em camadas (corpo + pecas) recortado das folhas
                                   de sprite em escala inteira; WalkingAgent = mini andando
        AgentCreator.tsx                  <- criacao: pele, 1 cabelo natural, kit basico gratis
      profile/                      <- Fase 18; pixel art na Fase 70; Fase 72 tirou as abas (AgentSheet,
                                   ReferralPanel, ProfileTabs, InformationTab e SquadTab removidos)
        AgentStage.tsx                    <- palco do agente: sprite 8x/6x, 4 slots recortados da
                                   folha da peca, curso ativo, "Trocar visual"/Configuracoes
        ProfileCards.tsx                  <- ProfileStats, TrophyShelf, SquadShortcut,
                                   StudyCalendarCard, DossierCard
        Section.tsx                       <- bloco "// TITULO" (guarda-roupa e conquistas)
        CustomizationTab.tsx                  <- guarda-roupa do agente (Fase 71): vistas, troca de
                                   pele e pecas possuidas por slot; sem agente, o AgentCreator
        ConquestsTab.tsx                       <- badges em lista com barra ate a meta (modal
                                   "Ver todas" desde a Fase 72)
      squad/                        <- Fase 72, QG do Squad
        pixelStage.tsx                    <- PixelStage (holofote em degraus + piso) e PanelLabel
        SquadHero.tsx                     <- nome/codigo/convidar | escalacao | meta da semana
        SquadFeed.tsx                     <- feed por dia, filtros, GG
        SquadRanking.tsx                  <- podio + lista, recortes, menu do lider, sair
        InviteModal.tsx                   <- codigo do squad + link de indicacao; ReferralStrip
        NoSquadView.tsx                   <- sem squad: vagas, criar/entrar, indique um amigo
      activities/                 <- primitivas visuais das atividades avaliaveis (Fase 9)
        IntroCard.tsx                <- tela de intro (badge/titulo/descricao/regras/CTA) - gate local (`started`), nao e passo novo no Step do TodayPage
        OptionCard.tsx                <- card de opcao (neutro/selecionado/correto/errado/esmaecido) - Quiz, Roleplay, e (Fase 23) os 2
                                   lados do matcher de WordMatch (reaproveitado sem mudanca).
                                   Fase 19: "selecionado" ganhou preenchimento verde translucido
                                   (bg-accent/25, nao so a borda), padding px-[18px]/py-4 exatos do Figma
        CodeHighlight.tsx              <- realca a lacuna "___" do prompt de Cloze - fonte mono (Fira Code, Fase 19) em vez de somar a fonte "Cousine" do Figma so pra este bloco
      QuizActivity.tsx             <- Quiz e Cloze/MultipleChoice (Intro + OptionsAnswer) (Fase 9). Fase 19: pos-Intro usa SessionLayout (era ActivityScreen simples)
      WordMatchActivity.tsx         <- matcher visual de 2 colunas por toque (tap-to-connect), 1 DailyActivity = 1 grupo de pares inteiro
                                   (Fase 23, reforma completa - substitui a versao Fase 9/19 que
                                   reaproveitava OptionsAnswer por termo, ver nota de divergencia
                                   removida do proprio arquivo). Fase 44 (bug real relatado ao
                                   vivo): em handleSubmit, o refetch do gabarito (api.getDaily ->
                                   setTerms/setDefinitions) precisa terminar ANTES de
                                   setLastResponse (o que vira `answered=true` e revela o
                                   resultado) - na ordem antiga, havia 1 render com answered=true
                                   e terms ainda sem CorrectDefinitionId, e termVerdict acusava
                                   "errado" em todos os pares nesse instante (flash de feedback
                                   falso antes do resultado real).
      OptionsAnswer.tsx          <- nucleo "escolher opcao" - Quiz, Cloze/MultipleChoice; usa OptionCard desde a Fase 9. WordMatch usava isto ate a Fase 21, tem interacao propria desde a Fase 23 (ver WordMatchActivity.tsx)
      ClozeFreeTextActivity.tsx   <- Cloze/FreeText (resposta + justificativa); Intro + CodeHighlight desde a Fase 9. Fase 19: SessionLayout + bloco de codigo/labels fieis ao node "sessao-cloze-test" - campo de justificativa continua texto (nao microfone, ver nota no arquivo)
      RoleplayActivity.tsx        <- navega o grafo de RoleplayNode client-side; Intro + OptionCard desde a Fase 9. Fase 19: SessionLayout + badge ambar "Roleplay de Decisoes" + bloco "Cenario" persistente (activity.prompt, antes so na Intro) + opcoes numeradas; indicador de "arvore de decisao" (1->2->3->4) do Figma omitido (profundidade do grafo e variavel, nao um numero fixo de passos)
      VoiceSummaryActivity.tsx    <- grava audio (MediaRecorder), envia multipart, mostra transcricao+feedback (Fase 5). Fase 19: SessionLayout `card={false}` (unica tela de sessao sem cartao, mic orb 180px) + legenda "Gravando - MM:SS / limite 10:00"; legenda "Baseado em: ..." do Figma omitida (exigiria 1 chamada de API nova so pra isso).
                                   Fase 21: le a pergunta em voz alta ao entrar (Web Speech API,
                                   nativa - sem servico externo), destacando cada palavra falada
                                   (`onboundary`, degrada pra colorir tudo de uma vez se o navegador/
                                   voz nao disparar por palavra) + botao "Ouvir de novo"; prefere voz
                                   pt-BR "de rede" (Google/Microsoft Online) por heuristica de nome
      ReadingActivity.tsx         <- etapa de leitura de um CuratedContent (Fase 7). Fase 19: usa SessionLayout/useMaterialSidebar (chrome generalizado, era JSX proprio)
      VideoActivity.tsx           <- etapa de video - embed real do YouTube (Fase 7). Fase 19: idem
      FeedbackPanel.tsx           <- bloco de resultado compartilhado pelos 5 componentes de atividade (Fase 7). Fase 19: gauge 72px (era 56px) com preenchimento bg-accent/25 quando passou, tracking/bordas fieis ao node "feedback-ia" - 2 colunas acertos/melhorias do Figma continuam fora (AiFeedback e 1 string so, ver Fase 7)
      SessionShell.tsx            <- SessionTopBar + QuickQuestionOrb + SessionLayout, compartilhados por Reading/Video/Projeto (Fase 7) e, desde a Fase 19, tambem por Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado.
                                   SessionTopBar usa ProgressBar por baixo desde a Fase 8. SessionLayout
                                   (Fase 19) generaliza o chrome inteiro (topbar + cartao/sem cartao +
                                   sidebar + orbe) que Reading/Video ja tinham como JSX proprio duplicado.
                                   Fase 36: SessionTopBar ganhou `onBack` opcional - mostra "← Etapa
                                   anterior" acima do stepLabel, volta pra atividade anterior da MESMA
                                   Daily pra revisar (nunca refaz - cada atividade decide seu proprio
                                   "ja respondida" via `activity.responses`, ver TodayPage.goToActivity);
                                   omitido na 1a atividade ou quando o chamador julgar inseguro (ex:
                                   VoiceSummaryActivity gravando). Fase 37: SessionLayout ganhou
                                   `leftSidebar` (2 colunas em vez de 1 - ver useMaterialSidebar.tsx),
                                   `items-stretch` (as 2 colunas ganham a altura do cartao central),
                                   `max-w-[1360px]`->`max-w-[1600px]`/`px-10`->`px-6` (orcamento de
                                   largura extra pros 2 sidebars de 280px sem espremer o cartao
                                   central); parou de renderizar `QuickQuestionOrb` sozinho (nas telas
                                   com esse sidebar o botao flutuante deu lugar ao
                                   `StudyAssistantPanel` fixo - unico call site restante de
                                   `QuickQuestionOrb` e WeeklyProjectPage, que nao tem esse sidebar)
      useMaterialSidebar.tsx      <- hook (Fase 19, arquivo proprio - co-exportar com SessionShell.tsx quebraria o fast refresh) - busca a Weekly e monta o MaterialSidebar com os itens/concluidos da Daily atual; reaproveitado pelas 7 telas de sessao.
                                   Fase 29: ganhou QuickNotePanel do Caderninho. Fase 36: ganhou
                                   PomodoroWidget. Fase 37 (reagrupado em 2 colunas, pedido
                                   explicito): retorna `{ weekly, materialSidebar, sidebar }` (era so
                                   `sidebar`) - `materialSidebar` (coluna esquerda, vira `leftSidebar`
                                   no SessionLayout) tem MaterialSidebar + PomodoroWidget (que ganha
                                   `flex-1` pra preencher o espaco sobrando); `sidebar` (coluna
                                   direita) tem QuickNotePanel + StudyAssistantPanel (`justify-between`
                                   no container, Caderninho de tamanho fixo + vao antes do chat)
      MaterialSidebar.tsx         <- "Material de hoje", compartilhado por Reading/Video (Fase 7), demais telas de sessao desde a Fase 19 (via useMaterialSidebar). `activeContentId` virou nullable (so Reading/Video tem conteudo proprio pra destacar)
      SettingsMenu.tsx            <- menu de configuracoes (overlay), Fase 7 - so o componente
                                   visual (props open/onClose/onExit/onLogout, sem estado proprio);
                                   montado em SettingsProvider desde a Fase 25 (era TodayPage direto)
      StatusBadge.tsx              <- selo de status (Fase 8); so pixel art e sprite desde a Fase 74 (sem emoji)
      week/WeekTrail.tsx             <- trilha da semana em pe da visao da semana (Fase 74)
      SegmentedBar.tsx               <- barra de progresso pixel art em blocos (Fase 66; a trilha ainda tem a copia local dela)
      start/                         <- pecas da tela de start (Fase 66): CourseSlots, AgentCard,
                                   DailyMissionCard, WeekPathCard
      CompletionSummary.tsx       <- pos POST .../complete (reforco diario/semanal, se houver); resumo real +
                                   badge "Conceito Dominado" (aprovacao >= 90%) + "Refazer este dia" desde a Fase 9;
                                   "+N 💎" discreto quando `gemsEarned > 0` (Fase 14 - texto pequeno,
                                   sem popup/confete, alinhado ao minimalismo do produto); troca pra
                                   "🎯 Bonus de Superacao: +N 💎" quando `wasReinforcementBonus` (Fase 15)
      ErrorBoundary.tsx            <- class component, pega excecoes de render (Fase 10) - montado em App.tsx
      publication/
        PublicationModal.tsx          <- modal de publicacao publica (Fase 11) - maquina de passo local
                                          (`Step`), 8 sub-componentes no mesmo arquivo (os 9 arquivos
                                          sugeridos no prompt viraram 1 - ver resumo da fase)
      errors/                       <- telas de erro (Fase 10)
        ErrorLayout.tsx                <- chrome compartilhado (icone/legenda/titulo/descricao/CTAs)
        EmptyStateError.tsx             <- dado carregado com sucesso mas vazio (nao e erro de rede)
        NoConnectionError.tsx            <- fetch falhou de verdade (TypeError/offline)
        TimeoutError.tsx                  <- AbortSignal.timeout() disparou
        GenericError.tsx                   <- 5xx/404/excecao inesperada - tambem usado pelo ErrorBoundary
        ApiErrorScreen.tsx                  <- dispatcher: escolhe a tela certa a partir de ApiFailure.type
      Layout.tsx                  <- Centered (o PageShell saiu na Fase 74)
      PixelPage.tsx               <- Fase 74 - PixelPageHeader ("‹ Voltar pra trilha" + rotulo) e
                                   PixelPanel ("// ROTULO" com borda de 2px), das telas internas
```

Roteamento exatamente como documentado (nao espelha as rotas REST da Api, que sao um recurso
diferente - ver "Rotas da Api nao espelham as rotas do frontend" na Fase 2):

| Rota | Consome | Tela |
|---|---|---|
| `/` | `GET /api/auth/me` (via AuthProvider) | `SplashPage` (Fase 12) - decide entre `/login` e `resolveLandingPath(user)` (Fase 13b) |
| `/login` | `POST /api/auth/register` ou `/login` | `LoginPage` (Fase 12) - abas Entrar/Criar Conta; `?ref=CODIGO` (Fase 17) pula pra Criar Conta com o codigo pre-preenchido |
| `/esqueci-senha` | `POST /api/auth/forgot-password` | `ForgotPasswordPage` (Fase 41) - fora do `<ProtectedRoute/>` |
| `/redefinir-senha?token=` | `POST /api/auth/reset-password` | `ResetPasswordPage` (Fase 41) - fora do `<ProtectedRoute/>`, token vem da query string (link do email) |
| `/onboarding` | `PUT /api/users/me/profile` (so no "Pular tour") | `OnboardingWelcomePage` (Fase 13b) - passo 1/3 |
| `/onboarding/perfil` | `PUT /api/users/me/profile` | `ProfileInterviewPage` (Fase 13b) - passo 2/3, Entrevista de Perfil. `?edit=1` (Fase 18) - mesma tela em modo edicao, pre-populada, volta pro `/perfil` |
| `/selecionar-curso` | `GET /api/courses/available` + `POST /api/enrollments` | `CourseSelectionPage` (Fase 13b) - passo 3/3; Fase 84: selo de recomendacao por cartao e ficha do curso (`CourseSheet`) antes da matricula |
| `/hoje` | `GET /api/today` | Daily ativa de hoje - **os 7 tipos de atividade implementados de ponta a ponta** (Reading/Video desde a Fase 7). Fora do shell `<App/>` da Fase 20 ate a 24 (full-bleed); dentro do shell de novo desde a Fase 25 (ganhou `GlobalNav`); contador de erros saiu do HUD fixo e virou badge no proprio `GlobalNav` desde a Fase 36 (`PenaltyHeaderBadge`) |
| `/hoje?daily=` | `GET /api/dailies/{dailyId}` | Mesma tela de `/hoje`, mas pra uma Daily especifica (Fase 4 - deep-link pra sessao de reforco; Fase 8: tambem usada como "reprise" de um dia ja concluido, clicado a partir da Visao Semanal) |
| `/start` (sem params, `?curso=` opcional) | `GET /api/courses` + `GET /api/courses/{id}` (cada curso) + `GET /api/users/me/gamification` + `GET /api/today?courseId=` e `GET /api/weeklies/{id}` do curso escolhido | `StartDashboard` (redesenhada na Fase 66; `WorldMapPage` da Fase 25 segue desativado) |
| `/start?course=` | `GET /api/courses/{courseId}` | `CourseDetailPage` (Fase 8) - trilha completa do curso; mapa da trilha em pixel art desde a Fase 65 |
| `/start?course=&caderninho=1` (ou `&tab=caderninho`) | `GET /api/courses/{courseId}/notes` + `.../notes/tags` | `NotebookPage` (Fase 65) - Caderninho em tela propria (antes aba da tela do curso) |
| `/start?course=&ranking=1` | `GET /api/courses/{courseId}/ranking?scope=` | `RankingPage` (Fase 16) - Score de Estudo, top 10 + posicao do usuario |
| `/loja` | `GET /api/marketplace/catalog` + `POST .../purchase`\|`/equip` + `POST /api/agent` | `MarketplacePage` (Fase 17; pixel art na Fase 71) - vitrine da semana + criador de agente |
| `/perfil` (`?tab=info`\|`customizacao`\|`conquistas`) | `GET /api/users/me/gamification` + `GET /api/marketplace/catalog` (+ `GET /api/courses`/`.../ranking` na aba Informacoes, `GET /api/users/me/badges`/`referral` na aba Conquistas) | `ProfilePage` (Fase 18) - 3 abas, ver secao "Perfil, 3 Abas" acima |
| `/conquistas` | - (so redireciona) | `<Navigate to="/perfil?tab=conquistas"/>` (Fase 18, era `AchievementsPage` na Fase 17 - mantido como redirect pra nao quebrar links/favoritos antigos) |
| `/start?course=&weekly=` | `GET /api/weeklies/{weeklyId}` (+ `GET /api/courses/{courseId}` pra modulo, navegacao, reforco por dia e trava da semana) | `WeeklyDetailPage` (Fase 8, pixel art na Fase 74) - trilha da semana + castelo do projeto |
| `/start?course=&weekly=&daily=` | `GET /api/dailies/{dailyId}` | Estado de uma Daily especifica (somente leitura) |
| `/start?course=&weekly=&project=1` | `GET /api/weeklies/{weeklyId}` | Projeto pratico da semana (`WeeklyProjectPage`, Fase 7 - submissao via `POST .../project/submit`) |
| `/admin/conteudo` | `GET /api/courses` | Autoria (Fase 6) - lista de cursos |
| `/admin/conteudo?course=` | `GET /api/courses/{courseId}/curriculum` (Fase 13b, era `GET /api/courses/{courseId}`) | Autoria - semanas (WeeklyTemplate) do curso |
| `/admin/conteudo?course=&weekly=` | `GET /api/weekly-templates/{id}` (Fase 13b, era `GET /api/weeklies/{weeklyId}`) | Autoria - lista + formulario de `CuratedContent` da semana (`POST`/`PUT /api/curated-content`, corpo com `weeklyTemplateId`) |

**Autenticacao no frontend (Fase 12):** `AuthProvider` (`contexts/AuthContext.tsx`) e a fonte
unica de "quem esta logado" - chama `GET /api/auth/me` uma vez no mount e guarda `user`/`isLoading`
em state; `SplashPage` e `ProtectedRoute` so leem esse mesmo state (nunca buscam de novo sozinhos).
Um 401 em `/me` (sem cookie/expirado) e o caminho **esperado** de "ninguem logado ainda" - vira
`user: null` silenciosamente, nunca um erro pra propagar (o contexto nao tem campo `error` de
proposito). `ProtectedRoute` envolve `/onboarding`, `/onboarding/perfil`, `/selecionar-curso`,
`/hoje`, `/start`, `/loja`, `/perfil`, `/admin/conteudo` (Fase 13b: as 4 primeiras ficam fora do
`<App/>` shell, sem o nav Hoje/Inicio/Conteudo - mesmo tratamento full-bleed de `LoginPage`/
`SplashPage`; `/hoje` entrou nesse grupo na Fase 20) - mostra um
spinner enquanto `isLoading`, `<Navigate to="/login"/>` se `!user`, `<Outlet/>` senao. Backend exige
`[Authorize]` em tudo isso desde a Fase 13a (ver "Autenticacao" acima). `LoginPage` redireciona pra
`/` (nao mais direto pra `/start`) se ja houver sessao - passa pela `SplashPage`, que roda o mesmo
`resolveLandingPath` (`lib/onboarding.ts`, Fase 13b: `!profileCompletedAt` -> `/onboarding`;
sem `Enrollment` (`GET /api/enrollments/me`) -> `/selecionar-curso`; senao -> `/start`) usado no
`onSuccess` de `LoginForm`/`RegisterForm` - nunca duas implementacoes da mesma decisao.

`TodayPage` (`/hoje`) chama `GET /api/today` (ou `GET /api/dailies/{id}` se `?daily=` estiver
presente) e, se `AccessMode` for `Start`/`Resume`, chama `POST .../start` antes de renderizar (a
Daily precisa estar `InProgress` pra aceitar respostas - `daily_nao_iniciada` senao).

**Maquina de passo (`Step`) - por que existe (Fase 4):** `TodayPage` nao re-deriva "o que
mostrar" a cada resposta recebida - ela mantem um `Step` "pinado" (`{kind:'activity', activityId}`
| `{kind:'done'}`) que so muda quando o usuario clica "Continuar". Sem isso, a ultima atividade da
sessao tinha o proprio reveal engolido - assim que a resposta era enviada e os dados atualizavam,
o componente pai ja trocava de tela antes do usuario conseguir ler "Acertou!"/"Errou" (bug
encontrado e corrigido durante a verificacao ao vivo desta fase). Cada componente de atividade
(`OptionsAnswer`, `WordMatchActivity`, `ClozeFreeTextActivity`, `RoleplayActivity`) recebe
`onDailyRefetched` (atualiza os dados) e `onContinue` (so chamado quando o usuario decide avancar)
como callbacks separados. Ate a Fase 21, `Step` tinha um terceiro caso (`{kind:'wordMatchGroup'}`)
so pra WordMatch, porque varias `DailyActivity` do tipo formavam 1 exercicio na tela mas
continuavam sendo N atividades separadas pro dominio - a Fase 23 (WordMatch = 1 unica
`DailyActivity` por grupo) removeu esse caso especial: WordMatch virou uma atividade comum como
qualquer outra no `Step`, e se um dia tiver mais de 1 grupo, cada um vira sua propria etapa
sequencial, sem logica extra em `TodayPage`.

**WordMatch, na tela (Fase 23):** cada `DailyActivity` do tipo WordMatch vira 1 tela de matcher de
2 colunas (`WordMatchActivity.tsx`) - termos a esquerda, definicoes embaralhadas a direita, ligados
por toque (tap-to-connect, nao drag-and-drop - ver nota no proprio arquivo pra o motivo). O botao
"Continuar" so aparece quando todos os pares estao ligados; a resposta e enviada de uma vez so
(`wordMatchMatches`). Se uma Daily tiver mais de 1 grupo de WordMatch (o molde de curadoria em
`secret/curadoria/CURADORIA.md` preve 3 grupos por dia), cada `DailyActivity` vira sua propria etapa
sequencial no `Step` - sem agrupamento especial, como qualquer outro tipo de atividade.

**Intro por atividade (Fase 9):** Quiz/Cloze/WordMatch/Roleplay mostram uma tela de intro
(`IntroCard`) antes da pergunta/desafio/cenario - `started` e um `useState` local em cada
componente (`QuizActivity`, `ClozeFreeTextActivity`, `RoleplayActivity`, `WordMatchActivity`),
**nao um passo novo no `Step` do `TodayPage`** - a maquina de estado nem sabe que a intro existe, a
atividade so vira "concluida" quando o usuario responde de verdade. Pula automaticamente pra quem
ja respondeu antes (`activity.responses.length > 0`), evitando reintro ao reabrir uma atividade ja
feita (ex: `/hoje?daily=` num dia passado).

**Estados de erro (Fase 10):** `useApiResource.error` e `TodayPage`'s error state sao um
`ApiFailure` classificado (`lib/apiError.ts`, `classifyApiError`) em vez de string solta -
`noConnection` (fetch lancou `TypeError`, ou `navigator.onLine === false`), `timeout`
(`AbortSignal.timeout()` disparou - rejeita com `DOMException` `name: "TimeoutError"`, **nao**
`"AbortError"`, que e so pra cancelamento manual), `serverError`/`notFound`/`generic` (`ApiError`
com `status` 5xx/404/outro). `components/errors/ApiErrorScreen.tsx` e o dispatcher: cada tela troca
`if (error) return <Centered text={error} .../>` por
`if (error) return <ApiErrorScreen error={error} onRetry={retry} />` - `retry` (`useApiResource`)
so incrementa um contador ja nas deps do efeito, refaz o fetch sem duplicar logica.
`components/errors/EmptyStateError.tsx` fica fora do dispatcher - nao e erro de rede/Api, e uma
condicao sobre dados carregados com sucesso (ex: `CourseDetailPage` sem semanas), quem chama decide
isso direto. `components/ErrorBoundary.tsx` (class component, montado em `App.tsx` ao redor do
`<Outlet/>`, `key={location.pathname}` pra resetar sozinho ao navegar) pega excecoes de **render**
que nenhum catch de fetch cobriria - mostra `GenericError`, caminho totalmente separado do
`ApiErrorScreen`. **Dois dos 4 links do Figma desta fase nao correspondiam ao nome do prompt**
("Sem Conexao" apontava pra uma tela de sessao expirada, "Erro Generico" pra uma tela de streak
perdido - nenhum dos dois foi construido, ver `docs/fase-10/resumo-implementacao-fase-10.md`).

**Sessao expirada: interceptor global de 401 (Fase 22).** Fecha a pendencia deixada pela Fase 10
(node Figma `13-978`, "Erro - Sessao Expirada") - so foi possivel agora porque login/JWT so
existem desde a Fase 12. `request()` (`api/client.ts`) e o unico ponto de entrada de toda chamada
de Api (ver "O contrato da Api" acima), entao e onde o interceptor mora: todo 401 com
`error === "nao_autenticado"` (o codigo que `JwtBearerEvents.OnChallenge` escreve no middleware,
ver "Autenticacao" acima) dispara um callback modulo-level - `setSessionExpiredHandler` - antes de
lancar o `ApiError` de sempre; quem fez a chamada continua tratando a falha exatamente como antes
(`useApiResource.error`, catch local), o interceptor so ADICIONA o aviso global, nunca substitui o
tratamento existente. `AuthProvider` (`AuthContext.tsx`) se registra nesse callback (unico
assinante) e guarda `sessionExpired` num state **separado** de `user` - de proposito: zerar `user`
desmontaria toda rota atras de `ProtectedRoute` (`<Navigate to="/login"/>`), perdendo a URL atual e
qualquer estado local em andamento (resposta ja digitada, audio ja gravado) - o objetivo desta fase
e o oposto disso. `SessionExpiredModal` (`components/auth/`) e montado como IRMAO de `children`
dentro do proprio `AuthContext.Provider` (nunca dentro de uma rota) - fica por cima de qualquer
tela sem afetar o React Router. Reaproveita `LoginForm` (Fase 12) tal qual, so com
`submitLabel="Retomar Sessao"` (prop nova, default inalterado) - reautenticar so chama
`AuthContext.login()` (atualiza `user`) e fecha o modal, nunca navega; a tela por baixo nunca foi
desmontada, entao nada se perde. Chrome de card modal (`fixed inset-0` + painel), no lugar do
`ErrorLayout`/`ApiErrorScreen` de tela cheia (Fase 10) - mesmo motivo ja documentado em
`PublicationModal` (Fase 11): `ErrorLayout` pressupoe `min-h-screen`, incompativel com sobrepor uma
rota que continua viva por baixo. **`GET /api/auth/me` no boot precisa de escape hatch**: um 401 ali
e o caminho ESPERADO "ninguem logado ainda" (ver `AuthContext.tsx`), nao sessao expirada de
verdade - `request(path, { skipAuthRedirect: true })` (novo, mesmo padrao de `timeoutMs`) e como
esse UNICO chamador se exclui do interceptor. **Sem retry automatico apos reautenticar** - decisao
deliberada: paginas que usam `useApiResource` ja tem "Tentar Novamente" (`ApiErrorScreen`, Fase
10); pra uma acao de escrita (submeter resposta) o usuario so precisa clicar em enviar de novo, o
que ja funciona porque o campo/audio nunca foi limpo - encadear um retry automatico exigiria uma
fila generica de "ultima acao que falhou" sem necessidade real pra isso.

**Modal de Publicacao Publica (Fase 11):** `PublicationModal` recebe `weeklyId`/`courseId`/
`onClose` (sem `onPublished` - ver "Bug real" abaixo) e gerencia sozinho uma maquina de passo
(`intro` → `linkedinDraft`/`githubSelect` → `linkedinEditor`/`urlSubmit` → `validating` →
`success`/`error`), mesmo padrao ja usado em `TodayPage` (Fase 4), so que a arvore inteira cabe
num unico componente porque nao e uma sequencia de N atividades. Erros de rede usam
`classifyApiError` (Fase 10) num bloco compacto, nao `ErrorLayout`/`ApiErrorScreen` (pressupoe
`min-h-screen`, incompativel com um card de modal); erro de **validacao** (URL invalida/repo
privado) e estado de dominio (`ModulePublicationDto.status === Failed`), tela propria, sem relacao
com erro de rede.

**Bug real: `onPublished` desmontava o modal antes do usuario ver o sucesso (Fase 11).** A
primeira versao de `WeeklyDetailPage` chamava `retry()` (`useApiResource`) dentro de um callback
`onPublished`, disparado *antes* do `PublicationModal` terminar de renderizar `SuccessStep`.
`retry()` seta `loading = true`, que faz `WeeklyDetailPage` retornar so `<Centered/>` - isso
desmonta o modal (e todo seu `step`) no meio do fluxo; o usuario nunca via "Publicado com
Sucesso!", so via o modal reabrir do zero em `'intro'`. Corrigido movendo o refetch pra `onClose`
(so quando o usuario decide sair do modal) - `onPublished` foi removido do componente por nao
sobrar nenhum uso real. Licao geral: **nunca dispare um refetch que muda `loading` do componente
pai enquanto um modal filho ainda esta no meio de mostrar seu proprio resultado.**

**Bug real: modal preso ao trocar de Weekly via "Proximo Modulo" (Fase 11).** `StartPage`
renderizava `<WeeklyDetailPage weeklyId={weeklyId} .../>` sem `key` - trocar a query string
(`?weekly=`) so muda props, nao remonta o componente, entao `showPublicationModal` (e o
`SuccessStep` da Weekly *anterior*) ficava aberto por cima da Weekly nova. Corrigido com
`key={weeklyId}`, mesmo padrao ja usado em `App.tsx` (`key={location.pathname}` no
`ErrorBoundary`, Fase 10) - **qualquer estado local que deveria resetar ao trocar de "entidade
exibida" via query string precisa de uma `key` que muda junto**, React nao remonta sozinho so
porque uma prop mudou.

**Timeout de requisicoes (Fase 10):** `api/client.ts.request()` usa `AbortSignal.timeout()` - 10s
por padrao (`DEFAULT_TIMEOUT_MS`), exceto `submitVoiceSummaryResponse` (95s desde a Fase 42, 70s
antes, `VOICE_SUMMARY_TIMEOUT_MS`) - o endpoint de audio transcreve e avalia por IA em sequencia no
backend (avaliacao virou 2 chamadas Groq na Fase 42, ver "Resumo falado por voz" acima pro
orcamento completo de timeout/retry); um timeout de cliente de 10s quebraria essa atividade toda
vez.

**Roleplay, na tela:** navega o grafo inteiramente no cliente (todos os `RoleplayNode`/
`RoleplayOption` ja vieram no `DailyActivityDto` inicial - nao ha ida-e-volta a cada escolha). O
node com `NodeKey === "start"` e a convencao adotada pro node inicial (nao ha campo `IsStart` no
dominio). So ao selecionar uma opcao que leva a um node com `IsTerminal = true` e que o frontend
chama `POST .../responses` com `SelectedRoleplayNodeId`.

**VoiceSummary, na tela (Fase 5):** `MediaRecorder` grava o audio do microfone - botao circular
central com glow (verde parado/hover, vermelho pulsante durante a gravacao), contador MM:SS,
limite de 10min (parada automatica + botao manual). Ao parar, envia o `Blob` gravado via
`multipart/form-data` pro endpoint de audio; mostra "transcrevendo e avaliando..." enquanto
espera, depois transcricao + feedback da IA + certo/errado, mesmo padrao visual dos outros tipos.

**Reading/Video, na tela (Fase 7):** telas proprias (`ReadingActivity`/`VideoActivity`), com um
chrome diferente do `ActivityScreen` centralizado das outras 5 - barra de progresso real
(`ETAPA {posicao} DE {total}`, calculada a partir de `daily.activities` ordenadas por
`OrderIndex`), sidebar "Material de hoje" (`MaterialSidebar`, filtrado pelos `ContentId` das
`DailyActivity` da Daily atual - `weekly.curatedContents` traz os 4 dias juntos, sem esse filtro
mostraria a semana inteira) e o orbe decorativo (`QuickQuestionOrb`) - chrome compartilhado via
`SessionShell.tsx`. `VideoActivity` embeda o YouTube de verdade (`youtube-nocookie.com`, a partir
de `CuratedContent.ExternalUrl`) - `rel=0`+`modestbranding=1` reduzem a interface do player ao
minimo que a API do YouTube permite sem uma integracao paga (nao remove 100% dos videos
recomendados no final). Concluir qualquer uma das duas so faz `POST .../responses` com corpo
vazio (Score sempre 100 no servidor, ver acima) e avanca - sem `FeedbackPanel`, ja que nao ha
gabarito pra revelar.

**Menu de configuracoes (Fase 7):** `SettingsMenu`, montado em `TodayPage` sobre a tela de estudo -
`backdrop-blur` nativo (sem borrar a arvore de tras manualmente). ESC e o botao "voltar" do
navegador, enquanto a sessao esta ativa (ha um `step` resolvido e a Daily ainda nao foi concluida
nesta visita), abrem o menu em vez de deixar o usuario sair - `useSessionExitGuard` (hook local em
`TodayPage.tsx`) empurra uma entrada de historico "sentinela" via `history.pushState` e a
"recusa" no `popstate`, porque o app usa `<BrowserRouter>` declarativo (nao `createBrowserRouter`),
que nao expoe `useBlocker`. Acoes reais: fechar (fecha o menu), "Sair e salvar progresso" (navega pra `/start` - o progresso
ja esta salvo a cada resposta enviada ao servidor, nao ha nada extra pra persistir) e, desde a
Fase 13, **"Sair da Conta"** (`onLogout` - `useAuth().logout()` + navega pra `/login`; pede
confirmacao via `window.confirm` antes, pra evitar logout acidental no meio de uma sessao de
estudo). O node do Figma pra este menu mostrava so "Fechar (ESC)"/"Sair da conta" (sem a opcao de
Fase 7) - as duas convivem, sao acoes diferentes (sair da sessao de estudo != sair da conta), e o
botao foi implementado como link de texto simples (nao o botao grande com preenchimento vermelho
do Figma) pra manter consistencia visual com os outros 2 links ja existentes nesse menu.
Aparencia/Som/Notificacoes/Limite de gravacao/Perfil e Analogias/Atalhos continuam placeholders
visuais, sem persistencia.

**Feedback unificado (Fase 7):** `FeedbackPanel`, usado pelos 5 componentes de atividade avaliada
(`OptionsAnswer`, `ClozeFreeTextActivity`, `RoleplayActivity`, `VoiceSummaryActivity`) no lugar do
bloco de "reveal" que cada um tinha por conta propria - gauge circular de `Score`, inset com a
resposta do usuario (so quando ha `transcript`), texto de `aiFeedback` (so quando existe) e uma
linha de detalhe especifica do tipo (`Resposta esperada`/`Qualidade do desfecho`, via a prop
`detail`). Nao reproduz a divisao em 2 colunas "o que acertou / onde melhorar" do design porque o
dominio so guarda `AiFeedback` como 1 string unica (`GroqContentEvaluationService`), nao uma lista
estruturada - sem mudar nenhum comportamento funcional dos 5 componentes, so a apresentacao final.
Permissao de microfone negada mostra uma mensagem clara **e mantem o botao disponivel** pra
tentar de novo (bug corrigido durante a verificacao ao vivo - a primeira versao escondia o botao
inteiro nesse estado, sem jeito de tentar de novo sem recarregar a pagina).

**`/admin/conteudo`, autoria de conteudo curado (Fase 6):** tela de bastidor, sem autenticacao,
mesmo padrao funcional (nao visual) de `/start` - ramifica por query string (`?course=`,
`?weekly=`), reaproveitando os mesmos endpoints de leitura que `/start` ja consumia. Lista o
`CuratedContent` da semana com indicador Completo/Pendente (`externalUrl || bodyText` preenchido)
e um formulario unico que cria (`POST`) ou edita (`PUT`) dependendo se um item da lista esta
selecionado - `Type` so e editavel na criacao (nunca muda depois, regra que ja existia no
backend desde a Fase 4). Existe porque a curadoria de leitura/video (ao contrario da estrutura
Course/Monthly/Weekly/Daily, que muda raramente e continua so via seed) se repete toda semana -
ver `docs/fase-6/resumo-implementacao-fase-6.md`.

**`/start` continua funcional mas sem o mesmo polimento visual das telas de atividade** - decisao
da Fase 3, ainda valida (so as telas de `/hoje` precisavam estar "as mais validadas no Figma").
`/admin/conteudo` segue o mesmo padrao de "funcional, nao o mesmo nivel de `/hoje`".

Paleta (Tailwind v4, tokens em `@theme` dentro de `index.css`, sem `tailwind.config.js`):
`--color-base` (`#0A0A0A`), `--color-surface` (`#151515`), `--color-surface-alt` (`#1E1E1E`,
"surface-raised" no Figma - fundo de pilulas/linhas elevadas), `--color-stroke` (`#2A2A2A`, Fase
19 - borda de cards/inputs, distinto de `surface-alt` mesmo sendo um cinza proximo), `--color-accent`
(`#39FF6A`), `--color-alert` (`#FF3B3B`), `--color-primary`/`secondary`/`muted`
(`#F5F5F5`/`#9A9A9A`/`#5C5C5C`), `--color-project` (`#FFB800`, Fase 7 - tema ambar de Projeto
Semanal, reaproveitado no badge "Roleplay de Decisoes" desde a Fase 19). Tons translucidos de
"preenchimento" (selecionado-mas-nao-confirmado no Quiz, gauge de Score no FeedbackPanel) usam
`bg-accent/25`/`bg-project/15` (opacidade Tailwind) em vez de token proprio - aproximam o
"neon-green-dim" (`#1F5C33`) do Figma sem inventar mais uma cor fixa pra um uso so de translucidez.

Fontes: `--font-sans` (Inter, Fase 19 - default do app inteiro, nenhuma tela tinha fonte propria
antes), `--font-display` (Archivo) e `--font-mono` (Fira Code) - os 2 ultimos escopados so a
elementos explicitos do Login/Registro (Fase 18), nao o default. Todas carregadas via Google Fonts
(`@import url(...)` no topo de `index.css`, antes de `@import "tailwindcss"` - ordem exigida por
CSS).

**`cursor: pointer` em `<button>` (Fase 34):** o Preflight do Tailwind v4 nao da isso a `<button>`
de graca (so `<a href>` ja vem assim do proprio navegador) - como boa parte do app usa `<button>`
estilizado como link/acao (`text-accent hover:underline`, abas, "Fechar (ESC)", etc.), ficavam com
o cursor de seta padrao apesar de clicaveis. Regra global em `index.css`
(`button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }`, dentro de `@layer
base`) resolve pro app inteiro de uma vez - nenhum componente precisou de `cursor-pointer`
manual. `:not(:disabled)` preserva o cursor default nos botoes desabilitados (`disabled:opacity-40`).

### Casca global sem rolagem externa (Fase 67)

A partir de `lg`, `App` tem a altura exata da janela (`flex min-h-dvh flex-col lg:h-dvh`) e o
conteudo de toda rota do shell fica num `<main className="flex flex-1 flex-col lg:min-h-0
lg:overflow-y-auto">`. Consequencias:

- **Tela sem rolagem externa** (trilha, Projeto Semanal, start): raiz com `lg:min-h-0 lg:flex-1
  lg:overflow-hidden` e os cartoes rolando por dentro com `ScrollArea` (abordagem da Fase 61).
  Nenhuma tela desconta mais `--nav-height` (so o `GlobalNav` le essa variavel).
- **Tela ainda nao adaptada** rola dentro do `<main>`, nunca a janela, no desktop.
- **`PageShell`** saiu na Fase 74: Certificacoes e Caderninho, as ultimas telas nele, viraram pixel art
  com as mesmas margens do Ranking e da visao da semana (`PixelPageHeader` + colunas com `ScrollArea`).
- **Abaixo de `lg`** a janela volta a rolar (`min-h-dvh`, sem altura fixa) - rolagem interna no
  celular atrapalha a barra de endereco.
- `min-h-screen` das telas da sessao diaria (`SessionShell`, `IntroCard`, `CompletionSummary`,
  `ActivityScreen`, `Centered`, `ErrorLayout`) ainda nao foi trocado - passam da altura do `<main>`
  pelo tamanho do nav e rolam nele; sao tratados tela a tela (ver `docs/fase-67/`).

**Telas baixas e desktop estreito (ajuste da Fase 72, pedido do dono: "evitar ao maximo o scroll
vertical").** `index.css` define as variantes `short:` (janela abaixo de 880px de altura) e `tight:`
(abaixo de 760px), usadas sempre junto com `lg:`. Elas compactam espacamento, fontes e sprites (2x no
lugar de 3x nos cartoes da Loja e no podio do Squad, calendario do Perfil em 1 linha, microfone e
enunciado menores no Resumo Falado). Entre 1024 e 1279px as colunas laterais afinam: sessao 208px
em vez de 256px, Projeto Semanal 210px em vez de 250px, Loja 240px/208px, margem lateral 32px em vez
de 64px. A regra: o layout cabe na janela, e so conteudo de tamanho livre rola dentro do proprio
cartao (texto da Leitura, especificacao do projeto, feed do squad, lista de dias da semana, tabela de
certificacoes). Conferido com Playwright no mock em 1440x900, 1366x768, 1280x720 e 1024x768: nenhuma
tela rola a pagina, e o unico layout que ainda passava era o Resumo Falado com enunciado longo (15px).
A visao da semana ganhou a mesma casca e, na Fase 74, o redesenho em pixel art (ver "Visao da semana
em pixel art (Fase 74)"). A Fase 74 tambem criou a variante `tall:` (janela com 960px de altura ou
mais), pra cartoes extras que so cabem em tela alta. No QG do Squad, o lider gerencia o top 3 pelo "⋯" no nome do
podio (a lista nao repete mais o top 3).

### Ponte "code comigo" na sessao (Fase 79)

Figma "Ponte: code comigo — v2 (proposta)" (01 escrevendo `171:4503`, 02 ajuste isto `172:5517`, 03 passou
`172:6556`, 04 solucao `172:7595`, 05 concluida `173:8140`). `CodeStepActivity` na mesma casca da sessao:
pedido do passo, editor (Fira Code, numeros de linha continuando do script, Tab indenta, Ctrl+Enter envia)
com o script dos passos anteriores dobrado no topo (`codeStep.priorCode`), e o campo da saida do terminal;
rascunho no `localStorage` por passo. "Ajuste isto" (Focada em ambar, "Editar ›"), "Passou" (verde,
"Proximo passo ›") e, na ultima tentativa, a solucao + a saida esperada ("Seguir ›"). Cada passo e um no
da cadeia (`sessionStages` nao agrupa `CodeStep`; rotulos "Exemplo", "Passo N" em `stageLabel`), o
conta-giros vira `AttemptsGauge` ("Tentativas do passo") enquanto a etapa e um passo, o "Material de hoje"
ganha "Arquivo da ponte" com "Baixar ↓" (conteudo `File`). A conclusao da ponte conta passos e solucoes
vistas, oferece o repositorio opcional ("Linkar") com "Ver meu codigo"/"Copiar" (`bridgeScript`) e leva
pro projeto. Linguagem vem de `weekly.project.language`. Celular funciona (sem rolagem lateral), mas o
desenho proprio fica pra depois. Mock: `/__mock/reset?at=codigo&passo=N` (Semana 1 em Python, avaliacao
falsa: passa quando a saida colada tem as linhas esperadas; `passo=8` = tudo feito).

### Codigo formatado no chat rapido (Fase 80)

`ChatMessageText` (components/assistant) renderiza as mensagens do "Tira duvidas": bloco cercado vira quadro
monoespacado que quebra a linha mantendo a indentacao (a coluna tem ~200px) e crase simples vira codigo
inline, via o mesmo `splitFences` da leitura. Bolha com bloco ocupa a largura da coluna. O prompt do
`GroqStudyAssistantService` pede crase/bloco com a linguagem pra codigo. Na ponte (Daily original com
`DayNumber` multiplo de 6) o `SessionShell` liga `setStudyAssistantCodeBridge` e o chat manda `codeBridge`.

### Revisao por IA do Caderninho (Fase 78)

Figma "Caderninho: revisao por IA — v2 (proposta)" (`166:4503`...). "Revisar com a IA" por dia com nota
(Daily original ou reforco; projeto nao) no `NotebookPage`; cartao `NotesReviewCard` (bom / falta / confere
com o material, "nao vale nota"). `ReviewDailyNotesUseCase` junta as notas do dia e o material
(`NotesReviewRules.Material`: leituras + pedidos de resumo falado da Daily, ou da de origem no reforco) e chama
`INotesReviewService` (`GroqNotesReviewService`, JSON mode, formativo: nao reescreve nem entrega a resposta).
Cada revisao vira uma linha em `NotesReviews`; a tela mostra a mais recente, `upToDate` compara o hash das
notas (`NotesReviewRules.Hash`) e libera "Revisar de novo". Limite `NotesReviewRules.DailyLimit` = 10 por dia
(provisorio ate o orcamento de IA). Mock: `/__mock/caderninho` (resposta fixa), `?vazio=1`.

### Squad com pedidos de entrada (Fase 77)

Figma "Squad: pedidos de entrada — v2 (proposta)" (`162:4503`...). O codigo de convite vira um
`SquadJoinRequest` (Pending/Accepted/Rejected/Cancelled/RejectionUndone) que o lider ou o colider decide;
recusado nao pede de novo pro mesmo squad ate alguem desfazer; vence em 7 dias (`IsOpen`, na leitura);
1 pedido aberto por pessoa (pedir pra outro squad ou criar um cancela o anterior). Regras puras em
`SquadJoinRules`. Front: abas "Atividades | Notificacoes" no `SquadFeed` (prop `notifications`, so
lider/colider, conteudo em `SquadRequests.tsx`), "Pedido enviado"/recusado no `NoSquadView`, contador no
Squad do `GlobalNav` (`GET /api/squads/me/requests/count`, rebuscado a cada tela e pelo evento
`lib/squadRequestsEvents.ts`). Mock: `/__mock/squad?as=lider`, `?as=nenhum&pedido=pendente|recusado`.

### A Focada no Ranking, no Perfil e no QG (Fase 76)

Figma "Focada nas telas — v2 (proposta)" (`159:4503`...). Uma fala por tela, a primeira situacao
verdadeira, em `lib/focadaScreenLines.ts`: **Ranking** no alto do podio (`PodiumPanel.focada`; substituiu a
nota "Score mede qualidade"), **Perfil** no alto do palco (`AgentStage.focada`; a `ProfilePage` tambem busca
o `study-calendar` pra saber se o aluno estudou hoje), **QG** na coluna da meta (`WeeklyGoal`, `FocadaSays`
tamanho `xs`; sairam "Faltam N", "N de M estudaram hoje" e a linha da recompensa em Gems) e **sem squad** no
lugar do texto do QG vazio. No podio e no palco a fala some em `lg:tight:`. O **mapa** fala
`publicacaoPendente` com a semana esperando a publicacao, e cada curso pode trocar qualquer fala com
`assets/mapa/<curso>/falas.json` (`findCourseMapLines`, copiado da curadoria pelo `exportar-frontend.js`).

### Guia das telas (Fase 75)

Desenho aprovado no Figma "Focadu — Pixel Art", pagina "Guia das telas — v2 (proposta)" (`151:4502`),
decisoes em `secret/rascunhos/guia-das-telas-faq.md`. Tudo montado 1x pelo `GuideProvider`
(`contexts/GuideProvider.tsx`, dentro do `SettingsProvider` em `main.tsx`), como irmao das rotas:

- **Botao "?"** (`components/guide/HelpButton.tsx`, sprite `assets/pixel/ajuda.png`): fixo no canto de
  baixo em toda tela que o guia conhece - dentro do app e fora (login, senha, onboarding); na sessao no
  celular sobe acima da barra de ferramentas. Tecla `?` abre/fecha (fora de campo de texto).
- **Janela** (`GuideModal.tsx`, sobre o `PixelModal`): "Esta tela", "Perguntas frequentes" (so dentro
  do app) e "Achou um problema?" (resumo da tela + formulario do teste fechado no Tally, com os campos
  ocultos `tela`, `endereco`, `navegador`, `tamanho`, `hora`; `REPORT_FORM_URL` = `https://tally.so/r/0QX9VB`
  desde 27/09/2026, vazio = so copiar).
- **Conteudo** em `lib/guiaTelas.ts`: `GUIDE_SCREENS` (fala da Focada + itens por tela),
  `SESSION_STEP_ITEMS` (item da etapa em tela na sessao, contado pelo `SessionLayout` via
  `useGuide().setSessionDetail`), `FAQ`, `APP_TOUR` e `guideScreenFor(pathname, search)` (as sub-telas de
  `/start` vivem na query string). **Mudou uma tela? Atualize o guia dela ali.**
- **Tour** (`TourOverlay.tsx`): escurece a tela com recorte no elemento `[data-guia="..."]` visivel do
  passo (`lib/guideAnchors.ts`) e mostra a Focada; espera o elemento ate 2,5s, passo sem elemento vira
  balao no centro. Esc pula, setas/Enter andam. O **tour do app** roda no 1o acesso ao start (depois do
  onboarding) e navega por Inicio, trilha, perfil, squad, loja e ranking, terminando no "?". O **tour da
  tela** ("Tour desta tela" na janela) destaca os itens de "Esta tela" que tem elemento visivel.
- **Ja visto** fica no servidor: `User.SeenGuides` (`tour:app`, `tela:<tela>`), no `UserDto`, marcado por
  `POST /api/users/me/guides/{key}/seen`. A 1a visita a cada tela (depois do tour do app) faz o botao
  piscar com a dica uma vez (conta como vista ao abrir o guia ou apos 7s).
- **Ancoras**: `data-guia` nos elementos destacados; `ScrollArea` e `PixelPanel` aceitam a prop `guia`.
- **Mock**: `/__mock/guia?tour=1` zera tudo (tour do app de novo); `/__mock/guia` zera so as 1as visitas.

### Visao da semana em pixel art (Fase 74)

Desenho aprovado no Figma "Focadu — Pixel Art", pagina "Visao da semana — v2 (proposta)" (`137:5236`:
semana em andamento `137:5237`, semana fechada com publicacao pendente `138:6537`, celular `138:8081`,
notas `138:92002`). `/start?course=&weekly=` (`routes/WeeklyDetailPage.tsx`):

- **Trilha da semana em pe (`components/week/WeekTrail.tsx`)**: os dias (sem os de reforco) como
  linhas com os sprites de ponto do mapa (`assets/pixel/mapa/ponto-*`), ligadas por uma linha vertical
  verde ate o ultimo dia concluido. Dia concluido: aprovadas/total, erros (`penaltyPoints`) e check; dia
  em andamento: destaque verde, barra de etapas (`SegmentedBar`) e "Continuar"; proximo dia: "Entrar";
  o resto trancado. O 6º dia da semana leva o selo PONTE (so pela posicao, o DTO nao marca a ponte).
  Reforco pendente vira selo no dia de origem, com link pra sessao de reforco (vem de
  `WeeklyOverviewDto.days[].reinforcementDailyId`, do `GET /api/courses/{id}`). A linha inteira e um
  link pra `/hoje?daily=` (menos trancada). O castelo do Projeto Semanal fecha a lista (BOSS, estado
  trancado/aberto/em avaliacao/avaliado com a nota); trancado continua levando a tela do projeto pra
  ler o briefing (decisao do dono). Semana trancada (`WeeklyOverviewDto.isLocked`) tranca todos os dias.
- **Cabecalho**: "Semana NN · Modulo N · titulo do modulo", o tema em VT323 grande e ‹ Semana anterior
  / proxima › (a proxima fica apagada se trancada).
- **Publicacao do modulo pendente**: faixa ambar acima da lista com "Publicar agora" (abre o
  `PublicationModal`, pixel art desde 24/09); nesse estado as linhas ficam compactas (`compact`).
- **Coluna lateral**: a Focada (`buildFocadaWeekLine` em `lib/focadaMapLines.ts` - as falas do mapa
  olhando so a semana + 3 novas: publicacao pendente, semana fechada, semana trancada), Resumo da
  semana (dias em blocos, aprovacao sobre o que ja foi respondido, erros, nota do projeto, aviso de
  revisao semanal com a contagem de dias fracos), certificacoes do modulo ("cobre topicos", nunca
  "equivalente") e "Como a semana fecha" (so com a semana aberta e em tela `tall:`).
- **Layout**: sem rolagem de pagina a partir de `lg`; a trilha e a coluna lateral rolam por dentro se
  nao couberem. No celular empilha e a Focada vai pra antes da lista.
- **Mock**: `/__mock/semana?estado=andamento|publicacao|trancada` (Semana 2; trancada abre a 3), servido
  por `GET /api/weeklies/w-N` no `mock/sessionMock.ts`.

Saíram (sem outro uso): `WeeklyProjectCard`, `WeeklyReinforcementBadge` e `ProgressBar`.

### Certificacoes, Caderninho e telas fora do app em pixel art (Fase 74)

Desenhos aprovados no Figma "Focadu — Pixel Art": pagina "Certificacoes + Caderninho — v2" (`142:5236`)
e "Entrada e onboarding — v2" (`144:4502`). Com eles, o plano `telas-pixel-art-antes-da-0-1-0.md`
fecha: nenhuma tela ativa usa mais o estilo antigo (a unica que sobra e o `WorldMapPage`, desativado
desde a Fase 25).

- **Certificacoes** (`routes/CertificationsPage.tsx`): matriz modulo × certificacao (check = cobre e ja
  estudado, escudo = cobre e pela frente, "—" = nao cobre); clicar numa celula mostra o
  `coveredDomains` embaixo. Modulo "estudado" = `isMonthlyComplete`; "estudando" = ja tem Daily feita ou
  vem logo depois de um estudado. A esquerda, "Ao seu alcance" (modulos estudados / modulos que cobrem
  cada exame) e a Focada. No celular a matriz rola na horizontal.
- **Caderninho** (`routes/NotebookPage.tsx`, o `NotebookTab` saiu): filtros a esquerda (busca, periodo
  e tags em chips - clicar de novo solta), notas agrupadas por dia (ponto) ou projeto (castelo) com o
  Markdown em `PIXEL_PROSE`, e a direita a Focada + resumo (notas, dias com nota / dias do curso, tag
  mais usada - da lista sem filtro).
- **Fora do app**: Splash, Login/Criar conta (apresentacao + agente do kit basico a esquerda a partir de
  `lg`), Esqueci/Redefinir senha, Boas-vindas (a Focada e os 3 pilares), Entrevista (chips) e Escolha
  do curso ("save slots"). Pecas em `components/entry/Entry.tsx` e `components/auth/PixelFields.tsx`.
- **Celular**: menu suspenso do `GlobalNav` em pixel art (hamburguer em blocos, item atual em destaque)
  e a trilha em lista (`WeekSummaryCard`) com os pontos do dia, o castelo e o status.
- **Sobras**: `StatusBadge`, `GemBadge`, `StreakIndicator`, avatar de iniciais, seletor de linguagem do
  Projeto Semanal e `Centered` em pixel art; variantes antigas de `QuickNotePanel`/`StudyAssistantPanel`
  removidas; `/start?...&daily=` (recapitulacao sem nenhum link) redireciona pra `/hoje?daily=`.
- **Mock**: `/__mock/caderninho` (notas de exemplo), `/__mock/sair` (sem sessao, abre `/login`),
  `/__mock/onboarding` (perfil sem entrevista); o detalhe do curso ganhou certificacoes de exemplo.

### Sessao diaria em pixel art (Fase 68)

Desenho aprovado no Figma "Focadu — Pixel Art", pagina "Daily — redesign proposto" (node `61:4502`,
18 telas + notas de UX). Tudo que `/hoje` mostra roda dentro da mesma casca:

- **`SessionLayout` (`components/SessionShell.tsx`)** le do `SessionContext` (`lib/sessionContext.ts`,
  fornecido pela `TodayPage`) a Daily, a Weekly (buscada 1x por sessao - antes cada atividade
  buscava de novo), a etapa em tela, `onBack` e `goToActivity`. Monta: topo (voltar pro mapa, "DIA N ·
  titulo do material", semana, `ErrorGauge` = conta-giros que saiu do menu), 3 colunas a partir de `lg`
  (Material + Pomodoro | cartao | Anotacao + Suporte Rapido, colunas com `ScrollArea` proprio) e o
  cartao central: rotulo "ETAPA N DE M — TIPO" + contador fino, `StageChain` (atividades agrupadas em
  blocos consecutivos do mesmo tipo/modo, `lib/sessionSteps.ts`), conteudo num `ScrollArea` e rodape
  fixo. Conteudo de qualquer profundidade manda botoes/fala pro rodape via `<SessionFooter>` (portal
  no `SessionFooterContext`). Sem rolagem externa a partir de `lg` (medido 1440x900 e 1280x720 em
  todas as etapas); abaixo de `lg`, 1 coluna e gaveta fixa no rodape (Material, Notas, Duvida,
  Pomodoro) - colunas OU gaveta, nunca as duas (`useIsDesktop`), pra nao duplicar estado.
- **A Focada** (`session/FocadaSays.tsx`, estatica, sem digitacao) apresenta cada bloco
  (`session/BlockIntro.tsx`, substitui o antigo `IntroCard`), reage no rodape a acerto/erro
  (`FeedbackPanel` redesenhado, "erro N de 3"; no erro que completa o conta-giros avisa que o
  reforco foi criado) e da o feedback da IA do Resumo Falado. Falas padrao por situacao em
  `lib/focadaSessionLines.ts` (curadoria nao precisa escrever).
- **Telas de estado** (`session/SessionScreens.tsx`): tudo respondido, sessao de hoje ja feita
  (contagem ate meia-noite + reforco pendente), semana esperando o castelo, recusa 409 (sem casca,
  nao ha Daily). `CompletionSummary` (cartoes de gemas/streak/acertos/erros) e
  `ReinforcementIntroScreen` (cartao vermelho, +2 do Bonus de Superacao) tambem na casca.
- **Atalhos** (`lib/useSessionKeys.ts`): 1-N escolhem opcao (Quiz, Lacuna de multipla escolha,
  Roleplay), Enter confirma/continua/comeca; ignorados em campo de texto e em botao/link focado (o
  navegador ja clica - senao "Continuar" pularia 2 etapas).
- **Fonte**: tudo em VT323/Silkscreen, inclusive o texto curado da Leitura e a especificacao do
  Projeto Semanal (`lib/pixelProse.ts`, por seletor no pai - MarkdownBlock/DiagramBlock seguem em Inter
  no Caderninho).
- **Material de hoje**: clicar num item nao abre mais previa (`ContentPreviewModal` removido) - a
  Focada pergunta (`PixelConfirmDialog`) se o aluno quer voltar pra etapa daquele conteudo. So pra tras
  (conteudo ja concluido), nunca gravando, nunca no reforco (ele nao tem Leitura/Video).
- Removidos: `PenaltyHeaderBadge`, `PomodoroHeaderBadge`, `lib/dailyPenaltyContext.ts`, `IntroCard`,
  `useMaterialSidebar`, `ContentPreviewModal`, `StudyAssistantWidget`/`QuickQuestionOrb`, `ActivityScreen`
  (`Layout.tsx`). `CodeHighlight` virou `activities/ClozeSentence.tsx`.
- **Telas de erro** (`errors/ErrorLayout.tsx`): pixel art, a Focada explica (textos na voz dela), altura
  = abaixo do menu. **Projeto Semanal**: caixa "Avaliacao do castelo", entrega e o cartao de
  especificacao (semanas sem briefing) em pixel art.
- **Mock de desenvolvimento**: `npm run dev:mock` (porta 5199, `vite.mock.config.ts` +
  `mock/sessionMock.ts`) responde `/api/*` em memoria com o Dia 1 real da curadoria - nunca fala com
  producao, nunca entra no build. Cenarios por `/__mock/reset?...` (etapa, erros, bloqueado, semana,
  reforco, projeto) e erros em `/start?course=erro-500|erro-offline|erro-lento` - lista no topo do
  arquivo.

### Identidade pixel art (Fase 64)

Fonte da verdade: Figma "Focadu — Pixel Art" (`iNwXFcYXDajxkkhmyEr1gd`) - paleta fechada
("Pixel palette", 11 cores dos tokens + tons de contorno), guia de 7 regras (grade 16/32, contorno
colorido nunca preto, luz de cima-esquerda, max. 3 tons por material, glifo de UI em 1 tom...),
componentes `sprite/*`, pagina "Logo", "Focada — esboço" e o kit `textbox/focada`.

- **Sprites:** `frontend/src/assets/pixel/*.png`, 16x16 (1x), sempre com `className="... pixelated"`
  (`@utility pixelated` = `image-rendering: pixelated`) e so em tamanhos multiplos de 16px. Trocaram
  os PNGs antigos (`assets/icons`, `reading/play-*`, `project/*`, apagados) e os emojis de bloqueio
  (🔒), certificacao (🛡️), conquistas do perfil (🎓🤝👑) e medalhas do ranking (🥈🥉). `StatusBadge`
  troca `✅`/`🔒`/`🛡️` sozinho (`ICON_OVERRIDES`).
- **Logo:** wordmark pixel FOCADU em que o "O" e uma mira de autofoco com cursor verde
  (`assets/pixel/logo-wordmark.png`, 35x7) - no centro do `GlobalNav` no lugar do antigo "START".
  Favicon (`public/favicon.svg` + `favicon-32.png` + `apple-touch-icon.png`) = o simbolo sobre fundo
  `#0a0a0a`.
- **Menu:** os 5 itens do `GlobalNav` viraram sprites (calendario, mapa, loja | podio, squad), com
  o nome em `sr-only` + tooltip; esquerda = modo solo (Hoje/Trilhas/Loja), direita = multiplayer
  (Ranking/Squad).
- **Cursor do mouse:** mira aberta no padrao e travada em tudo que e clicavel
  (`public/cursor/mira(-travada)(@2x).png`, so com `pointer: fine`, campos de texto mantem o I).