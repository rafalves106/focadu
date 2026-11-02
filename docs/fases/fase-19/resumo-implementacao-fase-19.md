# Resumo — Fase 19: Fidelidade Visual — Sessão Diária

## Contexto

Fase de refinamento visual, não de construção: as 8 telas (Leitura, Resumo Falado, Vídeo, Quiz,
Ligar Palavras, Cloze Test, Roleplay, Feedback IA) já tinham lógica funcional completa desde as
Fases 4-9. O objetivo único foi aumentar a fidelidade ao Figma - cores, tipografia, espaçamento,
layout, estados de seleção/foco - sem tocar em lógica de negócio, chamadas de API ou estrutura de
dados. Nenhuma mudança de backend nesta fase.

## Validação de Figma (8 nodes conferidos)

Todos os 8 nodes foram extraídos via MCP (`get_design_context`) antes da implementação. A maior
descoberta: **todas as 8 telas compartilham o mesmo chrome** no Figma (barra de progresso no topo,
cartão central com `bg-surface`/`border-stroke`/`rounded-[20px]`, sidebar "Material de hoje", orbe
decorativo) - mas só Leitura/Vídeo (Fase 7) tinham esse chrome de verdade no código; Quiz/Ligar
Palavras/Cloze/Roleplay/Resumo Falado usavam `ActivityScreen` (`Layout.tsx`), um shell genérico sem
cartão nem sidebar. Maior mudança desta fase (ainda assim só layout, não lógica): generalizar esse
chrome como `SessionLayout` (novo, `SessionShell.tsx`) e aplicá-lo às 5 telas que não tinham.

## O que foi implementado

### Tokens (`index.css`)

- **`--color-stroke` (`#2A2A2A`, novo)** - o Figma usa 2 cinzas de papéis diferentes onde o app só
  tinha 1: `background/surface-raised` (`#1E1E1E`, fundo de pílulas/linhas elevadas - já existia
  como `--color-surface-alt`) e `stroke/subtle` (`#2A2A2A`, borda de cards/inputs - não existia).
  Reconciliado com o token já existente onde os papéis batiam (fundos elevados continuam
  `surface-alt`); token novo só para bordas, usado de forma consistente em todos os componentes
  tocados (`OptionCard`/`IntroCard`/`CodeHighlight`/`MaterialSidebar`/`FeedbackPanel`/
  `PenaltyGauge`/`SessionLayout`).
- **`--font-sans` (Inter, novo)** - o Figma usa Inter como fonte de UI em todas as 8 telas (Regular/
  Medium/SemiBold/Bold). Virou o `--font-sans` de verdade, ou seja, o default do app inteiro -
  nenhuma tela tinha uma fonte própria configurada antes desta fase (só o default do navegador).
  Baixo risco: é só uma troca de fonte (legibilidade/identidade), não de layout/cor, e Inter é
  visualmente próxima do que já se via (`ui-sans-serif`/`system-ui`).
- Preenchimentos translúcidos (opção selecionada-mas-não-confirmada no Quiz, gauge de Score no
  FeedbackPanel) usam `bg-accent/25`/`bg-project/15` (opacidade Tailwind) em vez de token novo -
  aproxima o "neon-green-dim" (`#1F5C33`) do Figma sem fixar mais uma cor só pra um uso de
  translucidez.
- **Decisão: nenhuma 4ª fonte.** O bloco de código do Cloze usa "Cousine" no Figma - reaproveitado
  `font-mono` (Fira Code, já carregada desde a Fase 18) em vez de somar uma família de fonte nova
  ao app inteiro só pra 1 bloco.

### Chrome compartilhado (`SessionShell.tsx`, `useMaterialSidebar.tsx`, novos/generalizados)

- **`SessionLayout`** (novo) - `SessionTopBar` + cartão central (`bg-surface`/`border-stroke`/
  `rounded-[20px]`) ou sem cartão (`card={false}`) + sidebar + `QuickQuestionOrb`, generalizado do
  JSX que `ReadingActivity`/`VideoActivity` já tinham duplicado desde a Fase 7.
- **`useMaterialSidebar`** (novo hook, arquivo próprio - co-exportar hook e componente no mesmo
  arquivo quebra o fast refresh, mesmo motivo de `lib/statusBadge.ts`) - busca a `Weekly` e monta o
  `MaterialSidebar` com os itens/concluídos da Daily atual, mesmo cálculo que Reading/Video já
  faziam, agora compartilhado pelas 7 telas de sessão.
- **`MaterialSidebar.activeContentId` virou `string | null`** - só Reading/Video têm `ContentId`
  próprio de leitura/vídeo pra destacar (ver `DailyActivity.ctor`, Fase 7); as outras 5 atividades
  passam `null` (nenhum item em destaque, só os concluídos aparecem).
- `SessionTopBar`/`ProgressBar` já batiam pixel-a-pixel com o Figma desde a Fase 7/8 - nenhuma
  mudança nelas.

### As 8 telas

- **Leitura/Vídeo**: já tinham a fidelidade certa desde a Fase 7 - só migradas pra usar
  `SessionLayout`/`useMaterialSidebar` (elimina duplicação), mais pequenos ajustes (`leading-[1.5]`,
  emoji ⏱ na estimativa de leitura, `border-stroke`).
- **Resumo Falado**: `SessionLayout card={false}` - única tela de sessão sem cartão (o Figma mostra
  a gravação flutuando direto sobre o fundo). Mic orb 180px (era 112px), legenda combinada
  "GRAVANDO — MM:SS / LIMITE 10:00". Legenda "Baseado em: ..." do Figma omitida - exigiria uma
  chamada de API nova (buscar o `CuratedContent` só pra essa legenda), fora do escopo de uma fase
  que é só estilo.
- **Quiz**: pergunta como título 2xl dentro do cartão, `OptionsAnswer`/`OptionCard` já cobriam o
  resto (ver abaixo).
- **Ligar Palavras**: cartão + headline "Conecte cada termo à sua definição" + progresso com dot
  colorido, mecânica de múltipla escolha independente mantida (ver divergência estrutural abaixo).
- **Cloze Test**: bloco de código com fonte mono e lacuna destacada (`CodeHighlight`, já existia),
  labels "SUA RESPOSTA"/"JUSTIFICATIVA (OPCIONAL)" no tracking do Figma.
- **Roleplay**: badge âmbar "ROLEPLAY DE DECISÕES" (`--color-project`, reaproveitado do tema do
  Projeto Semanal), bloco "CENÁRIO" com borda de acento âmbar mostrando `activity.prompt` de forma
  persistente (antes só aparecia na Intro), opções numeradas.
- **Feedback IA**: gauge de Score 72px (era 56px) com preenchimento `bg-accent/25` quando passou,
  tracking/bordas fiéis ao node "feedback-ia". 2 colunas (acertos/melhorias) continuam fora - ver
  divergência abaixo.

### `OptionCard`/`IntroCard`/`CodeHighlight`/`PenaltyGauge`

- `OptionCard`: estado "selecionado" ganhou preenchimento verde translúcido (`bg-accent/25`, era só
  a borda), padding `px-[18px] py-4` exato do Figma.
- `IntroCard`/`CodeHighlight`/`PenaltyGauge`: troca de borda `surface-alt` → `stroke`.

## Divergência estrutural conhecida — não corrigida (confirmado no prompt)

**Ligar Palavras**: o Figma mostra um grafo de pares arrastáveis em 2 colunas com conectores
visuais. A implementação real é 1 termo = 1 escolha múltipla independente - decisão de domínio
confirmada na Fase 4 e reafirmada na Fase 9, não um detalhe de estilo. Não reconstruída nesta fase
(seria uma feature nova - drag-and-drop, estado de conexões, validação de pares - fora do escopo de
"polimento visual"). Aplicada fidelidade só ao que já existe (cores/tipografia/cards), mantendo a
mecânica de múltipla escolha.

## Divergências mantidas conscientemente (além da já sinalizada acima)

- **Feedback IA em 2 colunas** (O que você acertou / Onde melhorar) - reafirma a decisão da Fase 7:
  o domínio só guarda `AiFeedback` como 1 string única (Groq), não uma lista estruturada de
  acertos/erros.
- **Indicador "árvore de decisão" numerada do Roleplay** (1→2→3→4, com o nó atual destacado) -
  omitido. O grafo de `RoleplayNode` tem profundidade/ramificação variável por caminho (não um
  número fixo de passos garantido pelo domínio) - mostrar "passo N de 4" seria inventar uma
  precisão que não existe.
- **Legenda "Baseado em: ..." do Resumo Falado** - omitida. Existiria dado real por trás
  (`activity.contentId`), mas exigiria uma chamada de API nova nesse componente - fora do escopo de
  uma fase que é só estilo (a instrução do prompt foi explícita: "nunca lógica... chamadas de API").
- **Campo de justificativa do Cloze como microfone** - mantido como campo de texto. `Justification`
  é sempre texto no domínio (Fase 4); nenhum áudio é aceito para esta atividade (só `VoiceSummary`
  tem endpoint de áudio) - um botão "toque para gravar" que não grava seria uma afordância falsa.
- **Fonte "Cousine" do bloco de código** - reaproveitado `font-mono` (Fira Code) em vez de somar
  uma 4ª família de fonte ao app.
- **Rodapé de telemetria fake** (não aparece nas 8 telas, mas é o mesmo critério já usado desde a
  Fase 18) - nenhuma tela deste app renderiza um número sem dado real por trás.

## Testes

- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`). Sem mudança de backend - `dotnet build`/`dotnet test` não re-executados (nenhum
  arquivo `.cs` tocado nesta fase).
- **Verificação visual** (Postgres real, Playwright, screenshot de cada uma das 8 telas comparado
  ao node correspondente do Figma): Leitura, Resumo Falado (idle + gravando, `--use-fake-device-
  for-media-stream`), Vídeo, Quiz, Ligar Palavras, Cloze Test, Roleplay e o FeedbackPanel (estado
  de erro) - todas renderizadas de ponta a ponta, cores/tipografia/espaçamento/cartão/sidebar
  conferindo com o Figma.
- **Smoke test pedido no prompt** (Leitura → Resumo → Vídeo → Quiz, Dia 1 real, sem manipular
  dados): percorrido de ponta a ponta sem travar. Resumo Falado com áudio fake (Chromium headless)
  não foi avaliado pela Groq (silêncio) - fluxo seguiu via API só pra não travar o restante do
  smoke test; a fidelidade visual do gravador (idle + gravando) já tinha sido capturada antes disso.
- **Ligar Palavras/Cloze/Roleplay** (Dias 2-4 do seed, sem verificação ao vivo desde a Fase 9):
  data ajustada via SQL + `POST .../complete` do dia anterior antes de cada troca (evita o 409
  `daily_em_andamento`, mesmo artefato de técnica de teste documentado na Fase 15) - todas as 3
  telas confirmadas ao vivo pela primeira vez.
- `console --errors`: limpo (só ruído esperado do áudio fake/Groq, filtrado).

## Dúvidas ou pontos abertos

- **Nav fixo (`App.tsx`) sobrepõe o canto superior das telas de sessão em `/hoje`.** `/hoje` fica
  dentro do shell `<App/>` (nav "Hoje/Início/Conteúdo" + badge do usuário), diferente de
  `/onboarding`/`/login` (fora do shell, full-bleed). As telas de sessão são desenhadas como
  "full-bleed" no Figma (sem nav visível) - o `PenaltyGauge`/botão de configurações (fixos no topo)
  ficam parcialmente atrás do nav. Pré-existente (não introduzido nesta fase - o mesmo já acontecia
  com Leitura/Vídeo desde a Fase 7/13a), não corrigido aqui porque a correção é uma mudança de
  **estrutura de rota** (mover `/hoje` pra fora do `<App/>`, como o onboarding já é), não de estilo
  - fora do escopo explícito desta fase. Fica como candidato claro pra uma fase futura.
- Nenhum token novo além de `--color-stroke`/`--font-sans` foi necessário - o resto da paleta já
  batia com o Figma.
