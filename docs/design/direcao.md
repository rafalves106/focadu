# Direção do redesign da Focadu (fase A)

> Diagnóstico e direção para o dono aprovar antes da fase B. Prints citados pelo nome do arquivo em
> `docs/design/prints/atual/desktop/` (quando for notebook ou celular, a pasta vem antes). O arquivo
> Figma atual só tem a página de prints (5:2) e uma "Page 1" vazia (0:1): não há componente nem
> variável para herdar, a fase B começa do zero.

## 1. Diagnóstico

**H1 Vocabulário demais de uma vez: confirmada.** No passo 1 do onboarding (`13`) o aluno já recebe
Daily, Projeto, Trilha, castelo e "resumo falado". No Início do dia 1 (`20`) aparecem, na mesma tela,
Missão, Recompensa, Gem, streak, "Rumo ao castelo", BOSS PROJETO, ofensiva e 14 etapas numeradas que
ele ainda não começou. Na sessão (`25`) o conta-giros diz "0/3 · 3 erros = reforço" antes do primeiro
erro; na conversa por voz (`31`) quatro chips de regra ("Bloco 1 de 3 · Só por voz · Até 10 min · Vale
2x no score") disputam com a pergunta. A sessão de reforço se chama "Reforço · Dia 8" (`104`) numa
semana que tem 6 dias: a numeração interna vaza pra tela. O Perfil ainda diz "Região 1" (`52`, `151`),
resto do mapa por regiões que foi apagado.

**H2 Navegação larga e plana: confirmada.** Oito ícones sem rótulo, do mesmo tamanho, quatro de cada
lado do logo (`20`); o aluno só descobre o que são no tour. No celular (`celular/20`) o Início abre com
"Seus cursos" e o cartão do agente, e a Missão do dia só aparece depois de rolar: a ação principal fica
abaixo da dobra na tela que mais precisa dela.

**H3 O guia "?" é remendo: confirmada.** O tour tem 10 passos (`19`); o balão "Primeira vez aqui?"
aparece em toda tela e cobre o canto onde fica o botão primário (`25`, `celular/36` cobre o
"Confirmar"); o guia aberto (`21`) é uma lista de seis cartões de texto explicando a tela que está
atrás dele.

**H4 Falta um próximo passo único: confirmada, com nuance.** No dia 1 (`20`) "Começar missão" existe,
mas é pequeno e fica no canto de um cartão com 14 quadradinhos. Nos dias seguintes piora: com o dia
feito (`60`) não há ação nenhuma, a Focada avisa do reforço mas não há botão; com 5 reforços
pendentes (`101`) eles são só cinco pontos vermelhos sob a trilha. Na sessão, cada abertura de bloco
(`35`, `38`, `41`, `45`, `144`) é uma tela 70% vazia com "Bora" miúdo no canto. O fim do reforço
(`112`) empilha quatro caixas e três botões. A trilha (`22`) repete o "Continuar estudando" do Início.

**H5 Densidade: confirmada no desktop, já resolvida no notebook.** Em `25` há nav, cabeçalho,
conta-giros e cinco painéis; Material e Pomodoro ocupam um quarto da largura até no quiz (`36`), e o
Tira dúvidas responde em coluna de ~20 caracteres (`29`). O notebook (`notebook/25`, `notebook/26`)
já usa trilhos de 64 px com gaveta e é a melhor versão da sessão: o desktop deveria herdar dela, não
o contrário.

**O que o brief não previu:**

- Dois sistemas de moldura na mesma tela: borda verde fina e moldura cinza dupla com sombra (`20`,
  `52`). A cinza dupla dá cara de janela de sistema antigo, não de produto.
- Três fontes de corpo: VT323, Inter (texto do guarda-roupa `53`, loja `61`, passo de código `146`)
  e Silkscreen em títulos grandes (`25`, `52`). Inter só faz sentido em Termos (`10`).
- Verde escuro significa "desabilitado" (`16`, `55`) e também "pronto, mas sem alteração" (`26`
  Salvar): o aluno não sabe se pode clicar.
- Vermelho em excesso: a visão da semana (`103`) tem cinco "Reforço pendente", cinco "9 erros", "45
  erros" e uma caixa vermelha de revisão. É a tela mais punitiva do app e é a que resume o progresso.
- Linhas curvas no ligar palavras (`43`, `44`) quebram a regra do pixel art.
- A Focada repete a mesma fala em Início, trilha e semana (`20`, `22`, `103`): vira papel de parede.
- Projeto bloqueado (`23`, `149`) mostra erro vermelho de repositório e os painéis de anotação e
  dúvida de algo que o aluno nem pode abrir.
- Números de dias diferentes em cada tela: 1 de 73 (`52`), 8 de 80 (`151`), 5/77 (`102`), 0/80
  (`161`), 72 no brief. Não é design, mas destrói confiança; avisar quem cuida do dado.
- Validação nativa do navegador em inglês (`05`); botão "Criar agente" cortado na base (`61`).
- Celular: toda tela rola de 1300 a 3400 px; a barra inferior da sessão (`celular/25`) funciona.

## 2. Modelo de orientação

**Regra única: cada tela responde, na ordem, "onde estou", "o que faço agora", "o que vem depois".**
Isso vira um componente só, o **fio**, presente em toda tela interna: `Web Security · Semana 1 ·
Dia 3 · Etapa 4 de 11`, com o título da tela embaixo. O reforço é "Reforço do Dia 1", nunca "Dia 8".

**Ação principal por tela** (um botão primário por tela, sempre no mesmo lugar: fim do bloco de
conteúdo, alinhado à esquerda, nunca no canto):

- Início: **Começar o dia** / **Continuar o dia**. Com o dia feito, o botão vira a pendência mais
  importante, nesta ordem: reforço do dia, projeto aberto, "amanhã: Dia N, título" (prévia, sem botão).
- Sessão: o confirmar da etapa. A abertura de bloco deixa de ser uma tela: vira a fala da Focada no
  topo da primeira pergunta do bloco.
- Trilha: **Continuar** no nó ativo; o resto é leitura. Semana: entrar no dia ou no projeto.
  Projeto: **Entregar**. Perfil, Loja, Squad, Ranking: são lugares, sem botão primário obrigatório.

**Vocabulário aos poucos.** Dia 1 só usa: Dia, Semana, Projeto da semana, Etapa, Focada, erro.
Aparecem quando acontecem: *reforço* no 3º erro (o conta-giros só surge depois do 1º erro, como três
quadrados discretos no fio), *sequência/ofensiva* e *folga* a partir do 2º dia, *Gems* na primeira
recompensa, *ponte* só na semana em que ela chega (com a Focada apresentando). Nome do mecanismo
sempre acompanhado do efeito: "Reforço: 20 min só com o que você errou".

**Navegação.** Logo à esquerda. Centro: quatro destinos com rótulo, **Hoje · Trilha · Squad ·
Ranking**. Direita: o agente (avatar + Gems + dias seguidos, compacto) que abre o menu Perfil, Loja,
Caderninho, Certificações, Configurações, Ajuda, Sair. Saem do topo: Loja, status da IA (vira ponto
no avatar e linha nas Configurações), Configurações, o botão "?" flutuante e o balão da primeira
visita. O tour de 10 passos some; a explicação de cada tela mora no "Ajuda" do menu e, no primeiro
acesso, a Focada fala uma frase no topo do Início e só. Celular: barra inferior fixa com os mesmos
quatro destinos e o agente; o Início abre pelo botão do dia.

## 3. Direção visual

"Refinado e vendável" dentro do pixel art é **disciplina, não enfeite**: menos molduras, tamanhos que
dizem a hierarquia, cor com um papel só.

- **Moldura:** uma só, 2 px, cor `stroke`. Sombra sólida de 4 px apenas em modal, gaveta e no cartão
  da ação do dia. Moldura dupla cinza deixa de existir. Verde nunca contorna um container inteiro;
  ele marca o item ativo (borda de 2 px no nó, na opção escolhida, no campo em foco) e o botão
  primário.
- **Tipografia (3 fontes, Inter sai do app do aluno):** VT323 para corpo 20/28 e para display 32 e
  40; Silkscreen 10 e 12 só em rótulos, eyebrows e rótulos de nav; Fira Code em código. Título de
  tela em VT323 32, não em Silkscreen caixa alta.
- **Espaçamento em grade de 8:** margem 32 (desktop), 24 (notebook), 16 (celular); vão entre cartões
  24; padding de cartão 24; entre seções 32; linha de botão com 48 de altura.
- **Papéis de cor:** `base` e `surface` como hoje; novos neutros `stroke-strong` (#3a3a3a) e
  `text-secondary` mais claro (#b4b4b4) pra legibilidade. Verde = ação e sucesso. Âmbar = projeto,
  ponte e pendência (o reforço pendente passa a âmbar; vermelho só pra erro na hora e pra "sair da
  conta"). Botão desabilitado: cinza com texto `muted`, nunca verde escuro.
- **Densidade em três moldes:** *foco* (sessão: uma coluna de 720 px com trilhos de 64 px e gavetas
  em todos os tamanhos, Pomodoro e Material dentro do trilho); *hub* (Início: coluna do dia com 2/3 e
  coluna de estado com 1/3); *lista* (trilha, semana, caderninho: lista central e resumo à direita).
- **Focada:** uma aparição por tela, no topo do conteúdo (retrato 64) ou como devolutiva (retrato
  40). Fala de até duas linhas, nunca a mesma em telas vizinhas. Sem balão flutuante.
- **Deixa de existir:** balão "Primeira vez aqui", pulso do "?", chips de regra (viram uma linha de
  texto secundário), Pomodoro sempre visível, linhas curvas, selo BOSS (o castelo basta),
  "cockpit" nos botões.
- **Referências:** Duolingo (um caminho, um botão, vocabulário que chega quando o jogo pede);
  Linear (densidade calma, rótulo em tudo, atalhos sem estardalhaço); interface de Stardew Valley
  (pixel art que hierarquiza por tamanho e cor, não por quantidade de bordas).

## 4. Telas-âncora (fase B)

1. **Início** (desktop, notebook e celular): define nav, fio, cartão do dia, nó de dia, cartão de
   estado do agente, fala da Focada e os três estados do dia (por fazer, feito com pendência, feito
   sem pendência). É a primeira impressão de todo dia.
2. **Sessão diária** (desktop e celular; estados leitura, quiz com erro, abertura de bloco embutida):
   define barra de etapas, trilho e gaveta, opção de resposta, cartão de devolutiva, botão primário e
   o conta-giros progressivo. É onde o aluno passa 80% do tempo.
3. **Mapa da trilha** (desktop): define aba de módulo, lista de semana, nó de dia nos cinco estados,
   castelo e resumo lateral. É a tela de "onde estou" e o molde da visão da semana e do caderninho.

Onboarding e login ficam de fora: são formulários, derivam de campo, chip e barra de etapas que as
âncoras já definem, e os prints mostram que são as telas menos problemáticas.

## 5. Perguntas ao dono

1. Renomes de conceito (propostas, não decisões): Daily → "Dia" ou "sessão do dia"; Missão do dia →
   "Hoje"; conta-giros → "erros do dia"; ofensiva → "sequência"; ponte → "dia de código" (o castelo
   continua sendo o desenho, com o texto "Projeto da semana"). "Agente" como forma de a Focada chamar
   o aluno: manter?
2. Posso esconder Squad, Ranking e Loja do menu até o aluno fechar o primeiro dia (aparecem com uma
   fala da Focada)? Se não, ficam visíveis mas sem destaque.
3. Pomodoro vira gaveta em todos os tamanhos (hoje é painel fixo no desktop)?
4. Reforço pendente passa de vermelho pra âmbar, deixando vermelho só pra erro na hora?
5. O botão "?" flutuante, o balão e o tour de 10 passos saem; a ajuda vira item do menu do agente.
   Concorda?
6. Os números de dias (72, 73, 77, 80) vêm do dado, não do design: quem conserta?
7. Projeto bloqueado: mostro só o cadeado e o que falta, sem o erro de repositório nem os painéis
   laterais. Concorda?
8. Há números da aba Retenção por aparelho? Se o celular for relevante, a segunda âncora ganha mais
   peso no celular do que no notebook.

## 6. Decisões do dono (12/11/2026)

Direção aprovada. Respostas às perguntas da seção 5:

1. Renomes aprovados: Daily → "Dia"; Missão do dia → "Hoje"; conta-giros → "erros do dia"; ofensiva →
   "sequência". **A ponte se chama "code comigo"** (nome já usado desde a Fase 79), não "dia de código".
   "Agente" continua como tratamento do aluno.
2. Squad, Ranking e Loja ficam **escondidos** até o aluno fechar o primeiro dia.
3. Pomodoro vira gaveta em todos os tamanhos.
4. Reforço pendente em âmbar; vermelho só pra erro na hora.
5. Saem o botão "?", o balão e o tour de 10 passos. A ajuda vira item do menu do agente e **reaproveita o
   conteúdo do `frontend/src/lib/guiaTelas.ts`**; a regra "mudou a tela, atualize o guia" passa a ser
   "atualize a ajuda da tela".
6. A contagem de dias (72/73/77/80) é bug de dado/código: conserto numa fase de código à parte, fora do
   redesign. No Figma, usar o número certo (72 dias no Web Security).
7. Projeto bloqueado mostra só o cadeado e o que falta.
8. Sem peso extra por aparelho: Início em desktop, notebook e celular; Sessão diária em desktop e celular,
   como na seção 4.
