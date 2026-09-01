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

## Estrutura de arquivos criada

```
frontend/src/
  assets/world/
    mapa-vilarejo.png          <- arte trazida pelo Falves (Figma/asset pack), 2304x1296
  components/world/
    PlayerSprite.tsx            <- placeholder do personagem (bolinha + sombra + indicador de direção)
  routes/world/
    WorldMapPage.tsx             <- tela /start sem params - busca dados (today/courses/gamification),
                                    renderiza mapa + HUD + personagem, decide navegação ao entrar em zona
    worldConfig.ts                <- WORLD_WIDTH/HEIGHT, START_POSITION, WORLD_TRIGGER_ZONES (as 5 casas)
    useWorldMovement.ts            <- hook do loop de movimento (teclado + requestAnimationFrame)
  routes/StartPage.tsx             <- (editado) sem params -> WorldMapPage em vez de StartDashboard
  routes/StartDashboard.tsx         <- (sem alteração de conteúdo) mantido no repo, sem uso
```

## Testes

- `tsc -b --noEmit`: limpo.
- `oxlint`: limpo nos arquivos novos (1 warning pré-existente em `TodayPage.tsx`, não relacionado
  a esta fase).
- Calibração visual das 5 trigger zones: composição via ImageMagick sobre a imagem real, conferida
  antes de fixar as coordenadas em `worldConfig.ts`.
- Verificação ao vivo em browser real (Playwright + Chromium, Vite dev server): rota de preview
  temporária (`/__dev-preview`, sem autenticação/backend) renderizou o mapa, moveu o personagem
  via teclado (posição/direção corretas, condizentes com a física esperada) e confirmou que entrar
  na zona "Hoje" dispara o callback de navegação exatamente 1 vez. Rota/arquivo de preview
  removidos antes do commit - nunca fizeram parte do app real.
- **Não testado**: fluxo completo autenticado (login real + `/start` + entrar numa casa +
  aterrissar na tela de destino) - a verificação acima cobriu a mecânica do mapa isoladamente,
  sem depender do backend estar de pé. Falves vai testar isso ao vivo com o app rodando de
  verdade.

## Dúvidas ou pontos abertos para a próxima fase

1. **Personagem sem arte de verdade ainda** - Falves vai procurar um asset pack free de criação
   de personagem compatível com o estilo do mapa (spritesheet com idle/andando nas 4 direções).
   Quando chegar, é só substituir o conteúdo de `PlayerSprite.tsx`.
2. **HUD (Gems/Streak) vai ser redesenhado em pixel art** - hoje são os mesmos componentes
   "modernos" (pill arredondada) que o `StartDashboard` usava, só reposicionados. Falves confirmou
   que pretende refazer essa UI depois, então isso é esperado, não uma pendência esquecida.
3. **Sem colisão contra parede** - decisão explícita desta fase pra entregar mais rápido. Se
   incomodar visualmente na prática (personagem "afundando" numa construção), é candidato a uma
   próxima iteração - exigiria mapear os retângulos sólidos de cada construção.
4. **Coordenadas das trigger zones são uma calibração visual, não uma medição exaustiva** - todas
   bateram na primeira estimativa (ver "Testes" acima), mas se alguma porta parecer "errada" no
   uso real, é só ajustar o `x`/`y`/`radius` correspondente em `worldConfig.ts`.
5. **`StartDashboard.tsx` está órfão no repo** - sem import nenhum apontando pra ele, mantido a
   pedido do Falves. Uma fase futura vai precisar decidir se algum trecho dele (ex: lógica do
   `StreakLostModal`, `WeeklyProjectCard` no hub) volta a ser usado em algum lugar, ou se o arquivo
   é removido de vez.
6. **Sem mudança nenhuma de backend nesta fase** - é 100% frontend/navegação; nenhum DTO, endpoint
   ou entidade de domínio foi tocado.
