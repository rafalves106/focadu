# Comparação Figma x código - Fase 109 (redesign v1, etapas 1 a 3)

12/11/2026. Leitura só (nada editado no Figma nem no app). Figma `KZkoT5d33KsbBWEcQ0EBXj`; prints em
`docs/design/prints/fase-109/{desktop,notebook,celular}/`. Telas: casca (nav, barra inferior, menu do agente,
Configurações, Ajuda, confirmação de sair), Início, Trilha, Visão da semana e Nó de dia.

Gravidade: **alta** = estrutura, hierarquia, componente errado ou faltando, conteúdo cortado; **média** =
espaçamento, tamanho, cor ou fonte visivelmente fora; **baixa** = detalhe de pixel.
Marcações: **[dado]** = diferença de dado, não de layout; **[decisão]** = vem de uma das "Decisões tomadas sem
perguntar" do `docs/fases/fase-109/README.md`; **[sem quadro]** = não há quadro no Figma para esse tamanho ou
estado, comparei com o `sistema.md` e com o quadro mais próximo.

Quadros usados: Início `15:2` (desktop, dia por fazer), `15:477` (notebook, dia feito com reforço), `15:833`
(celular, 1º dia); Trilha `18:1613` (só desktop); Visão da semana `28:1242` (desktop) e `34:2136` (celular);
Menu do agente `33:1317` e `34:2761`; Configurações `33:1454`; Ajuda `33:1655`; Nav/Desktop `53:103`; Barra
inferior `53:121`; Nó de dia `12:638`; Cartão `13:18`. Procurei no arquivo (get_metadata nas páginas Âncoras e
Telas) e **não existem quadros** de: Trilha notebook/celular, Visão da semana notebook, Início desktop 1º dia,
confirmação de "Sair da conta", modal "Trocar curso", Configurações e Ajuda no celular.

## Resumo: as 10 diferenças mais importantes

1. **Alta, todas as telas do desktop: margem 24 em vez de 32 e coluna da direita 400 em vez de 432 a 1440 px.**
   Causa confirmada num build: as regras `min-[1400px]:p-8` e `min-[1400px]:w-[432px]` saem no CSS *antes* de
   `md:p-6` e `lg:w-[400px]` (Tailwind v4 não ordena breakpoint arbitrário em px junto dos de rem), então
   nunca vencem. Arquivos: `routes/StartDashboard.tsx:102,122`, `routes/CourseDetailPage.tsx:57`,
   `routes/WeeklyDetailPage.tsx:65` (e onde mais houver `min-[1400px]`). Conserto provável: breakpoint em rem
   (`min-[87.5rem]`) ou um `--breakpoint-*` no `@theme`.
2. **Alta, Visão da semana desktop e notebook: a linha do Projeto da semana fica cortada** no fim da tela (o
   rótulo "PROJETO" corta no notebook; a borda de baixo some no desktop). O quadro `28:1242` cabe com linhas de
   78 px; no código as linhas têm 86 (`md:py-3`, `WeeklyDetailPage.tsx:274`).
3. **Alta, Início celular com Dia feito: a Fala da Focada fica cortada pela barra inferior** (a tela rola por
   dentro). O título extra do cartão "Caminho da semana" (item 10) e o Secundário empilhado empurram tudo.
   `routes/StartDashboard.tsx:102`, `components/start/WeekPathCard.tsx:57`.
4. **Alta, confirmação de "Sair da conta" ainda é o diálogo antigo** (`PixelConfirmDialog`: moldura dupla cinza,
   escolhas em âmbar com seta). O `sistema.md` manda confirmação no `Modal` novo, com Botão Perigo, e proíbe
   moldura dupla cinza. [sem quadro] `components/shell/AgentMenu.tsx:13,99`.
5. **Alta, Trilha no celular usa Nós de dia de 40 px** em vez de `Etapa/Segmento` + castelo (o `sistema.md` §4
   diz "Nó de dia: não use no celular"); a lista rola e a 4ª semana aparece cortada. [sem quadro]
   `routes/CourseDetailPage.tsx:210` (`WeekPath` sem alternativa `WeekSegments` abaixo de md).
6. **Média/alta, Trilha: semanas futuras dizem "Ver a semana" (link verde)** enquanto os nós estão trancados; o
   quadro `18:1613` mostra "Abre com o projeto da semana N" em cinza. E o code comigo (D12, D18...) aparece
   âmbar em semana trancada; no quadro é cadeado. `CourseDetailPage.tsx:186-194` (depende de `week.isLocked`,
   que veio `false` da API: conferir) e `lib/weekPath.ts:90` (`day.isBridge ? 'code'` sem olhar a trava).
7. **Média, Configurações: a Caixa de seleção marcada não tem o check** (só o quadrado verde cheio) e a Escolha
   selecionada mostra um quadradinho em vez do check do quadro `33:1454`. `components/ui/Checkbox.tsx`,
   `components/ui/Choice.tsx:24-25`. Também sobrou o rodapé "Termos de Uso · Política de Privacidade / Aceitos
   em" sublinhado, que o quadro não tem (`components/SettingsMenu.tsx:141`).
8. **Média, eyebrow do cartão Destaque em verde** ("HOJE · DIA 2 DE 72", "DIA 1 FEITO..."). No componente
   Cartão (`13:18`) e nos quadros do Início ele é cinza; verde só no "SEMANA 01" da Trilha, que tem cor própria.
   `components/ui/Card.tsx:15`.
9. **Média, Visão da semana celular: o Primário "Continuar · Dia N" fica colado na barra inferior**, com um vão
   vazio acima; no quadro `34:2136` ele vem logo abaixo da lista. `routes/WeeklyDetailPage.tsx` (botão no fim
   da coluna flex com a lista em `flex-1`).
10. **Média, Início celular: o cartão "Caminho da semana" ganhou o título "Faltam N dias para o Projeto da
    semana"** (2 linhas no celular), que o quadro `15:833` não tem. `components/start/WeekPathCard.tsx:32-57`.

Fora das telas: **[dado] a Trilha não tem abas de módulo** porque o `secret/conteudo/web-security/curso.json`
tem 1 módulo só com as 12 semanas (o código só desenha abas com mais de um módulo). Com o currículo em 4
módulos, as abas e as 3 linhas por módulo do quadro devem aparecer; hoje a lista mostra 12 semanas com rolagem.

Pendentes das etapas 4 a 6 (marcadas "AINDA NAO REFEITA" no índice, fora desta comparação): sessão do dia,
Perfil, Squad, Loja, Ranking, Caderninho, Certificações, Login, criar conta, esqueci a senha e Termos.

---

## Casca

### Nav superior (desktop e notebook) - `53:103`

| # | Figma | Print | Gravidade | Código provável |
|---|---|---|---|---|
| N1 | Logo desenhado: "F" + quadrado verde cheio + "CADU" em Silkscreen Bold 20, pequeno | Sprite `logo-wordmark` em 3x: maior, branco, o "O" é um anel com miolo verde | média (o `sistema.md` §9 já previa trocar pelo sprite; mas o desenho ficou diferente e maior) | `components/shell/TopNav.tsx` |
| N2 | Destinos centralizados no espaço entre logo e agente (centro ~686 px em 1440) | Centralizados na tela (centro 720) | baixa | `TopNav.tsx` (grid de 3 colunas) |
| N3 | Caixa do agente apagada sob o véu quando o menu abre | Caixa ganha borda verde com o menu aberto | baixa (feedback razoável, fora do quadro) | `TopNav.tsx:72` |
| N4 | "8 GEMS · 6 DIAS" | "1 GEMS · 1 DIA" | baixa: plural errado em "1 GEMS" (texto, não layout) | `TopNav.tsx` (rótulo das gems) |
| N5 | Sem agente: contorno tracejado 32 em `borda/forte`, traço 4/4 | Tracejado verde, traço do CSS `dashed` | [decisão do dono: verde] ok; traço diferente do 4/4, baixa | `components/shell/AgentAvatar.tsx` |

### Nav superior (celular) - topo de `15:833` e `34:2136`

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| N6 | Agente solto (sprite 32) ou contorno tracejado, sem caixa | Agente dentro de uma caixa com borda 2 px e respiro (a mesma caixa do desktop) | baixa/média | `TopNav.tsx:72` (classe da caixa vale em todos os tamanhos) |

### Barra inferior (celular) - `53:121`

Bate com o quadro nos dois estados (com e sem agente) e no 1º dia (Hoje, Trilha, Você). Sem diferença de layout.
Tracejado do "Você" sem agente em verde: [decisão do dono].

### Menu do agente - desktop `33:1317`, celular `34:2761`

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| M1 | Desktop: gaveta 360 à direita, cabeçalho, avatar, nome, gems/dias, status da IA, 6 itens, "Sair da conta" Perigo | Igual | - | - |
| M2 | Celular: retrato do agente 48 | Retrato 72 (sprite 64), o mesmo do desktop | baixa | `components/shell/AgentMenu.tsx:37-38` |
| M3 | Nome do quadro "Ana Souza" | "Aluna F109 4" | [dado] | - |

### Confirmação de "Sair da conta" - [sem quadro]

| # | Esperado (`sistema.md` §2 regra 7, §4 Modal) | Print | Gravidade | Código |
|---|---|---|---|---|
| S1 | `Modal` novo (véu 72%, borda forte, sombra sólida 4 px, "Fechar · Esc") com a Fala e um Botão Perigo + Secundário | Diálogo antigo: retrato e balão com moldura dupla cinza, bloco "VOCÊ" com "Não, fico por aqui ◀" em âmbar e "Sim, sair da conta" em texto | **alta** (componente errado; moldura dupla cinza está na lista do que não usar) | `AgentMenu.tsx:13,99` (`PixelConfirmDialog`) |

### Configurações - `33:1454` (só desktop)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| C1 | Caixa de seleção marcada: quadrado verde com check escuro | Quadrado verde cheio, sem check | média | `components/ui/Checkbox.tsx` (`checked:bg-accent` sem ícone) |
| C2 | Escolha selecionada: check verde antes do texto | Quadradinho verde de 8 px | média | `components/ui/Choice.tsx:24-25` |
| C3 | Fim do modal: só "Fechar" | "Fechar" + à direita "Termos de Uso · Política de Privacidade" sublinhados e "Aceitos em 12/11/2026" | média (elemento a mais; decidir se fica, e com que estilo) | `components/SettingsMenu.tsx:141` (`LegalFooter`) |
| C4 | Limite 3/5/10 min | 5/10/15 min | [decisão] (o README manteve as opções reais) | - |
| C5 | Status da IA sem link | "Conferir agora" ao lado | [decisão do README, etapa 2] | - |

### Ajuda desta tela - `33:1655` (Início, desktop)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| A1 | Cinco itens: Hoje, Caminho da semana, Você, **Pendências**, Seus cursos | Quatro: falta "Pendências" (o README diz que segue o quadro) | média | `lib/guiaTelas.ts` (entrada do Início) |
| A2 | Texto dos itens curto, uma linha cada, em cinza claro | Textos de 2 linhas, em branco (`text-primary`) | baixa (cor) / [dado] (texto) | `components/shell/HelpModal.tsx:41` |
| A3 | Só "Entendi" no fim | "Entendi" + "Perguntas frequentes" + "Achou um problema?" | [decisão do README, etapa 2] | - |

---

## Início

### Desktop 1440x900, dia por fazer - `15:2` x `251-inicio-dia-por-fazer-com-agente.png` (e `151`)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| I1 | Margem 32; coluna da direita 432 (x 976 a 1408); fio em y 103 | Margem 24; coluna 400 (x 1016 a 1416); fio em y 94 | **alta** (grade inteira fora; ver resumo, item 1) | `StartDashboard.tsx:102,122` |
| I2 | Eyebrow do Destaque cinza | Verde | média | `components/ui/Card.tsx:15` |
| I3 | Título do cartão a 38 px do eyebrow | A 31 px | baixa | `Card.tsx` (gap do cabeçalho) / `HighlightCard.tsx` |
| I4 | "Leitura, 3 perguntas, 2 lacunas e uma conversa por voz. Uns 25 minutos." | "3 leituras, 4 conversas por voz, 3 perguntas, 2 lacunas, ligar palavras e um roleplay." | [dado] + [decisão: sem "Uns 25 minutos"] | - |
| I5 | Texto em VT323 fino | O mesmo texto parece mais grosso em todo o app | baixa, a confirmar num navegador real: o CSS não pede negrito (nenhum `font-weight`); pode ser só a renderização do Chromium headless | `index.css` (estilos de texto) |
| I6 | Seus cursos com "Trocar curso" | Seu curso sem botão | [dado] (conta com um curso; o README diz que o botão só aparece com dois) | - |
| I7 | Destaque com sombra sólida verde 4/4 | Igual | - | - |

### Notebook 1366x768, dia feito com reforço - `15:477` x `201-inicio-dia-feito-reforco-com-agente.png` (e `101`)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| I8 | Estrutura (Destaque com Primário + Secundário + "Amanhã", caminho, Fala, Você, Seus cursos) | Igual; margem 24 e coluna 400 batem (aqui o notebook é o esperado) | - | - |
| I9 | Eyebrow cinza | Verde | média (o mesmo I2) | `Card.tsx:15` |
| I10 | Cartão "Você" sem a linha "Folga livre" | Com "Folga livre" | baixa (o quadro desktop tem; só falta espaço no notebook) | `components/start/YouCard.tsx` |
| I11 | "10 minutos só com as 3 perguntas..." | "Só as 6 atividades que escaparam..." | [dado] | - |

### Celular 390x844, 1º dia - `15:833` x `01-inicio-1o-dia-sem-agente.png` (e `51`)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| I12 | Cartão "Caminho da semana" só com eyebrow, segmentos e a frase | Ganhou o título "Faltam 6 dias para o Projeto da semana" (2 linhas) | média | `components/start/WeekPathCard.tsx:32-57` (título fixo em todos os tamanhos) |
| I13 | Cartões com respiro 24 | Respiro 16 | [decisão] | - |
| I14 | "Seu curso" abaixo da Fala, encostando na barra | Some abaixo de md | [decisão] (o `sistema.md` §9 já admitia sumir no 1º dia) | `StartDashboard.tsx:134` |
| I15 | Agente sem caixa no topo | Caixa com borda em volta do tracejado | baixa (N6) | `TopNav.tsx:72` |

### Celular, Dia feito com reforço - [sem quadro] `201-inicio-dia-feito-reforco-com-agente.png` (e `101`, `151`, `251`)

| # | Esperado | Print | Gravidade | Código |
|---|---|---|---|---|
| I16 | Tela sem rolagem (`sistema.md` §11: nenhum nó sai do quadro) | A Fala da Focada sai cortada pela barra inferior; a tela rola por dentro | **alta** | `StartDashboard.tsx:102` (`overflow-y-auto`), `WeekPathCard.tsx` (título extra), `HighlightCard.tsx` (Secundário de largura cheia) |

### Desktop 1º dia e "Trocar curso" - [sem quadro] `01`, `51`, `301`-`303`

Seguem o molde Hub e o `Modal`; nada fora do sistema além de I1, I2 e I12. "Dia 1 de 6" no Linux: [dado].

---

## Trilha

### Desktop 1440x900 - `18:1613` x `256-trilha-dia-por-fazer-com-agente.png` (e `06`, `106`, `156`, `206`)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| T1 | Abas "Módulo 1 · Fundamentos da Web" ... "Módulo 4 · Defesa" e 3 semanas por módulo | Sem abas; 12 semanas numa lista que rola por dentro (5 visíveis) | [dado] (curso.json com 1 módulo; o código só desenha aba com mais de um) | `CourseDetailPage.tsx:70` |
| T2 | Margem 32 | Margem 24 | **alta** (item 1 do resumo) | `CourseDetailPage.tsx:57` |
| T3 | Semana futura: nós com cadeado e, na ação, "Abre com o projeto da semana 1" em cinza | Nós com cadeado e "VER A SEMANA" em verde | média/alta (manda o aluno pra uma semana trancada; contradiz os nós) | `CourseDetailPage.tsx:186-194` (`week.isLocked` veio `false`: conferir a API) |
| T4 | Code comigo de semana trancada = cadeado cinza (D12 do quadro) | Borda e ícone âmbar em toda semana (D12, D18, D24, D30) | média | `lib/weekPath.ts:90` |
| T5 | Linha atual: "2 de 6 dias · reforço do Dia 1 pendente" | Igual (com os números da conta) | [dado] | - |
| T6 | Resumo: "3% do curso. Faltam 4 dias para o primeiro castelo." | "Faltam 5 dias pro castelo da Semana 1." | [dado] / texto | - |
| T7 | "Deste curso": "1 nota", "Você em 15º" | "Suas notas por dia", "Sua posição na turma" | [decisão] | - |
| T8 | Legenda na base com respiro | Legenda colada na base da tela (y 863 de 900) | baixa | `CourseDetailPage.tsx:101` |

### Notebook 1366x768 - [sem quadro] `256-trilha-...png`

Mesmo molde do desktop com margem 24 e resumo de 400 (correto para notebook). Mesmos T1, T3 e T4. Cabem 4
linhas; com o currículo em módulos de 3 semanas a lista não precisaria rolar.

### Celular 390x844 - [sem quadro] `256-trilha-...png`

| # | Esperado (`sistema.md` §4) | Print | Gravidade | Código |
|---|---|---|---|---|
| T9 | Nó de dia não vai no celular: usar Segmento + ícone castle | Nós de 40 px com traços, um cartão por semana | **alta** | `CourseDetailPage.tsx:210` (usar `WeekSegments` abaixo de md, como o Início) |
| T10 | Tela sem rolagem | Lista rola; a 4ª semana aparece cortada atrás do Primário | **alta** (consequência de T1 e T9) | `CourseDetailPage.tsx:95` |
| T11 | Primário no fim, largura cheia | Igual | - | - |

---

## Visão da semana

### Desktop 1440x900 - `28:1242` x `258-semana-dia-por-fazer-com-agente.png` (e `08`, `108`, `158`, `208`)

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| V1 | 7 linhas (6 Dias + Projeto) de 78 px, vão 16, tudo cabe | Linhas de 86 px; a linha do Projeto sai pela base (sem a borda de baixo) | **alta** | `WeeklyDetailPage.tsx:274` (`md:py-3`; o quadro usa ~8 px) e `:82` |
| V2 | Margem 32, resumo 400 em x 1008 | Margem 24, resumo em x 1016 | **alta** (item 1 do resumo) | `WeeklyDetailPage.tsx:65` |
| V3 | Linha do Projeto: "Projeto da semana · Inspetor de site" | "Projeto da semana" | [decisão: o título não vem no DTO] | - |
| V4 | Cartão "Projeto da semana" com título "Inspetor de site" e 3 linhas | Sem título; parágrafo de 5 linhas | [decisão] + [dado] | - |
| V5 | Linha do Dia atual: "Etapa 7 de 11 · 6 aprovadas até agora", "Continuar · Dia 3" | "14 etapas", "Começar · Dia 2" | [dado] (estado diferente) | - |

### Notebook 1366x768 - [sem quadro] `208-semana-dia-feito-reforco-com-agente.png` (e `08`, `108`, `158`, `258`)

| # | Esperado | Print | Gravidade | Código |
|---|---|---|---|---|
| V6 | Sete linhas sem rolar (o README promete) | A linha do Projeto corta no meio do rótulo "PROJETO"; a lista rola por dentro (o índice registra 1 área com rolagem) | **alta** | `WeeklyDetailPage.tsx:82,274` |

### Celular 390x844 - `34:2136` x `258-semana-dia-por-fazer-com-agente.png`

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| V7 | Primário logo abaixo da lista (y ~590) | Primário colado na barra inferior (y ~715), vão vazio de ~110 px acima | média | `WeeklyDetailPage.tsx` (lista em `flex-1` empurra o botão) |
| V8 | Fio "Trilha · Semana 1" (sem o curso) | "Web Security · Trilha · Semana 1" | baixa | `WeeklyDetailPage.tsx` (Breadcrumb) |
| V9 | Linha com reforço: só o Chip "Reforço pendente" | "4/14 aprovadas" + Chip na mesma linha | baixa | `WeeklyDetailPage.tsx:206` |
| V10 | "O primeiro script" / "Inspetor de site" curtos | "O primeiro script: o Inspetor de s..." truncado; "Projeto da semana" | [dado] + [decisão V3] | - |
| V11 | Agente sem caixa no topo | Com caixa | baixa (N6) | `TopNav.tsx:72` |

---

## Nó de dia - `12:638`, Ícone `12:323`, Segmento `12:430`

| # | Figma | Print | Gravidade | Código |
|---|---|---|---|---|
| D1 | 8 variantes; Feito com reforço = ponto âmbar 10 no canto; castelo 48 | Todas as que aparecem nos prints batem (feito, feito com reforço, atual, disponível com número, trancado, code, castelo trancado) | - | - |
| D2 | Code comigo só com borda âmbar quando é a vez da semana | Âmbar também em semana trancada | média (T4) | `lib/weekPath.ts:90` |
| D3 | Segmento no celular | Usado no Início celular, mas não na Trilha celular | alta (T9) | `CourseDetailPage.tsx:210` |
| D4 | Castelo aberto | Não aparece em nenhum print (nenhuma semana fechada nas contas) | sem verificação | - |

---

## O que não deu para verificar

- Estados sem print: castelo aberto, publicação pendente (cartão Âmbar "Falta publicar"), projeto aberto ou
  entregue no Destaque do Início, hover e foco de qualquer componente.
- Peso da fonte (I5): pode ser só a renderização do Playwright; vale olhar num navegador comum antes de mexer.
- Configurações, Ajuda e confirmação de sair no celular e no notebook não têm quadro; olhei só os do desktop.
