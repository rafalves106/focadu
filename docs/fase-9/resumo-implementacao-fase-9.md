# Resumo — Fase 9: Polimento das Atividades Individuais (Quiz, Cloze, Ligar, Roleplay)

## O que foi implementado

- **`IntroCard`** (novo, `components/activities/`) — tela de intro reutilizada pelas 4 atividades
  (badge, título, descrição, regras opcionais, CTA). Vira um gate visual local (`started`, `useState`)
  dentro de cada componente de atividade - **não é um passo novo na máquina de estados do
  `TodayPage`**, a atividade só é considerada "concluída" quando responde de verdade. Pula
  automaticamente pra quem já respondeu antes (replay/resume).
- **`OptionCard`** (novo, `components/activities/`) — card de opção consolidado (estados
  neutro/selecionado/correto/errado/esmaecido), substitui o markup de botão que estava duplicado em
  `OptionsAnswer.tsx` e `RoleplayActivity.tsx`. Usado por Quiz, cada termo do WordMatch e as decisões
  do Roleplay (sem letra A/B/C neste último - são ações, não alternativas).
- **`CodeHighlight`** (novo, `components/activities/`) — realça a lacuna (`___`) do prompt de Cloze;
  usa fonte monoespaçada quando o texto "parece" código (heurística simples).
- **`QuizActivity.tsx`** (novo) — Quiz e Cloze/MultipleChoice ganharam tela própria (intro + `ActivityScreen`
  + `OptionsAnswer`), extraída do branch que antes vivia inline em `TodayPage.renderStep`.
- **`WordMatchActivity.tsx`** (novo) — o grupo de termos do WordMatch, extraído de `TodayPage.renderStep`
  pra caber a Intro e o progresso real "X de Y termos conectados" (+ badge "ÚLTIMO TERMO" quando só
  falta 1).
- **`ClozeFreeTextActivity.tsx`/`RoleplayActivity.tsx`** — refatorados: ganharam Intro, `OptionCard`
  (Roleplay) e `CodeHighlight` (Cloze), sem mudar nenhuma lógica de submit/score existente.
- **`FeedbackPanel`** — headline padrão de erro ganhou ícone (`❌ Quase lá.`), botão "Continuar" virou
  CTA primário (verde, preenchido) em vez de secundário/outline, mais alinhado ao Figma.
- **`CompletionSummary`** — ganhou um resumo real do dia (X de Y corretas, deriva de
  `ActivityResponse.Passed` de cada atividade), badge "🏆 Conceito Dominado" quando a taxa de
  aprovação do dia bate ≥ 90%, e um link "Refazer este dia" (`/hoje?daily=`, reaproveitando o
  mesmo mecanismo de replay já usado desde a Fase 8).

## Decisões técnicas tomadas que não estavam no prompt original

- **`ActivityResultScreen` (Estado 7, "18 de 20 corretas" por tipo de atividade) NÃO foi criado.**
  O domínio não tem o conceito de "sessão de N perguntas do mesmo tipo" que o mockup do Figma
  assume - cada `DailyActivity` de Quiz/Cloze/Roleplay normalmente aparece **1 vez por dia** (às
  vezes 2, pro Cloze), misturada com outros tipos na mesma sequência (ver seed:
  `SeedWebSecurityCourseUseCase`). Só o WordMatch tem uma noção real de "múltiplas perguntas
  agrupadas" (1 termo = 1 `DailyActivity`, decisão da Fase 4). Construir uma tela de "resultado da
  sessão" por tipo de atividade exigiria inventar uma agregação que não existe - em vez disso, o
  "Resultado Final" do Figma virou uma evolução do **`CompletionSummary`** já existente (Fase 4),
  que é o resumo real que já existe no domínio: o dia inteiro, não um tipo de atividade isolado.
- **XP/Gemas/streak/nível/temporizador/dificuldade (★★★) do mockup foram descartados por completo**
  (pedido explícito do prompt) - nenhum campo correspondente no domínio. O `FeedbackPanel` não
  ganhou "+20 XP" nem "🔥 N acertos consecutivos"; o resultado final usa taxa de aprovação real em
  vez de "+85 XP"/"+12 💎".
- **"Última Pergunta" (Estado 6) só foi implementado pro WordMatch** - é o único caso real de
  múltiplas perguntas do mesmo tipo em sequência na mesma Daily. Pra Quiz/Cloze/Roleplay
  (tipicamente 1 ocorrência por dia), um badge "última" seria sempre verdadeiro e sem sentido - não
  implementado, sinalizado aqui em vez de forçar um badge vazio.
- **Ligar Palavras não virou um matcher de arrastar-e-soltar com conectores visuais (2 colunas).**
  O Figma mostra essa interação, mas o domínio modela cada termo como uma escolha independente (1
  `DailyActivity` WordMatch = 1 termo com opções de múltipla escolha, decisão confirmada na Fase 4)
  - não um grafo de pares arrastáveis. Reconstruir essa interação seria um paradigma de UI novo
  (drag-and-drop, estado de conexões, validação de pares), fora do escopo de "polimento visual"
  desta fase e arriscado o suficiente pra merecer decisão explícita do Falves antes. Mantido o
  mecanismo existente (único testado e coberto pelo backend), só com visual/progresso uniformizados
  (`WordMatchActivity`, `OptionCard`).
- **Sem timer/cronômetro** (o Figma mostra "02:45", "03:00" contando) - não existe limite de tempo
  no domínio pra nenhuma atividade (só o VoiceSummary tem um limite, de gravação, já implementado
  desde a Fase 5) - não fabricado.
- **`QuestionProgressBar`/`QuestionBody` do prompt não viraram arquivos próprios** - `ProgressBar`
  (Fase 8) já cobre a barra; o texto "X de Y" só é real pro WordMatch (embutido direto em
  `WordMatchActivity`, não vale um componente à parte pra 1 usuário). "QuestionBody" (texto +
  código) não tinha superfície compartilhada suficiente entre Quiz (texto simples) e Cloze
  (`CodeHighlight`) pra justificar 1 componente genérico.

## Estrutura de arquivos criada

```
frontend/src/components/
  activities/
    IntroCard.tsx        <- novo
    OptionCard.tsx        <- novo
    CodeHighlight.tsx      <- novo
  QuizActivity.tsx          <- novo (Quiz + Cloze/MultipleChoice)
  WordMatchActivity.tsx      <- novo (extraido de TodayPage.renderStep)
  OptionsAnswer.tsx           <- usa OptionCard
  ClozeFreeTextActivity.tsx    <- +Intro, +CodeHighlight
  RoleplayActivity.tsx          <- +Intro, +OptionCard
  FeedbackPanel.tsx               <- headline/CTA de erro ajustados
  CompletionSummary.tsx            <- resumo real + badge "Conceito Dominado" + "Refazer"
routes/
  TodayPage.tsx                     <- usa QuizActivity/WordMatchActivity no lugar dos branches inline
```

## Testes

- Backend: nenhuma mudança (confirmado no prompt - "Nenhuma mudança necessária"). `dotnet build`/
  `dotnet test` continuam limpos (57 aprovados) - só rodados de novo pra garantir que nada quebrou.
- Frontend: `tsc -b`, `oxlint`, `vite build` limpos (só os 2 warnings pré-existentes de fases
  anteriores, nenhum novo).
- Verificação ao vivo (Postgres real reseedado, `dotnet run`, `vite dev`, Playwright headless), 0
  erros de console/rede:
  1. **Quiz** (`/hoje`, Dia 1): Intro ("QUIZ ATIVO", regras, "INICIAR QUIZ") → pergunta com opções
     A/B/C → seleciona a certa → `CONFIRMAR RESPOSTA` → feedback com opção correta destacada em
     verde + "✓ CORRETO" + "Acertou! 🎉" + gauge 100/SCORE → "CONTINUAR" → tela "Quase lá" (Quiz era
     a última atividade do dia) → "Concluir sessão" → `CompletionSummary` mostra "4 de 4 corretas",
     "🏆 Conceito Dominado", 100%, "Refazer este dia"/"Voltar ao início".
  2. **Ligar Palavras** (`/hoje?daily=`, Dia 2, data temporariamente ajustada pro teste): Intro
     ("Associe os termos", "2 termos") → `COMEÇAR` → os 2 termos renderizados com `OptionCard`,
     progresso real "0 de 2 termos conectados".
  - Cloze e Roleplay não foram exercitados ao vivo nesta verificação (Dias 3/4 do seed são datados
    no futuro, inacessíveis via `EvaluateDailyAccess` sem manipular ainda mais o relógio/dados) -
    usam exatamente os mesmos componentes (`IntroCard`, `OptionCard`/`CodeHighlight`, `FeedbackPanel`)
    já validados nos outros dois fluxos, e a lógica de submit/score de nenhum dos dois foi tocada.
  - O DB foi resetado (`docker compose down -v` + migrate + seed) pra um estado limpo ao final -
    nenhuma data/resposta de teste ficou para trás.

## Dúvidas ou pontos abertos para a próxima fase

- **Ligar Palavras como matcher visual de 2 colunas com drag-and-drop** ficou de fora (ver "Decisões
  técnicas" acima) - se o Falves quiser essa interação de verdade, é um pedido explícito pra uma
  fase futura (não um ajuste "de polimento").
- **Cloze/Roleplay sem verificação ao vivo nesta fase** - vale conferir visualmente numa próxima
  sessão de trabalho (ou quando o seed tiver dias com datas mais próximas de "hoje").
- **"Semanas até o próximo review"** (citado no prompt como alternativa a XP) não foi implementado -
  não existe um conceito de "próximo review agendado" no domínio; o que existe (reforço diário/
  semanal) já é mostrado no `CompletionSummary` desde a Fase 4.
