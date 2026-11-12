# Fase 109 — redesign v1, etapa 1: tokens, tipos e componentes básicos

12/11/2026. Primeira etapa do código do redesign aprovado no Figma (`KZkoT5d33KsbBWEcQ0EBXj`; direção em
`docs/design/direcao.md`, manual em `docs/design/sistema.md`, ordem das etapas no §11 dele).

- `index.css`: tokens novos da coleção "Focadu tokens v2" (`accent-hover`, `accent-tint`, `accent-shadow`,
  `alert-tint`, `project-tint`, `stroke-strong`, `disabled`, `pele-1..5`), `secondary` passa de `#9a9a9a`
  pra `#b4b4b4`, estilos de texto como utilitários (`text-display`, `text-titulo`, `text-lead`,
  `text-corpo`, `text-pequeno`, `text-rotulo`, `text-rotulo-sm`, `text-codigo`) e `--tamanho-*`.
- `components/ui/`: `Button` (Primário/Secundário/Perigo, desabilitado, carregando), `Card` (Padrão,
  Destaque, Âmbar, Suave), `Chip`, `Breadcrumb` (o "fio"), `FocadaLine` (Abertura/Devolutiva ×
  Neutro/Acerto/Erro, com os sprites reais), `Field`, `Choice` (Escolha) e `Checkbox` (Caixa de seleção).
- Ainda não usados por nenhuma tela: entram a partir da etapa 2 (casca: nav, barra inferior, menu do agente).
- A Inter continua como `--font-sans` por enquanto: trocar o corpo do app inteiro pra VT323 antes das telas
  serem refeitas quebraria o layout das telas antigas. Sai junto com a etapa 2/3.
- Não conferido no Figma por variável: `disabled` (#2a2a2a, tirado do print do Botão desabilitado) e a
  sombra neutra de modal/gaveta (entra na etapa 2). O espaçamento de letra dos rótulos (4 no Figma) foi lido
  como 4% (0,04em), pela largura medida no print do Botão.
- Sem verificação visual no navegador (sessão sem navegador): conferir os componentes quando a etapa 2
  colocar o primeiro deles na tela.

## Etapa 2: casca (12/11/2026)

Figma: Nav/Desktop `53:103`, Barra inferior `53:121`, Menu do agente `33:1317` (celular `34:2761`),
Configurações `33:1454`, Ajuda da tela `33:1655`, Gaveta `13:579`, Modal `13:584`.

- **Nav superior** (`components/shell/TopNav.tsx`): logo (sprite `logo-wordmark` em 3x) à esquerda, destinos
  com rótulo no centro (Hoje · Trilha · Squad · Ranking, indicador de 4 px no ativo) e o agente à direita
  (avatar 32 + gems + dias), que abre o menu do agente. 64 px a partir de md, 56 no celular (só logo e agente).
  Hoje = Início (`/start`); Trilha, Semana e Projeto acendem "Trilha". Pedidos de entrada no squad viram um
  número âmbar no Squad. `--nav-height` passou a 56/64.
- **Barra inferior** (`components/shell/BottomBar.tsx`): abaixo de md, fora do Dia (`/hoje` tem a própria
  barra de ferramentas). Hoje, Trilha, Squad, Ranking e "Você" (abre o menu). O `<main>` reserva os 64 px.
- **1º dia fechado** (`lib/useShellData.ts`): sai do `lastSession` do calendário de estudo (só existe depois de
  um dia concluído), sem backend novo. Antes disso somem Squad, Ranking, Loja (do menu) e os números do agente.
  Enquanto carrega, conta como "ainda não"; se a consulta falhar, conta como "sim" (não esconde destino por erro).
- **Sem agente**: contorno tracejado verde (`border-accent`, decisão do dono) no lugar do avatar na nav, na barra
  inferior e no menu, com "Criar meu agente ›" no menu (leva a `/perfil?abrir=guarda-roupa`, porque a Loja está
  escondida no 1º dia).
- **Menu do agente** (`components/shell/AgentMenu.tsx`, em `Drawer`): Perfil, Loja, Caderninho, Certificações,
  Configurações, Ajuda desta tela, Gestão (só admin; saiu da nav) e "Sair da conta" (Perigo, com a confirmação
  da Focada). Configurações e Ajuda fecham a gaveta antes de abrir o modal.
- **Status da IA**: o robozinho (`AiStatusMenu`, `nav-ia.png`) saiu. Vira o ponto no avatar (no menu, sempre; na
  nav, só quando a IA não está 100%, pra não pôr um ponto verde fixo no topo) e a linha "Status da IA" nas
  Configurações, com "Conferir agora". Textos em `lib/aiStatusText.ts`.
- **Configurações** (`SettingsMenu.tsx`, no `Modal` novo): sons (Caixa de seleção + Escolha Baixo/Médio/Alto =
  volume 0,25/0,5/1), limite de gravação, squad, interesses e atalhos, status da IA, Fechar. Saíram Aparência e
  Notificações "Em breve" e o "Sair da conta". O limite continua 5/10/15 min (o quadro mostra 3/5/10 como dado de
  exemplo; mudar as opções seria mudar comportamento).
- **Ajuda desta tela** (`components/shell/HelpModal.tsx`): título, Fala da Focada e os itens de `guiaTelas.ts`.
  Das abas antigas ficaram dois links discretos: "Perguntas frequentes" (a lista com busca) e "Achou um
  problema?" (o formulário do teste fechado, com tela/endereço/navegador/hora). A tecla "?" continua abrindo.
- **Saíram** o botão "?" flutuante, a dica piscando da 1ª visita, o tour do app e os tours das telas
  (`HelpButton`, `TourOverlay`, `GuideModal`, `guideAnchors`, `APP_TOUR`), o `GlobalNav`, o `UserMenu` e o
  `EquippedFramePreview` (só o `UserMenu` usava). `api.markGuideSeen` e `User.SeenGuides` ficaram sem uso no
  front; o backend não mudou. Os `data-guia` das telas antigas ficaram (inofensivos; saem quando cada tela for refeita).
- **`guiaTelas.ts`** com o vocabulário novo: Dia, Hoje, erros do dia, sequência, code comigo, Projeto da semana,
  gems. Início segue o quadro `33:1655` (Hoje, Caminho da semana, Você, Pendências, Seus cursos). As telas fora do
  app (login, senha, confirmar, aceite, onboarding) seguem no arquivo, mas hoje não têm por onde abrir a ajuda.
- **Componentes novos**: `ui/Modal` (véu 72%, borda forte, sombra sólida neutra 4 px, "Fechar · Esc") e
  `ui/Drawer` (360 à direita abaixo da nav; celular de baixo, largura cheia). ESC e foco em `lib/useDialogKeys.ts`
  (ESC em captura, como o `PixelModal`, e o foco volta pra quem abriu).

### Inter

Fica no `--font-sans` por mais uma etapa. Ainda há 30 elementos em 30 arquivos com `text-xs/sm/base` sem fonte
explícita (formulários de login, painel de gestão, atividades), além do texto que só herda; em 12 a 16 px a VT323
fica ilegível nesses lugares. A casca nova não depende dela (tudo com estilo de texto explícito). Sai na etapa 3
junto com as telas, conferindo cada uma.

### Sem verificação visual (sessão sem navegador)

Nada desta etapa foi visto rodando. Conferir em desktop (1440), notebook (1366) e celular (390):
- nav: centro dos 4 destinos, indicador verde, número âmbar no Squad, caixa do agente com gems/dias;
- contorno tracejado verde (CSS `dashed` 2 px; o Figma usa traço 4/4, pode sair diferente);
- barra inferior fixa sem cobrir conteúdo e com a área segura do iPhone; ausente no `/hoje`;
- gaveta do menu (desktop à direita abaixo da nav; celular de baixo) e a confirmação de sair por cima dela;
- Configurações e Ajuda cabendo sem rolar em 1366x768 (se não couber, a caixa rola por dentro);
- o 1º dia: conta nova sem dia feito deve ver só Hoje e Trilha, sem Loja no menu e sem números no agente;
- telas antigas com a nav nova (alturas que descontavam `--nav-height` mudaram de 57/73 pra 56/64).
