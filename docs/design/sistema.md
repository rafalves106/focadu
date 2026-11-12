# Sistema do redesign da Focadu (v1) — manual do figma-designer

> Fonte de verdade para desenhar as telas que não são âncora. Lê junto com `docs/design/direcao.md`
> (diagnóstico, direção e as decisões do dono na seção 6). Tudo que está aqui já existe no Figma; não
> recrie componente nem variável, instancie.

## 1. Onde está

- Arquivo: `Redesign - Focadu`, fileKey `KZkoT5d33KsbBWEcQ0EBXj`.
- Página **Redesign v1 - Sistema** (`11:2`): componentes. Linha de cima: átomos; linha de baixo (y=700):
  moléculas. Fundo da página escuro de propósito.
- Página **Redesign v1 - Âncoras** (`11:3`): as 8 telas-âncora, cada uma com título e nota de design
  130 px acima do quadro.
- Página **Redesign v1 - Telas** (`24:2`): as telas que não são âncora (seção 8), uma linha por grupo:
  acesso (y=200), onboarding e curso (1400), semana e sessões (2800), projeto (4200), hubs (5600),
  listas (7000), menu e modais (8400), celular (9800). Nunca mexa na página `Atual - telas do aluno (2026-11-11)` (`5:2`).
- Coleção de variáveis **Focadu tokens v2** (`VariableCollectionId:11:4`), 84 variáveis, 1 modo (Escuro).
- Revisão final do diretor em 12/11/2026: seção 11. Tudo que está aqui foi conferido em lote contra as 46 telas.

### Âncoras (node id)

| Quadro | Node | Estado desenhado |
|---|---|---|
| Início · Desktop 1440x900 | `15:2` | dia por fazer (semana 1, dia 3) |
| Início · Notebook 1366x768 | `15:477` | dia feito, reforço pendente |
| Início · Celular 390x844 | `15:833` | primeiro dia (Squad, Ranking, gems e sequência escondidos) |
| Sessão · Desktop · leitura | `17:753` | etapa 1 de 11, sem erro |
| Sessão · Desktop · quiz com abertura embutida | `17:904` | etapa 7, 1ª pergunta, Confirmar desabilitado |
| Sessão · Desktop · quiz com erro | `17:1282` | 1º erro do dia, devolutiva da Focada |
| Sessão · Celular · quiz com erro | `17:1697` | barra inferior de ferramentas |
| Trilha · Desktop | `18:1613` | módulo 1, semana 1 em andamento, legenda |

## 2. Regras que valem em toda tela

1. **A página nunca rola, em nenhum tamanho (desktop, notebook e celular).** Se não cabe: pagine,
   divida em etapas, mande para uma gaveta ou resuma. Rolagem interna (dentro de um painel ou gaveta)
   é o último recurso e precisa estar anotada na nota do quadro. Celular: conte com 56 de topo e 64 de
   barra inferior; sobra 724 px de conteúdo.
2. **Uma ação principal por tela**, botão `Botão / Tipo=Primário`, no fim do bloco de conteúdo,
   alinhado à esquerda (celular: largura cheia). Nunca no canto superior, nunca dois Primários.
   **Telas de consulta não têm Primário** (decisão do dono, 12/11): Perfil, Loja, Ranking,
   Certificações e Caderninho. A ação delas mora no modal que abrem (comprar no provador, criar
   agente) ou em Secundários.
3. **Fio em toda tela interna**, acima do título: `Curso · Semana · Dia · Etapa`. Último segmento
   visível em verde. Esconda os segmentos que não se aplicam; nunca mostre numeração interna
   ("Dia 8" numa semana de 6 dias): reforço é "Reforço do Dia 1".
4. **Uma fala da Focada por tela**, no topo do conteúdo (Abertura) ou logo abaixo da resposta
   (Devolutiva). Até 2 linhas. Nunca a mesma frase em telas vizinhas. Sem balão flutuante, sem "?".
5. **Vocabulário aos poucos.** Dia 1: Dia, Semana, Projeto da semana, Etapa, Focada, erro. Só depois
   que acontece: "Erros do dia" (após o 1º erro), reforço (no 3º), sequência e folga (2º dia), gems
   (1ª recompensa), code comigo (semana em que chega). Squad, Ranking e Loja ficam escondidos até o
   1º dia fechado (nav com 2 destinos; barra inferior com 3).
6. **Cores com um papel só.** Verde = ação, ativo, feito. Âmbar = projeto, code comigo, pendência
   (inclusive reforço pendente). Vermelho = erro na hora e "sair da conta", nada mais. Desabilitado é
   cinza (`cor/acao/desabilitada`), nunca verde escuro.
7. **Pixel art por disciplina:** canto reto, borda 2 px, sombra sólida 4 px só em modal, gaveta e no
   cartão Destaque. Ícones na grade de 2 px, nunca rotacionados, nunca linha curva.
8. **Fontes:** VT323 (corpo, títulos), Silkscreen (rótulos, nav, teclas), Fira Code (código). Inter
   não entra em tela do aluno.

## 3. Tokens (nomes que você vai usar)

- Fundo: `cor/fundo/base` (tela), `cor/fundo/superficie` (cartão, campo, nó), `cor/fundo/elevado`
  (código, avatar), `cor/fundo/verde-suave | ambar-suave | vermelho-suave` (estado).
- Ação: `cor/acao/primaria`, `primaria-hover`, `desabilitada`, `perigo`.
- Borda: `cor/borda/padrao` (quase tudo), `forte` (campo, secundário, modal), `verde`, `ambar`, `vermelha`.
- Texto: `cor/texto/primario`, `secundario`, `apagado`, `verde`, `ambar`, `vermelho`, `sobre-acao`.
- Ícone: `cor/icone/verde | ambar | apagado`. Sombra: `cor/sombra/verde | neutra`.
- Pele do agente: `cor/pele/1` a `cor/pele/5` (aliases de `primitiva/pele/1..5`, os tons do `SKIN_SWATCH` do front:
  #f2c8a8, #e0a47a, #c07f52, #8d5530, #5e3620). Só dentro de `Amostra de pele`; nunca como cor de interface.
- Espaço: `espaco/xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48`. Borda: `borda/largura 2`, `borda/raio 0`.
- Tamanhos: `tamanho/controle 48`, `controle-sm 36`, `toque 44`, `trilho 64`, `no-dia 40`, `etapa 32`,
  `retrato 64`, `retrato-sm 40`, `nav 64`, `coluna-foco 720`.
- Estilos de texto: `Pixel/Display 40`, `Pixel/Título 32` (título de tela), `Pixel/Lead 24` (título de
  cartão, pergunta), `Pixel/Corpo 20`, `Pixel/Pequeno 16` (ajuda, meta), `Rótulo/12` (botão, nav, tecla),
  `Rótulo/10` (eyebrow, fio, chip, legenda), `Rótulo/12 Bold`, `Código/16`.

## 4. Componentes (página Sistema)

| Componente | Node | Variantes | Use quando | Não use quando |
|---|---|---|---|---|
| Fio | `12:324` | textos Curso/Semana/Dia/Etapa (esconda o que não se aplica) | toda tela interna | fora do app (login, onboarding) |
| Botão | `12:368` | Tipo Primário/Secundário/Perigo × Estado Padrão/Hover/Desabilitado/Carregando | toda ação | links de texto curtos (use `Rótulo/10` verde) |
| Chip | `12:377` | Tom Neutro/Verde/Âmbar/Vermelho | estado curto ("+3", "Reforço pendente", "Feito") | regras de atividade (viram frase em `Pequeno 16` apagado); máximo 2 lado a lado |
| Campo | `12:395` | Padrão/Foco/Erro/Desabilitado | formulários | busca inline (use Campo mesmo, sem rótulo visível só se houver placeholder claro) |
| Etapa/Nó | `12:426` | Feita/Atual/Futura/Erro | barra de etapas desktop/notebook, até 8 nós + Chip "+N" | celular (use Segmento) |
| Etapa/Segmento | `12:430` | Feita/Atual/Futura | barra de etapas no celular, sempre com texto "Etapa k de n · Tipo" | listas |
| Nó de dia | `12:638` | Trancado/Disponível/Atual/Feito/Feito com reforço/Code comigo/Castelo trancado/Castelo aberto | trilha, visão da semana, caminho da semana | celular (use Segmento + ícone castle) |
| Erros do dia | `12:661` | Erros=1/2/3 | cabeçalho da sessão, só depois do 1º erro | antes de errar (não existe 0/3) |
| Focada/Retrato | `12:142` | Tamanho 64/40 × Tom Neutra/Acolhedora/Comemorando (sprite real 32x32: 64 = 2x; 40 = 1x centrado) | dentro de Fala e Estado vazio; a Fala já escolhe o tom (Neutro → Neutra, Acerto → Comemorando, Erro → Acolhedora) | solto na tela |
| Ícone | `12:323` | check, lock, play, castle, code, check-dark, castle-muted, pendente (`53:73`, quadrado vazio apagado: "check de hoje não feito") | dentro de componentes e legendas | ícone de nav (nav usa rótulo) |
| Cartão | `13:18` | Padrão/Destaque/Âmbar/Suave | toda seção com borda | Destaque em mais de um cartão por tela |
| Focada/Fala | `13:463` | Tamanho Abertura/Devolutiva × Tom Neutro/Acerto/Erro | ver regra 4 | duas falas na mesma tela |
| Opção de resposta | `13:505` | Padrão/Hover/Selecionada/Certa/Errada/Desabilitada | quiz, roleplay, aquecimento | ligar palavras (use `Ligar/Item`) |
| Nav/Item | `13:515` | Padrão/Ativo/Hover | nav superior e abas de módulo | barra inferior |
| Nav/Desktop | set `53:103` (`Agente=Criado` `13:516`, `Agente=Sem agente` `53:79`) | Sem agente: contorno tracejado 32 (`cor/borda/forte`, traço 4/4) no lugar do avatar, convida a criar o agente; esconda Squad/Ranking e números do agente no 1º dia | desktop e notebook | celular |
| Nav/Barra inferior | set `53:121` (`Agente=Criado` `13:539`, `Agente=Sem agente` `53:104`) | 5 destinos; 3 no 1º dia. Sem agente: contorno tracejado 16 (traço 2/2) no lugar do agente-mini em "Você" | toda tela interna no celular, fora da sessão | sessão (usa barra de ferramentas com `Trilho/Item`) |
| Trilho/Item | `13:565` | Padrão/Ativo/Com ponto | trilhos da sessão e barra de ferramentas do celular | nav |
| Trilho | `13:566` | — (esconda os itens do outro lado) | sessão e projeto, em todos os tamanhos de desktop/notebook | painel fixo aberto |
| Gaveta | `13:579` | — | conteúdo do trilho (Material, Pomodoro, Notas, Dúvida, repositório, chat) | mais de uma aberta |
| Modal | `13:584` | — | confirmação, ficha do curso, configurações, guarda-roupa, conquistas | abrir outro modal por cima |
| Estado vazio | `13:595` | — | lista sem itens | erro de sistema (esse usa Cartão + texto vermelho) |
| Sprite | `21:539` | Nome=focada-*, agente-frente/-b/-c/-mini, nav-hoje/-trilhas/-squad/-ranking/-loja/-config, gema, chama-streak, trofeu, medalha-ouro/-prata/-bronze, ajuda, logo-wordmark, cadeado-bloqueado, capelo, coroa, terminal, bandeira, item-* (loja); agente composto (pele 3 + kit + cabelo curto é o `agente-frente`): agente-pele-1/-2/-4/-5, agente-cabelo-longo, agente-cabelo-black-power, agente-sem-cabelo, agente-bone, agente-bota (`37:73`–`37:81`, 12/11) | toda imagem pixel (sprites do `frontend/src/assets/pixel`, ampliados 8x sem interpolação); só em múltiplo inteiro do tamanho nativo (16 ou 32: 1x, 2x, 4x) | tamanho quebrado (24 num sprite de 32, 40 num de 32); ícone de regra |
| Escolha | `23:251` | Estado Padrão/Hover/Selecionada/Desabilitada | múltipla escolha e filtros (interesses, linguagens, recortes, volume); alvo 44; Selecionada = fundo verde-suave + borda verde + marca | estado (isso é Chip); resposta de quiz (Opção de resposta) |
| Caixa de seleção | `23:277` | Estado Desmarcada/Marcada/Erro | aceite de termos e liga/desliga das Configurações; linha inteira clicável (44) | escolha entre várias opções (Escolha) |
| Peça de visual | `47:99` | Estado Padrão/Hover/Selecionada/Desabilitada; props `Nome` (texto), `Legenda` (texto: Vestindo, Escolhida, Comum, Grátis, Faltam N), `Mostrar legenda` (bool), `Sprite` (troca de instância, variantes agente-* do Sprite, 64 = 2x) | peças do guarda-roupa (128 de largura), opções de cabelo do criar agente (112) e de pele (88); numa grade, dê a todas a mesma altura fixa (a legenda oculta encurta a peça) | vitrine da Loja (Cartão Padrão com preço em Secundário); escolha só de texto (Escolha) |
| Ligar/Item | `54:140` | Estado Padrão/Hover/Selecionado/Ligado/Certo/Errado/Desabilitado; props `Tecla`, `Texto`, `Correção`, `Mostrar correção` | ligar palavras: um por termo (teclas 1 a 4) e por definição (A a D), dentro de dois Cartões Suave (desktop em colunas; celular empilhados, termos em grade 2x2). Ligado: a tecla da definição mostra o número do termo (a ligação é pela tecla, sem linhas). Certo/Errado só depois de Confirmar; no Errado ligue `Mostrar correção` ("Certo: 4 · Status"). Definição em `Pixel/Pequeno 16`, até uns 30 caracteres no celular | quiz (Opção de resposta); escolha de filtro (Escolha) |
| Amostra de pele | `47:110` | Estado Padrão/Selecionada × Tom 1..5 (fill ligado a `cor/pele/N`) | linha de 5 tons no guarda-roupa, gap 8; alvo 44 | qualquer outra amostra de cor; criar agente usa Peça de visual com o agente inteiro |

Instância com conteúdo próprio (Cartão, Gaveta, Modal, Estado vazio): o slot `Conteúdo` não aceita
filhos numa instância. Faça como nas âncoras: `detachInstance()` e nomeie `Cartão/<Tipo> · <eyebrow>`;
o estilo continua ligado às variáveis.

## 5. Moldes de layout

Todos: nav 64 no topo (celular: topo 56 + barra inferior 64), margens `espaco/xl` 32 (desktop),
`lg` 24 (notebook), `md` 16 (celular), vão entre cartões 24 (celular 16; sessão compacta 16/8).

- **Hub** (Início, Perfil, Squad, Loja): coluna do dia em FILL + coluna de estado fixa 432 (notebook 400).
  Esquerda: fio, cartão Destaque com a ação, cartão de contexto. Direita: Fala da Focada, cartões de estado.
- **Foco** (sessão, reforço, code comigo, projeto, onboarding): coluna de 720 (`tamanho/coluna-foco`)
  centrada, trilhos de 64 nas margens, gavetas por cima. Dentro da coluna: fio + Erros do dia, título do
  dia + meta, barra de etapas, cartão de conteúdo, Primário no fim do cartão. No celular a coluna é a tela.
- **Lista** (trilha, visão da semana, caderninho, ranking, certificações): lista em FILL + resumo fixo 400.
  Abas no topo com `Nav/Item`; linha = Cartão Padrão horizontal com info 240 | miolo FILL | ação 200.

## 6. Como cada tela diz onde está e o que vem depois

- Fio diz **onde**. Título em `Pixel/Título 32` diz **o quê**. Um `Pequeno 16` apagado ao lado diz
  **quanto** ("Leitura · uns 3 min", "Quiz · 3 perguntas").
- O Primário diz **agora**. Logo abaixo ou ao lado, um `Pequeno 16` apagado diz **depois**
  ("Amanhã: Dia 4 · De quem é o servidor", "Vale +1 gem e mantém a sequência").
- Início com o dia feito: o cartão Destaque vira a pendência mais importante, nesta ordem: reforço do
  dia > projeto aberto > publicação pendente > prévia de amanhã (sem Primário, só texto).
- Abertura de bloco (quiz, lacunas, ligar, roleplay, code comigo) não é tela: é a Fala Abertura no topo
  da primeira pergunta, com as regras numa frase.
- Fim de sessão: Fala Acerto + três números (gems, dias seguidos, acertos) + um Primário
  ("Ver minha recompensa" ou "Fazer o reforço"); o resto vira texto. Feedback do dia vem antes, em um
  cartão só, com Pular como Secundário.

## 7. Nunca faça

- Rolagem de página. Painel fixo aberto na sessão. Pomodoro visível sem o aluno pedir.
- Botão "?" flutuante, balão "Primeira vez aqui", tour. A ajuda é item do menu do agente e reaproveita
  os textos de `frontend/src/lib/guiaTelas.ts` (regra: mudou a tela, atualize a ajuda dela).
- Moldura dupla cinza, sombra suave, gradiente, canto redondo, linha curva, ícone rotacionado.
- Verde contornando um container inteiro (só o cartão Destaque, e um por tela).
- Verde escuro como "desabilitado". Vermelho para pendência ("Reforço pendente" é âmbar).
- Chips de regra ("Só por voz · Até 10 min · Vale 2x") e selo BOSS. Fonte Inter. Texto em caixa alta
  fora de Silkscreen.
- Nav com ícone sem rótulo. Loja, Configurações ou status da IA no topo.
- Focada repetindo frase, duas falas na mesma tela, fala de mais de 2 linhas.
- Numeração interna na tela ("Dia 8", "1 de 73", "5/77"). Web Security tem 72 dias.
- Erro de validação do navegador em inglês: todo erro é frase em português abaixo do campo.
- Botão Primário cortado no fim do quadro (se cortou, a tela estava rolando: redistribua).

## 8. Telas que não são âncora: molde e o que muda

| Tela | Molde / âncora | O que muda |
|---|---|---|
| Login (entrar, criar conta, convite, aceite) | Foco sem nav, cartão 560 centrado | Esquerda da tela: logo + uma frase + Fala Abertura. Abas Entrar/Criar como `Nav/Item`. Campos com erro em português. Botão "Entrar" (sem "cockpit"). |
| Confirmar e-mail, esqueci/redefinir senha, aceite atualizado | Foco sem nav, cartão 560 | Um campo, um Primário, um link de volta em `Rótulo/10`. |
| Onboarding 1 (quem é a Focada) | Foco sem nav | Fio = "Passo 1 de 3". Fala Abertura + 3 cartões Suave com Dia, Projeto da semana, Trilha (sem "castelo", sem "resumo falado"). Primário "Próximo". |
| Onboarding 2 (interesses, linguagens) | Foco sem nav | Chips Neutro selecionáveis (estado Selecionado = borda verde). Linguagens dos projetos vão para o passo da escolha do curso só se o curso tiver projeto. |
| Selecionar curso | Lista sem nav | Um Cartão por curso: título, uma frase, "N semanas · N dias", Secundário "Ver curso". **Hoje só Web Security** (a plataforma abre só com ele): o quadro mostra 1 cartão, sem Chip de recomendação (só com 2 ou mais cursos; aí Chip Âmbar no recomendado). Molde de 2º cartão fica oculto. Ficha do curso = Modal (desktop) ou gaveta de baixo (celular) com a escolha de linguagens dos projetos em Escolha e o Primário. Sem rolagem: 4 cartões por tela e um "Ver mais" se houver mais. |
| Visão da semana | Lista (Trilha) | Uma linha por dia: Nó de dia, título, "k/n aprovadas" em texto, Chip Âmbar "reforço pendente" quando houver. Última linha: castelo. Resumo à direita com números e a Fala. Sem "9 erros" em vermelho. |
| Ligar palavras | Foco (Sessão quiz) | Quadros: desktop escolhendo `55:1857`, par feito `55:1908`, erro na hora `55:1959`, tudo certo `55:2010`; celular `55:2061`, `55:2095`, `55:2129`, `55:2163`. Fala Abertura no topo enquanto liga; depois de Confirmar, Devolutiva (Erro/Acerto) abaixo das colunas e a Abertura some. Confirmar desabilitado até os 4 pares, com o motivo ao lado (celular: no eyebrow "Termos · 2 de 4 ligados"). A correção vem no Confirmar, como no quiz (o front de hoje também corrige no fim). Celular depois de Confirmar: os Termos viram uma legenda numa linha para caber a correção e a Devolutiva sem rolar. Erros do dia só aparece no erro. |
| Reforço | Foco (Sessão) | Fio "Reforço do Dia 1 · Etapa k de n". Fala Abertura: "Só o que escapou". Erros do dia não aparece. Fim: Fala Acerto + Primário "Voltar pro Início". |
| Code comigo (6º dia) | Foco (Sessão) | Barra de etapas: Exemplo, Passo 1..6, Voz. Conteúdo: enunciado, editor (Código/16, fundo elevado, 8 linhas), terminal (4 linhas), devolutiva. "Tentativas do passo" usa o componente Erros do dia com rótulo trocado. Material à esquerda com o arquivo do dia. |
| Projeto da semana | Foco com trilhos | Cartão Âmbar com fio "Semana 1 · Projeto", título, objetivo e entregável resumidos (o README abre em gaveta), Primário "Entregar". Repositório, token e chat em gavetas pelos trilhos. Bloqueado: só castelo trancado + "Abre quando o code comigo fechar" + o que falta + Primário "Continuar · Dia N" (leva ao dia atual), sem erro, sem trilhos. |
| Perfil | Hub | Esquerda: cartão Destaque "Você" com o agente grande + Secundários "Trocar visual" e "Guarda-roupa" (Modal). Direita: Fala, cartão com 3 números, cartão "Últimos 14 dias" (quadrados 20), cartão Suave "Troféus" (ícones + "ver todos" abre Modal). Sem "Região". Sem Primário. Guarda-roupa (Modal 800, quadro `39:2402`): prévia 4x, abas por parte do corpo (`Nav/Item`), peças em grade de `Peça de visual` 128 (Selecionada = vestindo), 5 `Amostra de pele`, "Pronto" Secundário. |
| Squad | Hub | Esquerda: cartão Destaque com escalação (avatares + Ícone check ou pendente; nome sempre na cor normal, "você" em verde) e meta da semana; Primário "Convidar". Direita: Fala, feed em Cartão Padrão com 5 itens e "ver mais" (abre gaveta), ranking do squad em cartão Suave, com o mesmo ícone (check/pendente) antes do nome; ninguém fica em cinza (decisão do dono, 12/11). Sem squad: Estado vazio + dois Cartões (criar, entrar com código). |
| Loja | Hub | Esquerda: vitrine 3x2 em Cartões Padrão (preço em Secundário; "Faltam N" em Chip Neutro); provador em Modal ("Agora" × "Com a peça" em 4x, Primário "Comprar por N gems"; sem saldo, Desabilitado). Direita: agente, saldo, Fala. Sem Primário na tela. Provador: quadro `39:2547`. Criar agente (`40:2493`, `40:2631`): Modal 800 em 2 passos, opções em `Peça de visual` (pele 88 com o agente inteiro; cabelo 112: Curto, Longo, Black power, Sem cabelo), Primário "Próximo" / "Criar agente". **Quem ainda não tem agente não vê o cartão "Seu agente"** atrás do modal (a coluna da direita fica só com a Fala); a Nav usa `Agente=Sem agente` (contorno tracejado) até ele criar o seu (decisão do dono, 12/11). Vale também para o Início celular do 1º dia (`15:833`: topo e barra inferior). |
| Ranking | Lista | Pódio como cartão Padrão com 3 colunas; placar em lista de 10 linhas com "você" fixo na última; resumo com próximo alvo e "como subir" em texto. Recortes como `Nav/Item`. |
| Certificações | Lista | Linha por exame com barra de 6 px; vazio (curso sem mapeamento) = Estado vazio na lista, resumo só com a Fala. Sem Primário. |
| Caderninho | Lista | Busca (Campo) + filtros em **Escolha** (`23:251`, alvo 44; Chip é só estado), lista de notas por dia (Cartão Suave), "Revisar com a IA" como Secundário. Resumo à direita. Sem Primário. |
| Menu do agente | Gaveta à direita (desktop) / de baixo (celular) | Itens: Perfil, Loja, Caderninho, Certificações, Configurações, Ajuda, Sair (Perigo). Status da IA como ponto no avatar + linha nas Configurações. |
| Configurações | Modal | Como hoje, menos "Em breve": o que não existe não aparece. |
| Ajuda da tela | Modal | Título da tela, Fala Abertura, itens de `guiaTelas.ts` em lista; sem tour. |
| Gestão (`/gestao`) | Lista | Só herda tokens e componentes; fora do escopo do aluno. |

## 9. Defeitos conhecidos (não iterar; corrigir no código ou na próxima rodada)

- ~~Retrato da Focada é placeholder pixel~~ **Corrigido (12/11):** sprites reais nas variantes `12:142`,
  com a propriedade Tom (Neutra, Acolhedora, Comemorando) já ligada ao Tom da Fala.
- ~~Nav/Desktop com números divergentes do cartão "Você"~~ **Corrigido (12/11):** Início notebook
  (`15:477`) mostra 9 gems · 7 dias na Nav, igual ao cartão; as outras âncoras já batiam (8 gems, 6 dias).
  Nas telas novas o aluno de exemplo tem 8 gems e 6 dias seguidos.
- Início desktop sobra um terço inferior vazio: é intencional (calma, sem rolagem); não preencha com
  mais cartões.
- Celular Início: o cartão "Seu curso" encosta na barra inferior; se faltar espaço, o cartão some no
  1º dia (o curso já está no fio).
- ~~Avatar do agente e ícones da barra inferior são placeholders~~ **Corrigido (12/11):** Nav/Desktop
  usa o agente (Sprite agente-frente, 32 = 1x) e a barra inferior usa nav-hoje, nav-trilhas, nav-squad,
  nav-ranking e agente-mini (16 = 1x). O avatar do topo do Início celular também.
- ~~Sessão · Celular (`17:1697`): fio com os segmentos ocultos~~ **Corrigido (12/11):** "Dia 3 · Etapa 7
  de 11" à direita de "← Início".
- Ainda placeholder: ícones dos trilhos (Material, Pomodoro, Notas, Dúvida, Código, README, Chat) e do
  Caderninho no Menu do agente; não há sprite no front para eles. O logo da Nav continua desenhado
  (há o Sprite logo-wordmark, usado nas telas fora do app).
- Todos os 8 quadros cabem sem rolagem na última captura; se mudar conteúdo, confira de novo a base
  do Primário antes de entregar.
- Rodada de 12/11 (quadros novos na página Telas): Perfil guarda-roupa `39:2402`, Loja provador `39:2547`,
  criar agente passo 1 `40:2493` e passo 2 `40:2631`, Certificações vazio `41:2582`, ficha do curso no
  celular `41:2709`. Ajustados no lugar: Projeto bloqueado `29:1382`, Selecionar curso `26:293`, `26:387`, `34:2091`.
- ~~Peça/opção com sprite e amostra de pele não são componentes; cores de pele soltas~~ **Corrigido (12/11,
  revisão final):** `Peça de visual` (`47:99`) e `Amostra de pele` (`47:110`), com `cor/pele/1..5`; os três
  quadros usam instâncias. Nenhum fill solto sobrou nas 46 telas (auditoria por script).
- ~~Cartão "Seu agente" atrás do criar agente~~ **Corrigido (12/11):** oculto em `40:2493` e `40:2631`.
- ~~Reforço fim (`28:569`) dizia "+2 gems · agora 10" com a Nav em 8 gems~~ **Corrigido (12/11):** Nav em 10 gems.
- O logo da Nav/Desktop ("F" + "CADU" em Silkscreen Bold 20) são os únicos textos sem estilo de texto no
  arquivo; somem quando o logo virar sprite no código (fase de código).
- Barra de ferramentas do celular (sessão, reforço, projeto): os `Trilho/Item` ficam 2 px abaixo da base do
  quadro por causa da borda superior da barra; o quadro recorta, nada aparece. No código a barra tem 64 de
  altura incluindo a borda.
- ~~Ligar palavras sem componente nem quadro~~ **Corrigido (12/11):** `Ligar/Item` (`54:140`) e 8 quadros na
  linha de sessões e no celular (seção 8).
- ~~Nomes do ranking do squad em cinza~~ **Corrigido (12/11):** a cor vinha de uma pintura com variável ligada
  mas cor crua preta guardada (o render usava a crua). Nomes em `cor/texto/primario` e check por ícone.
- Rodada de 12/11 (2ª): Nav `Agente=Sem agente` aplicada em `40:2493`, `40:2631` e `15:833`.

## 10. Dicas de construção (Plugin API)

- `figma.createAutoLayout()` nasce com fill branco: zere `fills = []` em todo container.
- `resize()` reseta `primaryAxisSizingMode` para FIXED: ajuste a altura (AUTO) depois do resize.
- Sombra sólida: `DROP_SHADOW` offset 4/4, blur 0, cor ligada a `cor/sombra/*` por
  `setBoundVariableForEffect`.
- Variantes por nome: `set.children.find(c => c.name === 'Estado=Feito').createInstance()`.
- Texto da instância: `inst.findOne(n => n.type === 'TEXT' && n.name === 'Label').characters = '...'`.
- Fio: esconda `children[i]` (texto e o ponto anterior) em vez de apagar.
- **Comece todo script com `figma.skipInvisibleInstanceChildren = false`.** Sem isso, `findAll` e
  `children` pulam os filhos ocultos de instâncias (o Fio parece ter só os pontos) e os índices quebram.
- Trocar texto do Fio em quadro clonado: crie uma instância nova e substitua a antiga (mais seguro que
  reaproveitar a de outra tela). Cor: segmento final com o fill do `Etapa` do componente (verde); os
  outros com o fill do `Curso`.
- Véu atrás de Modal/Gaveta: retângulo absoluto do tamanho do quadro, `#0a0a0a` a 72% com cor solta
  (paint com variável ligada ignora a opacidade do paint).
- Imagem pixel: suba o PNG já ampliado 8x com vizinho mais próximo (`magick -filter point -resize 800%`)
  como variante do Sprite; nunca amplie um PNG pequeno dentro do Figma (borra).
- Cartão destacado: depois do `detachInstance()`, zere `fills` do slot `Conteúdo` (vem com fundo de
  marcação) e dê `itemSpacing = 16`.
- Ao ligar cor a variável, grave na pintura também a cor resolvida (`variable.resolveForConsumer(node).value`):
  `setBoundVariableForPaint` sobre `{r:0,g:0,b:0}` deixa a cor crua preta e o screenshot pode sair escuro.
- Auditoria em lote sem screenshot: um `findAll` por quadro conta Primário/Fio/Fala, lista fills e strokes
  sem variável, fontes, textos sem estilo, vocabulário proibido (regex), sprites fora de 16/32/64/128 e nós
  que saem do quadro. Depois recorte o print da página inteira (`get_screenshot` na página, `maxDimension`
  12800) com ImageMagick em vez de um screenshot por quadro.

## 11. Revisão final do diretor (12/11/2026)

**O que foi conferido** nas 8 âncoras e 38 telas: tokens e componentes (zero fill ou stroke solto; únicos
textos sem estilo são o logo da Nav), Fio e um Primário em toda tela de fluxo (consulta sem Primário, como
o dono decidiu), vocabulário novo (nenhum Daily, Missão, ofensiva, conta-giros, ponte, Região, cockpit,
BOSS, "Dia 8" ou "de 73/77/80"), regra de cor (vermelho só em erro na hora, validação de campo e "Sair da
conta"; pendência em âmbar), nenhuma rolagem (nenhum nó sai do quadro além do recorte da barra do celular),
números do aluno de exemplo coerentes entre Nav, cartão "Você", Perfil, Trilha, Ranking e Squad (8 gems,
6 dias, 2/72, 15º, 388 pontos), sprites em múltiplo inteiro (logo 35x7 em 2x/3x/4x).

**Corrigido nesta revisão:** Peça de visual e Amostra de pele viraram componentes com `cor/pele/1..5`;
cartão "Seu agente" some atrás do criar agente; Nav do Reforço fim em 10 gems; altura igual nas opções
do criar agente.

**Índice dos quadros da página Telas** (para a fase de código): Login `25:2`, criar conta `25:47`,
confirmar e-mail `25:131`, esqueci `25:165`, redefinir `25:197`, aceite `25:229`; Onboarding 1 `26:110`,
2 `26:167`; Selecionar curso `26:293`, ficha `26:387`; Visão da semana `28:1242`; Reforço quiz `28:282`,
fim `28:569`; Code comigo `28:876`; Projeto aberto `29:821`, gaveta Código `29:1089`, bloqueado `29:1382`;
Perfil `31:996`, guarda-roupa `39:2402`; Squad `31:1418`, sem squad `31:1870`; Loja `31:2245`, provador
`39:2547`, criar agente `40:2493` e `40:2631`; Ranking `32:1184`; Certificações `32:2320`, vazio `41:2582`;
Caderninho `32:3442`; Ligar palavras `55:1857`, `55:1908`, `55:1959`, `55:2010`; Menu do agente `33:1317`; Configurações `33:1454`; Ajuda da tela `33:1655`.
Celular: Login `34:2052`, Selecionar curso `34:2091`, ficha `41:2709`, Visão da semana `34:2136`, Reforço
`34:2484`, Projeto `34:2634`, Menu `34:2761`, Ligar palavras `55:2061`, `55:2095`, `55:2129`, `55:2163`.

**Pronto para virar código, nesta ordem** (cada passo deixa o app usável):

1. Fundação: tokens v2 no `@theme` do `index.css` (cores, espaço, tamanhos, 3 fontes; Inter sai do app
   do aluno), estilos de texto, e os átomos Botão, Chip, Campo, Cartão, Fio, Focada/Fala, Escolha, Caixa
   de seleção, Estado vazio, Modal e Gaveta. Sem isso nada do resto fecha.
2. Casca: Nav/Desktop com rótulos e 4 destinos, Barra inferior, Menu do agente (gaveta), Ajuda da tela
   (modal que lê `guiaTelas.ts`) e a regra de esconder Squad/Ranking/Loja até o 1º dia. Some o "?", o balão
   e o tour. É a mudança que o aluno mais sente e vale para todas as telas de uma vez.
3. Início (três estados) e Visão da semana e Trilha (Nó de dia, caminho da semana, resumo lateral).
4. Sessão: coluna de foco com trilhos e gavetas em todos os tamanhos (Pomodoro e Material viram gaveta),
   barra de etapas, Opção de resposta, Erros do dia progressivo, abertura de bloco embutida, fim de
   sessão; depois Reforço, Code comigo e Projeto da semana (inclusive bloqueado).
5. Acesso e entrada: Login, criar conta, confirmar e-mail, senha, aceite, Onboarding 1 e 2, Selecionar
   curso e ficha (só Web Security).
6. Lugares: Perfil e guarda-roupa, Loja, provador e criar agente, Squad, Ranking, Certificações,
   Caderninho, Configurações.
7. Pendências já combinadas para a fase de código: sprites novos (trilhos, Caderninho, logo), vitrine da
   loja, véu dos modais com cor solta, contagem de dias (72), revisão do `guiaTelas.ts` como ajuda.

**Decidido pelo dono (12/11), já aplicado:** (a) sem agente = contorno vazio (variante `Agente=Sem agente`);
(b) ranking do squad com nomes iguais e check só por ícone; (c) Ligar palavras desenhado (seção 8).

~~**Em aberto para o dono:** (a) a Nav de quem ainda não criou agente mostra o agente padrão ou um
contorno vazio? O Figma assume o padrão. (b) No ranking do squad, os nomes de quem não estudou hoje
aparecem apagados (Bia em 1º fica cinza): manter como sinal de "falta o check de hoje" ou deixar todos
iguais e sinalizar só na escalação? (c) Ligar palavras continua sem quadro próprio: dois Cartões Suave em
colunas com tecla, sem linhas; desenhar na fase de código ou pedir um quadro ao designer antes?~~

**Decidido pelo dono (12/11), rodada do Ligar palavras:**
1. Correção do Ligar palavras depois de Confirmar (não par a par), como no quiz.
2. Definição do Ligar palavras **pode quebrar em 2 linhas**; não impor limite de ~30 caracteres. Na fase
   de código, conferir com as definições reais do Web Security que tudo cabe sem rolar no celular.
3. A âncora Início celular (`15:833`) fica com `Agente=Sem agente` (1º dia).
4. O contorno tracejado de "sem agente" usa `cor/borda/verde` em vez de `cor/borda/forte` (aplicar na
   fase de código; o Figma ainda mostra `forte`).
