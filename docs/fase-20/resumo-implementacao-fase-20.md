# Resumo — Fase 20: Fidelidade Visual — Navegação & Perfil + Correção de Rota Full-Bleed

## Contexto

Continuação da leva de fidelidade visual (Fase 19 cobriu Sessão Diária). Esta fase cobre Navegação
(StartDashboard/WeeklyDetailPage/WeeklyProjectPage/SettingsMenu) e Perfil (Informações/
Customização/Conquistas/Ranking/Loja), e resolve a pendência estrutural identificada no fechamento
da Fase 19: `/hoje` vivia dentro do shell `<App/>` (nav global), mas as telas de sessão são
desenhadas full-bleed - o nav sobrepunha o PenaltyGauge/botão de configurações.

## Parte 1 — Correção: `/hoje` Full-Bleed

`/hoje` movida pra fora do `<App/>`, mesmo nível de `/onboarding`/`/login` na árvore de rotas
(`main.tsx`) - continua dentro de `<ProtectedRoute>`. `<App/>` só contribuía com o nav (que não
deve aparecer mesmo) e o `<ErrorBoundary key={pathname}>` em volta do `<Outlet/>` - reposto via
`TodayRoute` (novo, `routes/TodayPage.tsx`), com a key incluindo `location.search` também (não só
`pathname`): `/hoje` navega entre Dailies diferentes via `?daily=` sem trocar de rota, então um
crash precisa ser "esquecido" também ao trocar de Daily, não só ao trocar de rota.

**Bug real encontrado e corrigido durante a verificação** (não estava no prompt, mas é consequência
direta da mudança): `PenaltyGauge`/botão de configurações são `fixed left-6/right-6 top-6` por cima
de QUALQUER tela de sessão - o nav global (~60px) coincidentemente dava folga suficiente antes;
sem ele, colidiam direto com `SessionTopBar`/`IntroCard`. Corrigido com `pt-20` (era `p-10`
simétrico) em `SessionLayout` e um wrapper `min-h-screen`/centralizado novo em `IntroCard` (que
nunca tinha um - renderizava flush no topo-esquerda, mascarado pelo mesmo nav).

Verificado: `SettingsMenu`/`PenaltyGauge`/`SessionTopBar` de fato não dependiam de nada do `<App/>`
(confirma a suposição do prompt) - só precisaram da folga de espaço, não de contexto/CSS herdado.

## Parte 2 — Fidelidade Visual: Navegação & Perfil

8 telas + componentes compartilhados conferidos contra o Figma (`get_design_context`). Confirmação
mais uma vez do padrão já estabelecido nas Fases 16-19: os mockups de Perfil/Conquistas/Ranking têm
uma quantidade grande de conteúdo fabricado (Nível/XP, "Sessões completas", Platinas por curso,
"blockchain focadu", ranking global com XP/podium/usuários fictícios, cosmético "Glitch Text"/
"Cyber Samurai" que não existem no catálogo real) - tudo omitido, mesma regra de sempre.

### Tokens

Nenhum token novo - `--color-stroke`/`--font-sans` (Fase 19) já cobriam tudo que apareceu nos 8
nodes. Reconciliação, não expansão.

### Mudanças por tela

- **StartDashboard**: saudação "Olá, {nome real}" (`useAuth().user.displayName`, só não era
  consumido ainda). `StreakIndicator` (compartilhado) ganhou preenchimento accent-dim quando
  streak > 0. `TodayCard` virou `rounded-[20px]` + eyebrow "CURSO ATIVO" + barra de progresso real
  (semanas completas/total, já calculado). Rodapé novo com "Melhor streak"/"Gems" (reais,
  `GamificationSummaryDto`) - "Sessões completadas" do mockup omitido (sem contador agregado no
  domínio). Grid "Seus Cursos" (1 ativo + 2 bloqueados "libera no nível X") continua fora - só
  existe 1 Course Active (decisão da Fase 8, reafirmada), sem sistema de nível/desbloqueio.
- **WeeklyDetailPage**: `DayCard` do dia atual ganhou borda 1.5px (era 1px). Badge de aprovação
  (`StatusBadge` tone `accent`) e "Em andamento" já eram dado real, só a cor mudou (via
  `StatusBadge`). "NOTA: 92/100" do mockup continua fora (sem nota por dia no domínio, já era
  decisão da Fase 8) - mantido `${passed}/${total} aprovadas`.
- **WeeklyProjectCard** (compartilhado, StartDashboard + WeeklyDetailPage): ganhou o rótulo
  decorativo fixo "BOSS" (mesma linguagem de "chefe de fase" já usada em `WeeklyProjectPage`, sem
  dado novo).
- **WeeklyProjectPage**: já batia quase pixel-a-pixel desde a Fase 7 (`border-project` 1.5px,
  `rounded-[20px]`) - só trocas de token (divisor `bg-stroke`). "OBJETIVOS DO PROJETO"/"RECURSOS
  ADICIONAIS"/deadline do mockup continuam fora (decisão da Fase 7, reafirmada - `SpecText` é 1
  texto livre, sem essa estrutura no domínio).
- **SettingsMenu**: divisores e segmento ativo de "Aparência" no padrão accent-dim. **"Sair da
  Conta" virou o botão vermelho de largura total do Figma** (era link de texto simples,
  divergência documentada desde a Fase 13a - decisão tomada nesta fase: corrigir, já que "parecia
  natural" durante o refinamento da mesma tela). "Fechar (ESC)"/"Sair e salvar progresso" continuam
  como 2 linhas discretas acima do botão - o Figma só mostra "Fechar (ESC)" + o botão de logout,
  sem uma 3ª ação, mas "Sair e salvar progresso" é um caminho de saída real; tirado teria reduzido
  funcionalidade só pra bater com o mockup, então ficou como texto discreto em vez de removido.
- **InformationTab**: campos (Nome/E-mail) viraram caixas com borda própria (`rounded-[10px]
  bg-surface-alt`), como o Figma mostra pros campos de formulário - antes era só texto solto dentro
  do card. Upload de foto/Apelido/Frase de Guerra/Analogias de Aprendizado continuam fora (Fase 18,
  reafirmado).
- **CustomizationTab/CosmeticItemCard**: mantido o cartão em grade (não a linha horizontal do
  Figma) - `CosmeticItemCard` é compartilhado com a grade da Loja, converter pra linha serviria só
  a Customização e desalinharia a Loja; troca de borda pro token novo.
- **ConquestsTab/BadgeGrid/ReferralCard**: troca de borda. Conteúdo (Platinas/Troféus recentes com
  XP/"blockchain") já era 100% fora de escopo desde a Fase 18, reafirmado.
- **RankingPage/RankingScopeTabs**: `RankingScopeTabs` virou controle segmentado (pílulas em
  `bg-surface`, ativa accent-dim) - era aba sublinhada (padrão de `LoginPage`); trocado porque o
  node deste ranking especificamente mostra pílulas, não sublinhado. Painel "Seu Desempenho"
  (posição + delta semanal + "Top 0.6%" + sparkline de XP diário) do mockup continua fora - delta/
  percentil/sparkline não existem no domínio; a posição em si já é mostrada via
  `CurrentUserRankingCard`, sem duplicar num painel novo cheio de dado fabricado.
- **RankingTable**: linha do usuário atual com destaque mais forte (`bg-accent/15`, era `/10`).
- **MarketplacePage**: sem mudança estrutural - já batia bem desde a Fase 17/19.
- **HeaderUserBadge** (nav global): conferido consistente após a extração de `/hoje` - continua
  aparecendo normalmente em `/start`/`/loja`/`/perfil`/`/admin/conteudo` (as únicas rotas que ainda
  usam o shell `<App/>`), simplesmente não aparece mais em `/hoje`.

## Testes

- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`). Sem mudança de backend.
- **Verificação estrutural** (Playwright): `/hoje` sem `<nav>` (full-bleed confirmado, 0 elementos
  `<nav>`); `/start` com `<nav>` antes e depois de visitar `/hoje` (nav global intacto na volta,
  via "Sair e salvar progresso" - o `popstate` do botão "voltar" do navegador é interceptado de
  propósito pelo `useSessionExitGuard` desde a Fase 7, então não é o caminho usado pra "voltar" no
  teste).
- **Smoke test completo** (pedido no prompt): `/start` → `/start?weekly=` → `/start?course=&
  ranking=1` (+ troca de escopo Mês) → `/loja` → `/perfil` (3 abas) → `/hoje` (full-bleed
  confirmado) → volta - todas as 8 telas renderizadas e capturadas em screenshot, comparadas ao
  node Figma correspondente.
- `console --errors`: limpo.

## Dúvidas ou pontos abertos

- Nenhuma pendência de implementação - checklist do prompt fechado integralmente, incluindo a
  correção estrutural e a decisão sobre "Sair da Conta" (documentada acima).
- `CosmeticItemCard` continua em formato de grade (não linha horizontal) mesmo na aba Customização
  - decisão documentada acima (evitar 2 layouts pro mesmo componente compartilhado).
