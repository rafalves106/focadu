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

## Etapa 3: Início, Trilha e Visão da semana (12/11/2026)

Figma: Início `15:2` (dia por fazer), `15:477` (dia feito, reforço pendente), `15:833` (1º dia, celular); Trilha
`18:1613`; Visão da semana `28:1242`, celular `34:2136`; Nó de dia `12:638`, Ícone `12:323`, Segmento `12:430`.
Nenhum backend novo: tudo sai de GET /api/courses/{id}, GET /api/today e GET /api/weeklies/{id}.

- **Componentes novos**: `ui/PixelIcon` (check, lock, play, code, castle, pendente, desenhados na grade em SVG,
  cor por `currentColor`), `trail/DayNode` (as 8 variantes do Nó de dia; feito com reforço = ponto âmbar de 10
  no canto), `trail/WeekPath` (nós ligados por traço verde depois de Dia feito; `fill` estica até a largura do
  cartão) e `WeekSegments` (o caminho no celular, segmentos de 6 px + castelo). Estado de cada nó em
  `lib/weekPath.ts`: Atual = o Dia que dá pra fazer agora; se o Dia de hoje já foi feito no curso, o próximo
  fica Disponível (número, "abre amanhã"); o code comigo mostra a borda âmbar até chegar a vez dele; castelo
  aberto quando os dias da semana estão feitos.
- **Ajustes nos componentes da etapa 1**: `Breadcrumb` aceita segmento com link (`{ label, to }`), `Button` ganhou
  `ButtonLink` (o mesmo botão como link), `Card` ganhou `pad` (respiro e vão; linhas de lista e celular usam
  menos) e a Fala `devolutiva` usa o Retrato 40 do Figma (caixa elevada com borda, sprite 32 no meio).
- **`tela-cheia`** (`index.css`): a altura exata entre a nav e a barra inferior (sem a barra a partir de md). As
  três telas usam isso e não rolam a janela em nenhum tamanho. A rolagem por dentro ficou só como último
  recurso: na lista da Trilha e da Visão da semana (módulo ou semana que não caiba) e no Início inteiro.
- **Início** (`StartDashboard`, molde Hub): fio `Curso · Semana · Dia`, cartão Destaque com o único Primário,
  caminho da semana; à direita (400, 432 a partir de 1400 px) a Fala, "Você" e "Seus cursos". Lógica em
  `lib/startScreen.ts` (`buildStartState`):
  - dia por fazer: "Hoje · Dia 3 de 72", título do Dia, o que tem nele ("Leitura, 3 perguntas e uma conversa por
    voz.", contado das atividades), Primário "Começar o dia" / "Continuar o dia" e ao lado "Vale +1 gem e mantém
    a sequência de 6 dias" ou "Você parou na etapa 4 de 11";
  - dia feito (ou semana esperando o projeto): o Destaque vira a pendência, na ordem reforço ("Fazer o reforço"
    + Secundário "Rever o Dia 3" + "Amanhã: Dia 4 · título") > projeto aberto ("Abrir o projeto"; entregue =
    Secundário "Ver o projeto", sem Primário) > publicação pendente ("Publicar a semana", leva à Visão da semana,
    onde o modal abre) > prévia de amanhã (sem Primário). O eyebrow vira "Dia 3 feito · +1 gem · 7 dias seguidos";
  - 1º dia (nenhum Dia fechado no curso): sem "Vale +1 gem", sem cartão "Você", "Seu curso" com o tamanho do
    curso, a fala de apresentação da Focada do quadro `15:833` e "6 dias e, no fim, o Projeto da semana. Um dia
    por vez." no caminho.
  - "Seus cursos": com mais de um curso, "Trocar curso" (Secundário) abre um Modal com a lista (troca o `?curso=`)
    e "Ver outros cursos" (some pra aluno de turma). Com um curso só, sem botão.
  - Celular: fica fio, Destaque, caminho em segmentos e a Fala; "Você" e "Seus cursos" somem abaixo de md (não
    cabem sem rolar; sistema.md §9 já previa o "Seu curso" sumindo).
  - Saíram `DailyMissionCard`, `AgentCard` e o `WeekPathCard` antigo (mapa com Focada e selo BOSS). O
    `CourseSlots` ficou: a escolha de curso da sessão (`TodayCourseChoice`, etapa 4) ainda usa.
- **Trilha** (`CourseDetailPage`, molde Lista): fio `Curso · Trilha`, "Trilha do curso" + "12 semanas · 72 dias ·
  12 projetos · você está no dia 3", abas de módulo (`Nav/Item`; no celular só "Módulo N"), uma linha por semana
  (info | nós + castelo | ação de 200), legenda. A semana em andamento é o cartão Destaque com o Primário
  "Continuar · Dia N" (ou "Abrir o projeto" / "Publicar a semana"; se o Dia de hoje já foi feito, "Dia N abre
  amanhã" sem Primário). Semana fechada: "Rever a semana"; trancada: "Abre com o projeto da semana N". Resumo de
  400 a partir de `xl`: Fala, Dias/Projetos/Reforços pendentes, barra de 6 px, "Faltam N dias pro castelo da
  Semana N", e "Deste curso" (Caderninho, Certificações, Ranking só depois do 1º dia). Saíram o `CourseTrail`, o
  "Trocar de trilha" e os atalhos de Conquistas.
- **Visão da semana** (`WeeklyDetailPage`, molde Lista): fio `Curso · Trilha · Semana N` (Trilha com link),
  "Semana 1 · tema", uma linha por Dia (Nó, título, "10/12 aprovadas" ou "Etapa 7 de 11 · 6 aprovadas até
  agora" ou "Abre depois do Dia 3", "code comigo · em Python" em âmbar, Chip âmbar "Reforço pendente") e a
  linha do Projeto da semana. Ações: "Fazer o reforço" (Secundário), "Rever o dia" (link), o Primário do Dia
  atual ou "Abrir o projeto". Resumo a partir de `xl`: Fala, Dias / Aprovadas / Reforços, o que vem, revisão
  semanal (âmbar), cartão Âmbar "Falta publicar" com o Primário "Publicar a semana" e o objetivo do projeto (1º
  parágrafo do enunciado). Saíram o número de erros em vermelho, as certificações do módulo, "Como a semana
  fecha", a navegação Semana anterior/seguinte (volta pela Trilha no fio) e o `WeekTrail`.
- **Falas da Focada** (`lib/focadaMapLines.ts`) no vocabulário novo: sem "mapa", "névoa", "ponte" nem "post";
  "Dia" com maiúscula; Início ganhou as falas dele em `startFocadaLine`.
- **Ajuda** (`guiaTelas.ts`): Início, Trilha e Visão da semana reescritas pras telas novas. Nenhum `data-guia`
  sobrou nelas (saiu também o do `CourseSlots`).
- Saíram 5 sprites do mapa que ficaram sem uso (`castelo-concluido`, `castelo-trancado`, `focada-marcador`,
  `ponto-disponivel`, `ponto-trancado`) e a animação `map-bob`.

### Inter

Continua no `--font-sans`. As três telas desta etapa não dependem dela (todo texto tem estilo explícito), mas
ainda há 24 elementos com `text-xs/sm/base` sem fonte própria, mais o texto que só herda:
- etapa 4 (sessão): `activities/DiagramBlock` (8), `activities/MarkdownBlock` (3), `code/LabCodeStepActivity`
  (3), `code/TerminalMissionActivity` (2), `CompletionSummary` (2), `CodeStepActivity`, `DialogueBox`;
- etapa 5 (acesso): `legal/LegalContent`, `ComingSoon` (2), e os formulários de login que herdam;
- etapa 6 (lugares): `squad/InviteModal`;
- `/gestao` herda a Inter inteira; quando ela sair do `--font-sans`, o painel precisa de uma fonte própria
  (fora das telas do aluno, a regra 8 não vale lá).
Sai do `--font-sans` no fim da etapa 6, com a gestão recebendo a fonte dela.

### Decisões tomadas sem perguntar (conferir)

- **Nome do projeto**: o quadro mostra "Projeto da semana · Inspetor de site", mas o título (`projeto.json`
  `title`) não vem no `WeeklyProjectDto`. Ficou só "Projeto da semana" e o objetivo vem do 1º parágrafo do
  enunciado. Expor o título é uma linha no backend: pendente da sua decisão.
- **"Uns 25 minutos"**: a API não tem duração por Dia; a meta do Dia fica só com o que tem nele.
- **"Dia 3 de 72"**: o total é contado dos Dias que existem no banco (hoje só D1 a D6 curados), então a tela
  mostra "de 6" até o resto entrar. A contagem certa por curso é o conserto à parte da direção §6.6.
- **"Deste curso"**: subtítulos fixos ("Suas notas por dia", "Sua posição na turma") em vez de "1 nota" e "você
  em 15º", pra não pôr mais duas chamadas na Trilha.
- **Fala da Focada** na Trilha e na Visão da semana só aparece a partir de `xl` (junto do resumo), como no
  celular do quadro `34:2136`; entre 1024 e 1279 px essas telas ficam sem fala.
- Cartões do Início no celular com respiro de 16 (24 no Figma), pra caber sem rolar.

### Sem verificação visual (sessão sem navegador)

Nada desta etapa foi visto rodando. As alturas foram somadas à mão contra 1440x900, 1366x768 e 390x844 (a Visão
da semana no desktop fica a ~6 px do limite; a Trilha no celular, a ~12 px). Conferir:
- Início nos três estados (desktop, notebook, celular), principalmente o Destaque com reforço + Secundário e o
  celular com o Chip de reforço (é o caso mais alto);
- Nó de dia: ícones SVG nítidos, ponto âmbar no canto, castelo de 48 alinhado com os nós de 40, traços no meio;
- Trilha: abas (no celular rolam de lado se não couberem), três linhas por módulo sem rolar, legenda, botão no fim
  da tela abaixo de 1024 px;
- Visão da semana: sete linhas no notebook sem rolar, a linha atual com sombra verde, publicação pendente;
- Modal "Trocar curso" com dois cursos;
- a contagem "Dia N de M" e o "k/n aprovadas" com dados reais.
