# Resumo — Fase 25 (Parte A): Mapa do Mundo (Navegação)

## O que foi implementado

- **Novo hub de entrada em `/start` (sem query string)**: `WorldMapPage` substitui o antigo
  `StartDashboard` (cards). Renderiza o mapa top-down fornecido pelo Falves
  (`assets/world/mapa-vilarejo.png`, 2304x1296, arte pixel de um vilarejo com "FOCADU" já
  plotado na praça central) com um personagem controlável via setas/WASD.
- **Movimento do personagem** (`useWorldMovement.ts`): loop `requestAnimationFrame` + teclado
  (keydown/keyup, sem lib externa - mesmo princípio de "sem dependência extra" já usado no client
  HTTP do projeto). Velocidade constante (260px/s no espaço de pixels da imagem), diagonal
  normalizada (não anda mais rápido que reto), personagem vira de direção (up/down/left/right)
  conforme a última tecla pressionada. **Sem colisão contra prédio** - decisão explícita da fase,
  o personagem pode sobrepor visualmente uma construção; só as trigger zones das portas importam.
- **5 trigger zones** (`worldConfig.ts`) ligam construções do mapa às telas reais que já existiam
  antes desta fase - nenhuma tela nova foi criada, só a navegação até elas mudou:

  | Construção no mapa | Destino |
  |---|---|
  | Torre (topo-esquerda) | `/hoje` |
  | Castelo (topo-direita) | `/start?course=` (Trilha do Curso - Ranking continua ancorado lá dentro) |
  | Casinha (baixo-esquerda) | `/perfil` |
  | Celeiro/fazenda (baixo-direita) | `/loja` |
  | Campo de treino (topo-centro) | `/perfil?tab=squad` |

  Cada zona é um círculo (centro + raio) no espaço de pixels da imagem original - o personagem
  entrando nele dispara `navigate()` exatamente 1 vez (guard por id da zona, não repete a cada
  frame enquanto o jogador fica parado em cima).
- **HUD sobreposto**: `GemBadge`/`StreakIndicator` (Fase 14, componentes reaproveitados sem
  alteração) no canto superior esquerdo, mesma fonte de dado (`GET /api/users/me/gamification`)
  que o `StartDashboard` usava. Botão "Ajustar zonas" no canto superior direito - ferramenta de
  calibração (mostra os 5 círculos das trigger zones + coordenada atual do personagem em tempo
  real), não é feature do produto.
- **Guarda de "sem matrícula ainda" preservada**: mesmo critério do `StartDashboard`
  (`error.code === 'nenhuma_matricula_ativa'` vindo de `GET /api/today`) renderiza
  `EmptyStateStartPage`, sem duplicar lógica.
- **Personagem placeholder**: `PlayerSprite.tsx` é só uma bolinha (cor `--color-accent`) + sombra
  + uma cunha indicando a direção - sem asset de personagem de verdade ainda (ver "Dúvidas"
  abaixo). Trocar por spritesheet real é substituir só o conteúdo interno deste componente, a
  lógica de posição/movimento não muda.
- **Mapa full-bleed** (ajuste pedido depois do 1º teste ao vivo): `/start` sem params saiu do
  shell `<App/>` no roteador - mesmo tratamento que `/hoje` já tinha desde a Fase 20. `App.tsx`
  ganhou `children` opcional (continua servindo de shell via `<Outlet/>` quando usado como layout
  de rota, mas agora também aceita ser chamado manualmente); `StartPage` decide caso a caso, só a
  `WorldMapPage` fica sem o shell. CSS de "contain" (aspect-ratio + max-width/max-height cruzados)
  garante que o mapa preenche o máximo da tela em qualquer proporção de janela sem esticar -
  testado em 16:9 exato (preenche 100%), janela mais larga (pillarbox) e mais alta (letterbox).
- **Letreiro sempre visível em cada casa** (`HouseLabel.tsx`, pedido do Falves): só o título
  ("Hoje"/"Trilha do Curso"/etc.), sempre ligado (não só no modo "Ajustar zonas") - indica pro
  jogador o que tem ali antes de precisar chegar perto. Posição derivada direto da trigger zone
  (`x` igual, `y` = topo do círculo + gap fixo) - fica logo acima da porta de verdade, não perto
  do telhado. Fonte 25% maior que a 1ª versão (pedido explícito: 11px -> 13.75px).
- **Menu global único** (`GlobalNav.tsx`, pedido do Falves - "refatorar o header de todas as
  seções... um menu único que é possível navegar por tudo"): substitui o antigo `<nav>` de 2
  links (Hoje/Início) do `App.tsx`. Aparece em toda tela "de dentro de uma casa" (Hoje, Trilha do
  Curso, Ranking, Squad, Loja, Perfil, Projeto Semanal) - a única tela sem ele é o próprio mapa,
  que é o destino do botão central. Itens: Hoje, Trilha do Curso, Ranking (agora item próprio, não
  só ancorado dentro da Trilha), Squad, Loja, Configurações (abre o `SettingsMenu`, ver abaixo) +
  `HeaderUserBadge` (nome+moldura, já existia, continua sendo o "link pro Perfil"). Botão central
  ("onde o player volta pro mapa", pedido do Falves) é um placeholder (emoji 🗺️) até ele trazer o
  PNG pixel art próprio.
- **`/hoje` voltou a ter o menu global** (decisão explícita do Falves - "sim, entra em `/hoje`
  também"): reverte parte da Fase 20 (que tinha tirado `/hoje` do shell `<App/>` pra não colidir
  com o `PenaltyGauge`/botão de configurações fixos no topo). O botão de engrenagem próprio saiu
  de `TodayPage` (o item "Configurações" do `GlobalNav` cobre o mesmo caso); `PenaltyGauge`
  continua `fixed`, só que `top-[72px]` em vez de `top-6` (limpa a altura do header, 56px + 16px
  de respiro) - verificado ao vivo, sem colisão.
- **Posição do personagem persistida entre visitas** (`lib/worldPosition.ts`, pedido do Falves -
  "guardar a posição pra ele voltar sempre do mesmo lugar"): `localStorage` por usuário, não
  backend - mesmo princípio de `lib/settings.ts` (continuidade cosmética de navegação, não
  progresso de verdade, não precisa sincronizar entre dispositivos). Dois caminhos de escrita: (1)
  `handleEnterZone` salva a posição EXATA no instante de entrar numa casa, antes de navegar -
  cobre o caso comum, sempre volta bem na porta que usou pra sair (`useWorldMovement` passou a
  repassar a posição recém-calculada pro callback, não só a zona, pra não depender do state
  `position` do render anterior); (2) um `useEffect` debounced salva em segundo plano ~400ms
  depois que o personagem para de se mexer - cobre quem sai do mapa sem passar por uma trigger
  zone (fecha a aba, digita outra URL). Posição salva é clampada aos limites do mapa atual ao
  carregar (defensivo contra um `localStorage` antigo de antes de trocar a imagem do mapa).
- **Loja e Customização viraram "em breve"** (pedido do Falves - ele vai montar um kit inicial de
  pixel art pros cosméticos, combinando com a identidade visual nova do mapa/personagem; os itens
  atuais sempre foram bloco de cor sólida por raridade, placeholder desde a Fase 17). Novo
  componente compartilhado `ComingSoon.tsx` (icone + título + descrição, mesmo espírito do
  `ComingSoonBadge` do `SettingsMenu` só que como bloco de seção inteira). `MarketplacePage`
  manteve só o `GemBadge` (saldo real, sem motivo pra esconder) + o bloco "em breve" no lugar do
  filtro por slot/grid de itens. `CustomizationTab` virou um componente sem props, só o bloco "em
  breve" - `ProfilePage` parou de manter `catalogOverride`/`busyItemId`/`actionError`/`runAction`
  (só existiam pra alimentar essa aba), usa `data.catalog` direto pro `ProfileHeader`.
  `purchaseCosmeticItem`/`equipCosmetic`/`unequipCosmetic` (`api/client.ts`) continuam intactos -
  só as 2 telas pararam de exercitar esse fluxo; reverter é trazer de volta o conteúdo anterior
  (preservado no histórico do Git).
- **Fix: WASD parava de funcionar com Caps Lock ligado (ou Shift segurado)** - `event.key` vem
  maiúsculo nesse caso ("W"/"A"/"S"/"D"), e não batia com as entradas minúsculas de
  `MOVE_VECTORS` em `useWorldMovement.ts` - o movimento parava silenciosamente, sem erro nenhum
  (as setas continuavam funcionando, por não serem letras - só o WASD "sumia", exatamente o
  sintoma relatado). `normalizeKey` (novo, lowercase só em teclas de 1 caractere - `ArrowUp` etc
  não precisam) corrige. Reproduzido e confirmado corrigido via `dispatchEvent` direto de um
  `KeyboardEvent` com `key: 'D'` antes/depois da correção.
- **Fallback mobile em `/start`** (pedido do Falves - "caso o usuário acesse pelo telefone,
  iremos utilizar a tela antiga"): `useIsMobile()` (novo, `lib/useIsMobile.ts` - viewport <
  768px, mesmo breakpoint `md` já usado em CSS pelo resto do app) decide entre `WorldMapPage`
  (mapa, exige teclado) e `StartDashboard` (hub de cards antigo) em `/start` sem params -
  exatamente por isso o `StartDashboard` tinha ficado guardado no repo sem uso desde o início
  desta fase, não foi acaso. `StartDashboard` roda dentro de `<App>` (`GlobalNav`) no fallback,
  mesmo shell que sempre usou.
- **`GlobalNav` virou responsivo** (descoberto ao vivo testando o fallback mobile acima - 7 itens
  + botão central + badge não cabiam em ~390px, texto cortado/sobrepondo). Abaixo do breakpoint
  `md`, os 2 grupos de texto (esquerdo/direito) viram um botão "☰" que abre um menu suspenso em
  lista (fecha sozinho ao navegar); botão central e `HeaderUserBadge` continuam sempre visíveis
  na barra. Acima de `md`, layout idêntico ao original - verificado que nada mudou no desktop.
- **Menu de Configurações virou 1 instância só pro app inteiro** (`SettingsProvider`, novo
  Context): antes `SettingsMenu` só existia dentro de `TodayPage` (seu próprio estado local). Com
  o `GlobalNav` podendo abri-lo de qualquer tela E `/hoje` ainda precisando que ESC/voltar do
  navegador o abra (`useSessionExitGuard`), as duas fontes de abertura precisavam compartilhar o
  mesmo estado - senão existiriam 2 modais independentes, sem um saber do outro. Mesmo padrão de
  `AuthProvider`: o Provider guarda o estado e renderiza o modal 1x como irmão de `children`.
  `onExit` continua `window.location.href` (não `navigate()`) - de propósito, preservado
  idêntico ao comportamento anterior (ver comentário em `SettingsProvider.tsx` pro racional).

## Decisões técnicas tomadas que não estavam no prompt original

- **Sem prompt técnico único desta vez** - esta fase nasceu de uma conversa de planejamento com o
  Falves direto no Claude Code (não um prompt colado de outra ferramenta, como o resto do
  projeto) - decisões de escopo (mapeamento de cada construção pra sua tela, mecânica de trigger
  por pixel em vez de clique, sem colisão contra prédio, sem sistema de nível/desbloqueio) foram
  confirmadas uma a uma com ele antes de codar, registradas aqui por completude.
- **Espaço de coordenadas = pixels naturais da imagem (2304x1296), não "tiles"**: o mapa não usa
  grid lógico próprio - trigger zones são círculos em pixels da imagem original, e o componente
  posiciona tudo via `%` (proporção da imagem), então funciona em qualquer tamanho de tela sem
  reconverter coordenada nenhuma.
- **Calibração das trigger zones sem chute cego**: antes de escrever `worldConfig.ts` definitivo,
  as 5 coordenadas estimadas foram sobrepostas na imagem real via ImageMagick (círculos coloridos
  compostos direto no PNG) e conferidas visualmente contra as portas de cada construção - todas
  bateram na estimativa inicial, sem precisar de retrabalho. Depois, o pipeline completo
  (movimento -> detecção de zona -> callback de navegação) foi exercitado de ponta a ponta num
  Chromium real via Playwright (rota de preview temporária, sem depender do backend/login -
  removida antes do commit), confirmando que o gatilho dispara exatamente 1 vez ao entrar numa
  zona.
- **`StartDashboard.tsx` mantido no repo, não apagado** - decisão explícita do Falves (guardar
  pra reaproveitar alguma coisa depois), mesmo sem nenhum import apontando pra ele mais.
  `StartPage.tsx` não referencia mais o componente.
- **HUD (GemBadge/StreakIndicator) reaproveitado idêntico ao antigo `StartDashboard`** só como
  placeholder funcional - o Falves já avisou que pretende redesenhar esses elementos em UI
  própria de pixel art depois, então não valia a pena investir em polimento visual deles agora.
- **Sem destaque de "item ativo" no `GlobalNav`**: vários itens (Trilha do Curso/Ranking) apontam
  pro mesmo pathname `/start` com querys diferentes - `NavLink` só compara pathname por padrão,
  destacaria os dois ao mesmo tempo (incorreto). Usado `Link` simples em vez de `NavLink` - não
  vale a complexidade de comparar `location.search` a mão numa UI que já vai ser redesenhada.
- **`ErrorBoundary` do `App.tsx` ganhou `search` na key** (era só `pathname`): necessário pra
  `/hoje` (agora dentro do shell) continuar resetando o boundary ao trocar de Daily via `?daily=`
  sem trocar de pathname - mesmo motivo que existia no `TodayRoute` isolado, que foi removido
  (o `App` cobre o caso agora, `TodayPage` virou elemento de rota direto).

## Estrutura de arquivos criada

```
frontend/src/
  assets/world/
    mapa-vilarejo.png          <- arte trazida pelo Falves (Figma/asset pack), 2304x1296
  components/world/
    PlayerSprite.tsx            <- placeholder do personagem (bolinha + sombra + indicador de direção)
    HouseLabel.tsx               <- letreiro sempre visivel acima de cada porta (so o titulo)
  components/GlobalNav.tsx       <- menu global unico, substitui o <nav> antigo do App.tsx
  lib/
    worldPosition.ts               <- getSavedWorldPosition/saveWorldPosition (localStorage por userId)
    useIsMobile.ts                  <- hook - viewport < 768px, usado por StartPage pro fallback mobile
  components/
    ComingSoon.tsx                   <- bloco "em breve" reutilizavel (icone+titulo+descricao),
                                    usado por MarketplacePage e CustomizationTab
  contexts/
    settingsContextObject.ts      <- createContext + tipo (SettingsContextValue)
    SettingsProvider.tsx           <- Provider - estado do SettingsMenu + renderiza o modal 1x pro app inteiro
    useSettings.ts                  <- hook (mesmo padrao de useAuth.ts)
  routes/world/
    WorldMapPage.tsx             <- tela /start sem params - busca dados (today/courses/gamification),
                                    renderiza mapa full-bleed + HUD + personagem + letreiros,
                                    decide navegação ao entrar em zona
    worldConfig.ts                <- WORLD_WIDTH/HEIGHT, START_POSITION, WORLD_TRIGGER_ZONES (as 5 casas)
    useWorldMovement.ts            <- hook do loop de movimento (teclado + requestAnimationFrame)
  routes/StartPage.tsx             <- (editado) StartRoute (novo, repoe ErrorBoundary) + StartPage
                                    chama <App> manualmente nas 5 sub-telas, WorldMapPage sem shell
  routes/TodayPage.tsx              <- (editado) TodayRoute removido (App cobre o ErrorBoundary agora),
                                    sem estado/botao proprio de Configuracoes (usa useSettings()),
                                    PenaltyGauge reposicionado (top-6 -> top-[72px])
  App.tsx                            <- (editado) <nav> antigo -> <GlobalNav/>, children opcional,
                                    ErrorBoundary key ganhou +search
  main.tsx                            <- (editado) <SettingsProvider> envolvendo as rotas, /hoje
                                    voltou pra dentro de <Route element={<App/>}>
  routes/StartDashboard.tsx         <- (sem alteração de conteúdo) volta a ter uso - fallback
                                    mobile de `/start`, ver StartPage.tsx
```

## Testes

- `tsc -b --noEmit`: limpo em cada rodada de mudança.
- `oxlint`: limpo (1 warning pré-existente em `TodayPage.tsx`, não relacionado a esta fase).
- Calibração visual das 5 trigger zones + posição dos letreiros: composição via ImageMagick sobre
  a imagem real antes de fixar coordenadas, depois conferida de novo ao vivo no browser.
- Mapa full-bleed: testado via Playwright em 3 proporções de viewport (16:9 exato - preenche
  100% sem barra nenhuma; janela mais larga - pillarbox; janela mais alta - letterbox) - preenche
  o máximo em qualquer caso sem esticar a imagem.
- **Posição persistida: verificado de ponta a ponta com o mesmo usuário de QA.** 1ª visita spawna
  na `START_POSITION` (praça central). Andar e sair SEM entrar em nenhuma casa (troca de URL
  direto) + voltar: personagem reaparece exatamente onde parou (confirmado por coordenada exibida
  no modo "Ajustar zonas"), não na praça - caminho do `useEffect` debounced. Andar até a zona
  "Hoje" e entrar SEM esperar o debounce (menos de 400ms) + voltar pro mapa: personagem reaparece
  bem na porta da torre - caminho de `handleEnterZone` (salva antes de navegar).
- **`GlobalNav`/`SettingsProvider`/reposicionamento do `PenaltyGauge`: verificado de ponta a ponta
  com login real** (usuário de QA descartável, criado via API só pra este teste - `qa-fase25@
  example.com`, matriculado em Web Security, nunca a conta do Falves): login -> `/start` (mapa,
  sem `GlobalNav`) -> `/loja` (`GlobalNav` aparece, hrefs de Trilha/Ranking com o `courseId` real
  resolvido) -> clique em "Configurações" abre o modal -> clique no botão central 🗺️ volta pro
  mapa -> `/hoje` (`GlobalNav` aparece, `PenaltyGauge` em `y=72`, nav termina em `y=56` - **sem
  colisão**, confirmado por bounding box) -> ESC durante a sessão ainda abre o mesmo modal de
  Configurações (context compartilhado funcionando). Screenshots de cada passo revisados.
- **Loja/Customização "em breve": conferido ao vivo com o mesmo usuário de QA** - `/loja` mostra
  o bloco "Loja em breve" + Gems reais, sem grid de itens; `/perfil?tab=customizacao` mostra
  "Customização em breve"; aba "Informações" (não afetada) continua normal, confirmando que só as
  2 telas certas mudaram.
- **Fix do WASD: reproduzido e confirmado corrigido via `dispatchEvent`** de um `KeyboardEvent`
  com `key: 'D'` (exatamente o que Caps Lock produz) - antes da correção o personagem não se
  movia; depois, move igual à tecla minúscula.
- **Fallback mobile: verificado num viewport de 390x844 (iPhone-ish)** com o mesmo usuário de QA -
  `/start` renderiza `StartDashboard` (não `WorldMapPage`), confirmado checando ausência da
  `<img alt="Mapa da Focadu">` na página. `GlobalNav` responsivo testado no mesmo viewport: barra
  colapsada (hambúrguer + botão central + badge, tudo visível sem corte), menu aberto (lista dos
  6 itens), clique num item navega e fecha o menu sozinho. Desktop (1440px) conferido de novo no
  mesmo teste - hambúrguer ausente, layout idêntico ao de antes desta rodada.

## Dúvidas ou pontos abertos para a próxima fase

1. **Posição salva é por navegador/dispositivo, não por conta** - `localStorage` não sincroniza
   entre aparelhos (ex: logar no celular não traz a posição salva no computador). Aceitável pro
   caso de uso (é só onde o personagem "estava parado", não dado real) - se algum dia precisar
   sincronizar de verdade, vira um campo persistido no backend (`User` ou algo à parte).
2. **Personagem sem arte de verdade ainda** - Falves vai montar um kit inicial próprio (spritesheet
   com idle/andando nas 4 direções, compatível com o estilo do mapa) - inclui tanto os sprites do
   personagem quanto os itens da Loja (ver item 4a abaixo), o mesmo kit cobre os dois. Quando
   chegar, é só substituir o conteúdo de `PlayerSprite.tsx`.
3. **Botão central do `GlobalNav` sem arte de verdade ainda** - emoji 🗺️ como placeholder até o
   Falves trazer o PNG pixel art próprio ("onde o player volta pro mapa"). Troca é só substituir
   o conteúdo de `MapButton` (dentro de `GlobalNav.tsx`) por um `<img>`.
4. **Loja/Customização pausadas ("em breve") até o kit inicial chegar** - `MarketplacePage`/
   `CustomizationTab` mostram `ComingSoon` no lugar da grade de itens (ver "O que foi
   implementado" acima). Quando os itens de verdade chegarem, uma fase futura reconstrói essas 2
   telas contra a arte real - o mecanismo de compra/equipar (`api/client.ts`,
   `CosmeticItemCard`/`CosmeticSlotFilter`) continua intacto, só não está sendo exercitado.
5. **HUD do mapa (Gems/Streak) e o `GlobalNav` em si vão ser redesenhados em pixel art** - hoje
   são os componentes "modernos" (pill arredondada) já existentes desde a Fase 14/18, só
   reposicionados/reorganizados. Falves confirmou que pretende refazer essa UI depois.
6. **Sem colisão contra parede no mapa** - decisão explícita da fase pra entregar mais rápido. Se
   incomodar visualmente na prática (personagem "afundando" numa construção), é candidato a uma
   próxima iteração - exigiria mapear os retângulos sólidos de cada construção.
7. **Coordenadas das trigger zones/letreiros são uma calibração visual, não uma medição
   exaustiva** - bateram nas estimativas (ver "Testes"), mas se alguma porta parecer "errada" no
   uso real, é só ajustar `x`/`y`/`radius` em `worldConfig.ts`.
8. **`StartDashboard.tsx` voltou a ter uso** (fallback mobile) - deixou de estar órfão. Ainda sem
   nenhuma alteração de conteúdo desde a Fase 8-24 (Gems/Streak/StreakLostModal/WeeklyProjectCard
   continuam iguais); se merece um passe de fidelidade visual pra combinar com o resto da
   identidade atual é decisão em aberto, não urgente (ele já era funcional).
9. **Fallback mobile cobre só `/start` sem params** - as outras telas (Loja/Perfil/Trilha/Ranking/
   Projeto/Squad/Hoje) não passaram por uma auditoria de responsividade nesta fase, só o
   `GlobalNav` que aparece em todas elas ganhou o tratamento `md:`/hambúrguer. Cada tela em si
   pode ou não se comportar bem numa viewport estreita - não verificado sistematicamente.
10. **`useIsMobile` é só largura de viewport (breakpoint `md`, 768px)**, sem checar touch/user-agent
   - uma janela de desktop redimensionada pra estreito também cai no fallback do `StartDashboard`.
   Aceitável pro caso de uso real (não há teclado confiável só pela largura pra decidir diferente).
11. **Usuário de QA descartável ficou no banco local** (`qa-fase25@example.com`, matriculado em Web
    Security) - criado só pra verificar o `GlobalNav`/`/hoje`/fallback mobile com login real, sem
    endpoint de remoção de usuário no domínio pra limpar via API. Inofensivo (banco de dev local),
    mas fica registrado - remover via SQL direto se incomodar.
12. **Sem mudança nenhuma de backend nesta fase** - é 100% frontend/navegação; nenhum DTO, endpoint
   ou entidade de domínio foi tocado.
