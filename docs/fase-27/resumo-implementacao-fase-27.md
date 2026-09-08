# Resumo — Fase 27: Personalização por Analogia Estendida (Voz + LinkedIn)

## Origem

Revisando pendências de arquitetura, `secret/MESTRE.md` §2.2/§12 dizia "nenhum prompt de IA
consome `Interests`/`AdditionalProfileNotes` ainda" — **falso**: a Fase 21/22 já tinha implementado
isso pra conteúdo de Leitura (`GetCuratedContentUseCase` + `IAnalogyGenerationService`, analogia por
seção, cacheada em `PersonalizedAnalogy`). O documento mestre estava desatualizado nesse ponto
(corrigido num commit separado). O que sobrava de pendência real, mais estreito do que o documento
descrevia: as outras 2 chamadas de IA do produto que fazem sentido receber o mesmo perfil —
avaliação de voz e rascunho de LinkedIn — ainda não usavam.

## O que foi implementado

- **`PersonalizationPromptBuilder`** (`Focadu.Application.Shared`, novo) — função pura
  `BuildInstruction(interests, notes)` que monta a mesma frase de instrução ("use como analogia
  quando ajudar a explicar, sem forçar") pros dois chamadores abaixo, sem duplicar o texto.
  `public` (não `internal`, ao contrário do resto da pasta `Shared/` — ver `UniqueCodeGenerator`)
  porque os adapters Groq que a consomem vivem em `Focadu.Infrastructure`, fora do assembly de
  `Focadu.Application`. Retorna `null` quando o usuário não tem interesses nem notas — nesse caso o
  prompt fica **byte a byte igual** ao de antes desta fase. Testado direto
  (`PersonalizationPromptBuilderTests`, 5 casos: nada, só interesses, só notas, os dois, notas em
  branco tratadas como ausentes).
- **`ContentEvaluationRequest` ganhou `UserInterests`/`UserNotes`** (opcionais, default `null`) —
  compartilhado entre `IContentEvaluationService` (voz) e `IProjectEvaluationService` (projeto), só
  o primeiro passa a preencher de verdade.
- **`SubmitVoiceSummaryResponseUseCase`** busca o `User` (`IUserRepository.GetByIdAsync`) e repassa
  `Interests`/`AdditionalProfileNotes` no `ContentEvaluationRequest`.
  `GroqContentEvaluationService.BuildUserPrompt` injeta a instrução **só no parágrafo de
  feedback** — a nota continua vindo inteiramente de correção/clareza, mesma garantia da Fase 4
  (nenhum dado subjetivo do perfil influencia o Score).
- **`GenerateLinkedInDraftUseCase`** busca o mesmo perfil e injeta no prompt do rascunho — o post
  gerado pode puxar um gancho pessoal do aluno em vez de ficar genérico.
- **Decisão explícita: `EvaluateWeeklyProjectUseCase` (avaliação de projeto) ficou de fora.** Mesmo
  `ContentEvaluationRequest`, mas feedback sobre revisão de código não ganha com analogia de hobby —
  incluir ali seria personalização por completismo, não por utilidade real.

## Verificação

- `dotnet build`: limpo, 0 erros.
- `dotnet test`: 319 aprovados (0 falhas) — os 5 novos testes de `PersonalizationPromptBuilder` mais
  os 314 que já existiam.
- **Sem teste dedicado para os 2 casos de uso em si** (mesmo gap documentado em
  `docs/ARQUITETURA.md`, "Focadu.Tests só testa domínio puro" — casos de uso que dependem de
  repositório/serviço externo não têm fake, verificação fica pra uso ao vivo com Postgres + Groq
  real). Próxima vez que alguém gravar um resumo falado ou gerar um rascunho de LinkedIn com um
  usuário que já preencheu a Entrevista de Perfil, vale conferir se o feedback/rascunho de fato
  referencia os interesses cadastrados.
