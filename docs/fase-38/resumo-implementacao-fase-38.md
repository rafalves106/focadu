# Resumo — Fase 38: Bloqueio do Projeto Semanal + Painel de Início + Sequenciamento de Daily por Progresso

> Fase composta por várias rodadas de bug fix "ao vivo" (14 e 15/09/2026), fechada num único
> resumo porque nenhuma rodada anterior tinha sido documentada ainda. A rodada final (38b, 15/09)
> é a mais substancial - reescreve como o app decide "qual Daily vem a seguir".

## O que foi implementado

**Rodada 1 (14/09) - bloqueio do Projeto Semanal:**
- `Weekly.AreDailiesComplete()` extraído de `IsModuleComplete()`; `Weekly.SubmitProject()` novo,
  recusa com `DomainException` (`projeto_semana_bloqueado`, 409) enquanto as Dailies originais da
  semana não estiverem todas `Completed` - antes disso `SubmitWeeklyProjectUseCase` chamava
  `WeeklyProject.Submit` direto, sem nenhuma checagem (o card sempre mostrava "PENDENTE" desde o
  dia 1 da semana).
- `WeeklyProjectDto` ganhou `IsLocked` (preenchido em `GetWeeklyDetailUseCase`,
  `EvaluateWeeklyProjectUseCase`, `SubmitWeeklyProjectUseCase`); frontend
  (`WeeklyProjectCard`/`WeeklyProjectPage`) consome isso pra badge "🔒 BLOQUEADO" e esconder o
  formulário de envio com um aviso explicando o motivo.

**Rodada 2 (14/09) - sessão já concluída hoje derrubava `/hoje`/`/start`:**
- `GetTodayUseCase` resolvia a Daily agendada pro calendário de hoje e delegava pra
  `Weekly.EvaluateDailyAccess`, que recusa `Start` numa Daily ainda não iniciada quando o usuário
  já gastou a única conclusão permitida no dia corrente (`daily_limite_diario_atingido`) - mesmo
  quando essa conclusão veio de retomar uma Daily atrasada de outro dia. Isso é uma regra de
  negócio real, mas "/hoje" é um GET best-effort e não deveria quebrar por causa dela.
- Novo `DailyAccessMode.Blocked`: `GetTodayUseCase` captura esse caso e devolve esse estado em
  vez de deixar a exceção de domínio vazar como 409 - `StartOrResumeDaily`/`CompleteDaily`
  continuam recusando normalmente (mutação real, não um GET). `TodayPage`/`StartDashboard`
  mostram um aviso amigável ("sessão de hoje já concluída... volte amanhã") em vez de erro
  genérico.
- Emojis trocados por ícones pixel art fornecidos pelo Falves em vários componentes (mapa, check,
  troféu, fogo, gema, medalha de ouro) - puramente visual, sem relação com o resto da fase.

**Rodada 3 (14/09) - carrossel de cursos + status "bloqueado" na tela de início:**
- `StartDashboard`: badge "Status" do card Hoje reflete `accessMode.Blocked`
  ("🔒 BLOQUEADO ATÉ AMANHÃ"); rodapé de texto puro duplicando Gems/Streak (já mostrados em pixel
  art no header) removido.
- `CourseCarousel` (novo componente): card visual arrastável por curso matriculado, no lugar do
  label de texto puro - `StartDashboard` passou a buscar o detalhe de TODOS os cursos matriculados
  (hoje normalmente 1, já pronto pra quando isso deixar de ser verdade).

**Rodada 38b (15/09) - sequenciamento de Daily por progresso, não mais calendário (motivo desta
fase ganhar nome próprio "b"; ver `docs/ARQUITETURA.md` para a versão consolidada e sempre-atual
destas duas mudanças):**
- **Bug relatado ao vivo:** o Falves concluiu a Daily 1 num dia, e no acesso seguinte a "/hoje"
  pulou direto pra Daily 4, deixando as Dailies 2 e 3 presas em `Locked` pra sempre. Causa raiz:
  `Daily.Date` é fixado de uma vez só na matrícula (`EnrollUserInCourseUseCase`, 1 dia útil por
  Daily) e todo o acesso/agendamento (`Weekly.EvaluateDailyAccess`, `GetTodayUseCase`,
  `Weekly.GetDailyByDate`) comparava esse calendário hipotético com "hoje" - qualquer folga entre
  esse ritmo assumido e o ritmo real do aluno pulava Dailies inteiras, sem chance de completá-las
  depois (uma Daily nunca iniciada cujo `Date` já passou virava `ReadOnly` permanente).
- **`DailySequencing`** (novo, `Focadu.Application.Dailies`, `internal static`): `FindNext`
  (Daily não-reforço de menor `DayNumber` ainda não concluída, cruzando TODAS as Weeklies da
  matrícula), `FindInProgress` (qualquer Daily `InProgress`, sempre prioridade),
  `IsNext` (o dailyId em questão é o `FindNext`?).
- **`Weekly.EvaluateDailyAccess`/`StartOrResumeDaily`** trocaram o parâmetro de acesso: em vez de
  comparar `Date` com "hoje", recebem `isNextInSequence` (calculado por `DailySequencing` na
  Application, já que uma Weekly sozinha não enxerga as irmãs). Reforço nunca disputa a sequência
  principal (acesso sempre por link explícito). `Weekly.GetDailyByDate` removido (sem mais uso).
- **`GetTodayUseCase`** reescrito: `DailySequencing.FindInProgress` (prioridade) ou
  `DailySequencing.FindNext`, nunca mais uma busca por data
  (`IWeeklyRepository.GetByEnrollmentAndDateAsync` removido, sem mais uso).
- **`GetDailyStateUseCase`/`StartOrResumeDailyUseCase`** passaram a buscar todas as Weeklies da
  matrícula (a segunda já buscava, pro guard de publicação pendente) pra calcular
  `isNextInSequence` antes de chamar `Weekly.EvaluateDailyAccess`.
- **`CompleteDailyUseCase`**: o streak só contava a 1ª conclusão do dia se `Daily.Date == hoje` -
  mesmo bug de fundo (streak parava de contar pra quem estivesse fora do ritmo assumido na
  matrícula). Removida a checagem - 1ª conclusão sempre conta pro streak (a ação já é sempre
  síncrona/"agora").
- **`DailyOverviewDto`** ganhou `IsNext` (`GetWeeklyDetailUseCase`) - o frontend
  (`WeeklyDetailPage`) usava `Daily.Date` comparado ao calendário real (`isFuture`/`isToday`) pra
  decidir bloqueio/destaque do card de cada dia; trocado por `day.isNext` (removida a coluna de
  sigla do dia da semana, que também vinha de `Date` e não fazia mais sentido exibir).
- **Código de erro de domínio renomeado**: `daily_futura` → `daily_bloqueada` (mesmo status HTTP,
  400) - `Weekly.EvaluateDailyAccess` lança esse código quando a Daily não é a `isNextInSequence`
  (nem reforço), no lugar da comparação de data antiga.
- **Bug relacionado, corrigido junto:** `GroqAnalogyGenerationService` (analogias
  personalizadas por interesse, Fase 21) era o único adapter Groq do projeto sem instrução
  explícita "em português" no `SystemPrompt` - `openai/gpt-oss-120b` ocasionalmente respondia em
  inglês (reportado ao vivo, analogia sobre academia saiu em inglês numa leitura em português).
  Corrigido acrescentando a instrução. Analogias já cacheadas em inglês antes deste fix continuam
  em inglês (`PersonalizedAnalogy` é gerado uma vez e nunca reavaliado) - sem endpoint de
  invalidação de cache ainda, avaliado como não valer a pena por ora.
- **Rascunho registrado** (não implementado, ideia pra explorar depois):
  `secret/rascunhos/traducao-conteudo-tempo-real.md` - motivado pelo bug acima, oferecer tradução
  em tempo real do conteúdo do curso pra inglês/outros idiomas via IA.

## Decisões técnicas tomadas que não estavam no prompt original

- **`isNextInSequence` é calculado fora do domínio (Application), nunca dentro de `Weekly`** -
  uma Weekly sozinha só enxerga as próprias Dailies; decidir "é a próxima de toda a matrícula"
  exige cruzar todas as Weeklies (mesmo padrão já usado pelo guard de publicação pendente em
  `StartOrResumeDailyUseCase`).
- **A distinção `Replay` vs. `ReadOnly` de uma Daily já `Completed` continua comparando
  `Daily.Date == hoje`, deliberadamente não trocado por `CompletedAt`.** Só decide o
  comportamento de repetir algo já concluído (nunca bloqueia conteúdo novo), e trocar pra
  `CompletedAt` (sempre "agora" no momento da conclusão) quebraria a cobertura de teste de
  domínio dessa distinção sem nenhum ganho de correção prático - avaliado e descartado.
- **Reforço nunca disputa a sequência principal** (`isNextInSequence` sempre `false` seria
  aceitável pra uma Daily de reforço) - `Weekly.EvaluateDailyAccess` checa
  `!target.IsReinforcement && !isNextInSequence` antes de bloquear, preservando o acesso sempre
  por link explícito que já existia.
- **`Daily.Date` não foi removido do domínio/schema** - continua populado por
  `EnrollUserInCourseUseCase` (mesma distribuição por dia útil de antes) e usado pra exibição e
  pela distinção Replay/ReadOnly acima. Só parou de gatilhar acesso/sequenciamento. Remover o
  campo por completo seria uma migração maior, fora do escopo deste bug fix.
- **Fase nomeada "38b"** (não uma Fase 39 nova) porque a Fase 38 (rodadas 1-3 acima) nunca tinha
  sido fechada com este resumo/atualização de `ARQUITETURA.md` - mesmo padrão já usado no projeto
  pra "Fase 37b" (ver `DailyAccessMode.Blocked`).

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Dailies/DailySequencing.cs   <- novo (Fase 38b)
backend/tests/Focadu.Tests/Dailies/DailySequencingTests.cs  <- novo (Fase 38b)
frontend/src/components/CourseCarousel.tsx                  <- novo (rodada 3, 14/09)
secret/rascunhos/traducao-conteudo-tempo-real.md             <- novo (rascunho, Fase 38b)
docs/fase-38/resumo-implementacao-fase-38.md                 <- este arquivo
```

Arquivos modificados na Fase 38b (backend): `Weekly.cs`, `GetTodayUseCase.cs`,
`GetDailyStateUseCase.cs`, `StartOrResumeDailyUseCase.cs`, `CompleteDailyUseCase.cs`,
`GetWeeklyDetailUseCase.cs`, `Weeklies/Dtos.cs`, `IWeeklyRepository.cs`, `WeeklyRepository.cs`,
`ApiExceptionHandler.cs`, `GroqAnalogyGenerationService.cs`, `WeeklyTests.cs`,
`DomainExceptionCodeTests.cs`. Frontend: `types.ts`, `WeeklyDetailPage.tsx`.

## Testes

- Backend: 348 testes passando (`dotnet test`) - inclui os 3 testes novos de
  `Weekly.SubmitProject`/`AreDailiesComplete` da rodada 1, e a reescrita completa da cobertura de
  `Weekly.EvaluateDailyAccess`/`StartOrResumeDaily` + `DailySequencingTests.cs` novo (5 testes) na
  38b.
- Frontend: `tsc --noEmit` limpo após a Fase 38b (`WeeklyDetailPage.tsx`/`types.ts`).
- Rodadas 1-3 (14/09): verificadas ao vivo pelo Falves na época (ver mensagens de commit
  `43d7d1c`/`b132308`/`b21a63b`) - não há registro detalhado do passo a passo além do que está
  nessas mensagens, já que esta fase não tinha sido fechada com resumo até agora.
- Rodada 38b: não testada manualmente ponta a ponta pelo Claude nesta sessão (sem ambiente local
  rodando) - coberta pela suíte de testes de domínio acima, que reproduz o cenário relatado
  (concluir a Daily 1 e verificar que a Daily 2, não a 4, é a próxima liberada).

## Dúvidas ou pontos abertos para a próxima fase

- **`GetCourseRankingUseCase.ResolveCurrentWeekly` ainda resolve a "Weekly atual" (escopo do
  ranking `weekly`/`monthly`) comparando `Daily.Date` com "hoje"** - mesma fragilidade de fundo
  corrigida no atalho "/hoje" nesta fase, só descoberta na varredura, não corrigida por estar num
  caso de uso separado (efeito mais brando: só afeta o recorte do ranking, nunca bloqueia acesso a
  conteúdo). `DailySequencing` resolveria isso também se/quando for revisitado.
- **Analogias já cacheadas em inglês (geradas antes do fix de idioma) não se corrigem sozinhas** -
  `PersonalizedAnalogy` é gerado uma vez e nunca reavaliado; não há endpoint de invalidação de
  cache. Se o Falves quiser ver a leitura específica que motivou o bug já em português, precisa de
  uma limpeza manual no banco (não feita nesta fase - fora do escopo de um bug fix de prompt).
- **Rascunho de tradução em tempo real** (`secret/rascunhos/traducao-conteudo-tempo-real.md`) tem
  várias perguntas em aberto (escopo, idiomas, tradução sob demanda vs. pré-traduzida, cache) -
  nível "semente", sem nenhuma decisão tomada ainda.
