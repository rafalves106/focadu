# Resumo — Fase 23: Ligar Palavras (Matcher de 2 Colunas)

## O que foi implementado

Reforma completa do contrato de WordMatch, não só a UI - revisita a decisão da Fase 4
("1 termo = 1 `DailyActivity`", confirmada com o Falves na época, ver
`docs/fase-4/resumo-implementacao-fase-4.md`) e pendente desde então (documentada em
`docs/fase-9/resumo-implementacao-fase-9.md` e reafirmada na Fase 19).

- **Domínio: `WordMatchPair` (novo).** Um par termo-definição, dono de `DailyActivity` do tipo
  WordMatch. `Id` (herdado de `Entity`) identifica o termo; `DefinitionId` é um **segundo Guid,
  deliberadamente separado**, gerado no construtor - identifica a definição. Se os dois lados
  saíssem pro cliente com o mesmo id, a correspondência (o próprio gabarito) vazaria só de olhar
  o JSON, sem jogar - mesmo cuidado que já existia pra `QuizOption.IsCorrect` (mascarado até
  responder), só que aqui o "vazamento" seria estrutural (a forma do payload), não um campo.
- **`DailyActivity.AddWordMatchPair` (novo)**, gated a `Type == WordMatch`. `AddQuizOption`
  perdeu `WordMatch` da lista de tipos permitidos (agora só `Quiz` e `Cloze`/`MultipleChoice`).
  `CloneForReinforcement` clona `WordMatchPairs` do mesmo jeito que já clonava `QuizOptions` -
  reforço de um grupo de WordMatch reprovado (não bateu `PassingScore`) clona a atividade
  INTEIRA, todos os pares, mesma granularidade de "reforço não clona só a alternativa errada" do
  Quiz.
- **`SubmitActivityResponseUseCase.ScoreFromWordMatchMatches` (novo).** Novo parâmetro
  `wordMatchMatches` (`IReadOnlyDictionary<Guid,Guid>`, TermId → DefinitionId escolhido) em
  `ResolveScore`/`ExecuteAsync` - o cliente manda TODOS os pares da atividade de uma vez, não 1
  `selectedOptionId` por termo. Score = percentual de pares certos, arredondado (pontuação
  PARCIAL, não tudo-ou-nada - decisão desta fase, ver abaixo). Valida presença e integridade
  (`word_match_matches_obrigatorio`/`word_match_matches_invalido` - contagem tem que bater com o
  número de pares da atividade, e todo TermId tem que pertencer a ela).
- **`SubmitActivityResponseRequest.WordMatchMatches` (novo campo opcional)** no contrato da Api,
  passado direto pro use case em `Program.cs`.
- **DTOs: `WordMatchTermDto`/`WordMatchDefinitionDto` (novos)**, substituindo `QuizOptions` pra
  WordMatch em `DailyActivityDto`. Duas listas SEPARADAS (nunca aninhadas no mesmo objeto) -
  `DailyStateMapper` embaralha `WordMatchDefinitions` a cada carga (`OrderBy(_ => Guid.NewGuid())`)
  e só revela `WordMatchTermDto.CorrectDefinitionId` depois que a atividade tem
  `ActivityResponse` (mesmo `hasAnswered` que já mascarava `IsCorrect`/`ExpectedAnswer`/
  `TerminalQuality`).
- **EF: `WordMatchPairConfiguration` (nova) + `HasMany` em `DailyActivityConfiguration`**,
  cascade delete igual `QuizOptions`. Migration `WordMatchPairs` (aditiva - só cria a tabela nova,
  não toca `QuizOptions`) gerada e aplicada no Postgres local de dev.
- **Seed: Dia 2 (`SeedWebSecurityCourseUseCase`)** - as 2 `DailyActivity` WordMatch antigas
  (`Content-Type`/`Cache-Control`, cada uma com distratores fabricados) viraram 1 única
  `DailyActivity` com 2 `WordMatchPair`.
- **Frontend: `WordMatchActivity.tsx` reescrito** - matcher visual de 2 colunas de verdade
  (termos à esquerda, definições embaralhadas à direita), interação por **toque
  (tap-to-connect)**, não drag-and-drop (ver decisão abaixo). Reaproveita `OptionCard` (mesmo
  componente do Quiz/Roleplay) pros 2 lados - sem componente visual novo. `matches` (estado local,
  `Record<termId, definitionId>`) guarda os pares formados; ao confirmar, envia tudo de uma vez
  (`wordMatchMatches`) e busca o estado atualizado pra revelar o gabarito (mesmo padrão de
  `OptionsAnswer`).
- **`TodayPage.tsx` simplificado** - o `Step` tinha um terceiro caso (`{kind:'wordMatchGroup'}`)
  só pra WordMatch, porque várias `DailyActivity` do tipo formavam 1 exercício na tela mas
  continuavam sendo N atividades separadas pro domínio. Como agora 1 `DailyActivity` = 1 grupo
  inteiro, WordMatch virou uma atividade comum no `Step` - o caso especial (e o filtro/sort que
  ele exigia em `renderStep`) foi removido, não substituído.
- **`CURADORIA.md`** - schema do `.json` de curadoria atualizado: `WordMatch` agora é
  `wordMatchPairs: [{ term, definition }]` (1 activity = 1 grupo), não mais `quizOptions` com os
  4 textos do grupo repetidos por termo. Os 20 `dia-N.json` já escritos **não foram migrados**
  (ver "Dúvidas" abaixo).

## Decisões técnicas tomadas que não estavam no prompt original

- **Pontuação parcial (X de N pares certos), não tudo-ou-nada.** Reaproveita o mesmo
  `EvaluationPolicy.PassingScore` (80) de qualquer outro tipo de atividade pra decidir `Passed` -
  não foi criada uma regra separada. Efeito colateral que funciona a favor: grupos pequenos (2-3
  pares, como o do seed) na prática já exigem acertar quase tudo pra passar (2/2=100, 1/2=50), e
  grupos maiores (4+, o padrão do `CURADORIA.md`) toleram 1 erro - a severidade escala com o
  tamanho do grupo de graça, sem configuração nova.
- **Tap-to-connect, não drag-and-drop.** O prompt original oferecia os dois ("drag-and-drop ou
  tap-to-connect em mobile"). O projeto não tem NENHUMA dependência de gestos (`package.json` só
  tem React/Router/Tailwind) - HTML5 drag-and-drop nativo não funciona em touch sem polyfill, o
  que forçaria 2 implementações de captura (mouse e touch) pro mesmo dado. Tap-to-connect funciona
  idêntico nos dois sem biblioteca nova. `ponytail:` se um dia drag-and-drop visual for pedido
  explicitamente, o dado (`matches`) já está pronto - só trocaria a interação de captura.
- **`WordMatchPair.DefinitionId` como Guid separado do `Id`, não reaproveitado.** Cogitado (e
  descartado) expor os dois lados com o mesmo id - mais simples, mas a própria estrutura do JSON
  (mesmo id nos dois lados) entregaria o gabarito de graça. `DailyStateMapper` embaralha
  `WordMatchDefinitions` pelo mesmo motivo (posição também não pode vazar a correspondência).
- **Reveal "gabarito" (sempre verde, nunca vermelho) quando a página não tem mais o palpite do
  usuário em memória.** `matches` é estado local, nunca persistido - reabrir uma atividade já
  respondida (replay, reload no meio do caminho) volta com `matches` vazio, sem como saber o que
  o usuário tinha escolhido. Nesse caso, `WordMatchActivity` cai pra um modo alternativo que só
  mostra a correspondência CERTA (nunca marca nada como errado sem saber que foi essa a escolha) -
  mesma degradação graciosa que `OptionsAnswer` já tinha pra Quiz (`isRevealedWrongPick` só
  dispara com `selectedOptionId` em memória).
- **`ActivityResponseDto` não ganhou campo novo pra ecoar os pares submetidos.** O frontend já
  sabe o que o usuário escolheu (estado local `matches`) no momento da resposta - só precisa do
  gabarito (`CorrectDefinitionId`, via refetch), não de um eco do que ele mesmo enviou. Evita
  crescer o contrato de resposta só pra um dado que o cliente já tem.
- **Seed do Dia 2 reescrito, os 20 `dia-N.json` de curadoria não.** Só o Dia 2 tem WordMatch de
  verdade na Api hoje (os outros dias do seed ainda são placeholder - "Vídeo a confirmar"); os
  `dia-N.json` em `secret/curadoria/` são artefatos de curadoria, nunca importados
  automaticamente (`/admin/conteudo` só cobre Reading/Video - `DailyActivity` sempre foi só via
  seed manual). Reescrever 20 arquivos JSON não desbloqueava nada de código e o conteúdo antigo
  continua 100% recuperável (cada termo já tem exatamente 1 opção `isCorrect: true`) - só o
  schema de referência pra curadoria FUTURA foi atualizado.
- **Sem node Figma consultado ao vivo nesta fase** - não havia URL/arquivo Figma acessível na
  sessão (só a referência textual "sessao-ligar-palavras" nos comentários de fases anteriores).
  Construído com a linguagem visual já estabelecida (`OptionCard`, `SessionLayout`, `FeedbackPanel`
  - os mesmos tokens/componentes que Quiz/Roleplay já usam) em vez de inventar um visual novo -
  fidelidade pixel-a-pixel contra o Figma fica pra conferência numa sessão com acesso ao arquivo.

## Estrutura de arquivos criada/alterada

```
backend/src/
  Focadu.Domain/Activities/
    WordMatchPair.cs                       <- novo
    DailyActivity.cs                        <- editado: WordMatchPairs, AddWordMatchPair, AddQuizOption sem WordMatch
    QuizOption.cs                           <- editado: doc comment
  Focadu.Infrastructure/Persistence/
    Configurations/
      WordMatchPairConfiguration.cs         <- novo
      DailyActivityConfiguration.cs         <- editado: HasMany(WordMatchPairs)
    Migrations/20260827233518_WordMatchPairs.cs  <- novo (aditiva)
  Focadu.Application/
    Dailies/Dtos.cs                          <- editado: WordMatchTermDto/WordMatchDefinitionDto
    Dailies/DailyStateMapper.cs              <- editado: mapeia + embaralha + mascara gabarito
    Dailies/SubmitActivityResponseUseCase.cs <- editado: ScoreFromWordMatchMatches
    Seed/SeedWebSecurityCourseUseCase.cs     <- editado: Dia 2 vira 1 activity com 2 pares
  Focadu.Api/Contracts/SubmitActivityResponseRequest.cs  <- editado: WordMatchMatches
  Focadu.Api/Program.cs                                   <- editado: passa WordMatchMatches
  tests/Focadu.Tests/Dailies/SubmitActivityResponseScoreTests.cs  <- editado: testes de WordMatch novos

frontend/src/
  api/types.ts                              <- editado: WordMatchTermDto/WordMatchDefinitionDto
  api/client.ts                              <- editado: wordMatchMatches no body de submit
  components/WordMatchActivity.tsx           <- reescrito: matcher de 2 colunas, tap-to-connect
  routes/TodayPage.tsx                       <- editado: remove Step.wordMatchGroup

docs/ARQUITETURA.md                          <- editado: contrato/pendência/mapa de arquivos
secret/curadoria/CURADORIA.md                <- editado: schema wordMatchPairs
```

## Testes

- `dotnet build` (solução inteira) - sem erros.
- `dotnet test tests/Focadu.Tests` - 210/210 passando, incluindo os 7 testes novos de
  `ScoreFromWordMatchMatches` (tudo certo, tudo trocado, parcial arredondado, sem matches, matches
  incompletos, TermId de outra atividade).
- `npx tsc -b --noEmit` (frontend) - sem erros.
- `npm run lint` (oxlint) - sem avisos novos (1 aviso pré-existente em `TodayPage.tsx`, confirmado
  via `git stash` que já existia antes desta fase).
- Migration `WordMatchPairs` aplicada com sucesso no Postgres local de dev (`dotnet ef database
  update`) - aditiva, não afetou dados existentes.

## Dúvidas ou pontos abertos para a próxima fase

- **Fidelidade visual contra o Figma não conferida ao vivo** - construído com a linguagem visual
  já estabelecida no app (ver decisão acima), não pixel-a-pixel contra o node
  "sessao-ligar-palavras". Vale uma conferência com o arquivo Figma aberto.
- **Dados de dev pré-existentes** - havia 1 curso/2 usuários já seedados no Postgres local antes
  desta fase, com as 2 `DailyActivity` WordMatch ANTIGAS do Dia 2 (schema pré-Fase 23). A
  migration é aditiva (não apaga nada), mas o seed é idempotente por curso já existir - rodar
  `dotnet run -- seed` de novo NÃO substitui as atividades antigas automaticamente. Pra ver o Dia
  2 no formato novo, precisa recriar o curso seedado (dropar o `Course` em cascata, ou resetar o
  banco) e rodar o seed de novo - decisão de quando fazer isso fica pro Falves, não foi feito
  aqui pra não apagar progresso de teste de usuários reais sem confirmar antes.
- **Os 20 `dia-N.json` de curadoria continuam no schema antigo** (`quizOptions` com distratores
  compartilhados) - semanticamente completos (dá pra extrair `{term, definition}` de cada um
  fazendo `prompt` + a opção `isCorrect: true`), mas não no formato que `CURADORIA.md` documenta
  agora. Migrá-los é mecânico (não precisa recuradoria de conteúdo) mas não foi feito nesta fase -
  nenhum código lê esses arquivos automaticamente hoje, então não bloqueia nada.
- **WordMatch com mais de 1 grupo por dia** (o molde do `CURADORIA.md` prevê 3 grupos de 4 pares)
  nunca foi exercitado ao vivo - o seed real só tem 1 grupo (Dia 2, 2 pares). A modelagem suporta
  (cada grupo é sua própria `DailyActivity`, WordMatch virou uma atividade comum no `Step`), mas
  vale confirmar visualmente quando um dia com 3 grupos for seedado de verdade.
