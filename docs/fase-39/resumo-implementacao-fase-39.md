# Resumo — Fase 39: Correção de Transcrição de Voz Antes da Avaliação + Título do Dia + Destaque de Semana Atual

## O que foi implementado

**Correção de transcrição do Whisper antes da avaliação (bug real relatado ao vivo: erro de
transcrição derrubando o score injustamente):**
- `GroqContentEvaluationService`: prompt de sistema reescrito para pedir um passo explícito de
  correção antes de avaliar - a IA corrige, usando `ExpectedAnswer`/`ContextText` como vocabulário
  de referência, apenas trechos que claramente são erro de reconhecimento de fala (termo técnico
  foneticamente deturpado), nunca completando, reescrevendo ou corrigindo um erro conceitual real
  do aluno. Uma única chamada Groq (não uma 2ª chamada separada).
- JSON de resposta ganhou o campo `correctedTranscript`, sempre a versão que a IA efetivamente
  avaliou; ausente/vazio (defensivo contra formato antigo/parcial) cai pro `UserAnswer` original em
  `ParseEvaluation`, nunca vira motivo de retry/erro sozinho.
- `IContentEvaluationService.ContentEvaluationResult` ganhou `CorrectedTranscript` (opcional,
  default `null` - `EvaluateWeeklyProjectUseCase`, que usa o mesmo port, simplesmente ignora).
- `ActivityResponse` ganhou campo novo `CorrectedTranscript` (nullable) - `Transcript` continua
  guardando o texto bruto do Whisper (auditoria); `CorrectedTranscript` guarda o que a IA
  efetivamente avaliou. Só preenchido no fluxo de `SubmitVoiceSummaryResponseUseCase`;
  `SubmitActivityResponseUseCase` (demais tipos de atividade) sempre passa `null`.
- Migration `AddCorrectedTranscript` (coluna nullable em `ActivityResponse`).
- `ActivityResponseDto`/`ActivityResponseRecorder`/`DailyStateMapper` propagam o campo novo até a
  API.

**Título do dia na visão de semana:**
- `GetWeeklyDetailUseCase`: `DailyOverviewDto` ganhou `Title`, resolvido a partir do
  `CuratedContent` da atividade de Leitura do dia (Vídeo como fallback quando não há Leitura;
  `null` quando nenhum dos dois existe - ex. alguma Daily de reforço sintética). Daily não tem
  título próprio, só o `CuratedContent` associado.
- Frontend (`types.ts`, `WeeklyDetailPage.tsx`): `DayCard` mostra o título do material em vez de
  só "Dia N" (mantém "Dia N" como rótulo pequeno acima quando há título).

**Destaque visual da semana atual + ajustes de largura:**
- `CourseDetailPage.tsx`: `findCurrentWeekId` identifica a 1ª semana acessível (não bloqueada por
  publicação pendente) e ainda incompleta, e só ela ganha a borda `accent` em `WeekSummaryCard` -
  antes, o emoji ▶️/🔒 era fixo por semana independente de progresso.
- `WeeklyDetailPage.tsx`: container alargado (`max-w-6xl`/`px-6 py-8`, no lugar de
  `max-w-5xl`/`p-8`) - mesmo ajuste já feito em `SessionShell.tsx`, pedido explícito do Falves.

## Decisões técnicas tomadas que não estavam no prompt original

- Correção de transcrição embutida no mesmo prompt/chamada de avaliação, em vez de uma 2ª chamada
  Groq dedicada - mais barato e mais rápido, e o modelo já suporta raciocinar antes de produzir o
  JSON final.
- `CorrectedTranscript` cai pro texto original quando a IA não retorna o campo, em vez de tratar
  ausência como formato inválido (`avaliacao_ia_formato_invalido`) - o campo é aditivo, uma resposta
  sem ele ainda é uma avaliação válida.
- `Transcript` bruto nunca é sobrescrito - preservado para auditoria de quais correções a IA de
  fato fez.

## Estrutura de arquivos criada

```
backend/src/Focadu.Infrastructure/Migrations/
├── 20260916003101_AddCorrectedTranscript.cs
└── 20260916003101_AddCorrectedTranscript.Designer.cs

docs/fase-39/
└── resumo-implementacao-fase-39.md
```

Nenhum arquivo novo fora de migrations/docs - todo o resto é alteração em arquivos existentes.

## Testes

Sem teste dedicado novo (mesmo gap já documentado em `docs/ARQUITETURA.md` para
`SubmitVoiceSummaryResponseUseCase` - depende de chave Groq real, verificação sempre foi ao vivo).
Verificação manual ao vivo do fluxo de avaliação de voz e das duas mudanças de frontend.

## Dúvidas ou pontos abertos para a próxima fase

- `CorrectedTranscript` ainda não é exibido em nenhuma tela (fica só persistido, para auditoria/
  debug futuro) - decidir se vale mostrar ao aluno em algum momento (ex. no histórico de tentativas)
  fica para quando houver necessidade real.
