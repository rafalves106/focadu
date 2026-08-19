# Resumo — Fase 10: Estados de Erro

## ⚠️ Os 4 links do Figma não correspondiam aos nomes do prompt

Antes de implementar, abri os 4 nodes do Figma - **nenhum dos 4 batia com o rótulo do prompt**:

| Link do prompt | Rótulo do prompt | Conteúdo real do node (`data-name`) |
|---|---|---|
| `13-953` | Sem Dados / Empty State | **Erro — Sem Conexão** (ícone wifi-off, "TENTAR NOVAMENTE") |
| `13-978` | Sem Conexão | **Erro — Sessão Expirada** (30min de inatividade, "RETOMAR SESSÃO") |
| `13-1004` | Timeout / Carregamento Lento | **Erro — Resposta Incorreta** (variante de feedback de quiz - certo/errado, revisão da IA - nem é uma tela de erro) |
| `13-1040` | Erro Genérico | **Erro — Streak Perdido** (gamificação - "Melhor Streak"/"Streak Atual", "COMEÇAR NOVO STREAK") |

Dado isso, a implementação seguiu a **especificação funcional em texto do próprio prompt**
(título/descrição/ícone/CTAs de cada um dos 4 tipos, que estava completa e sem ambiguidade) e
usou o único node com conteúdo aproveitável (`13-953`, "Sem Conexão" de verdade) como referência
visual compartilhada (frame do ícone, hierarquia de texto, botão primário cheio + ação secundária
em texto) pras 4 telas - ver `ErrorLayout.tsx`.

**"Sessão Expirada" e "Streak Perdido" não foram construídos** - o app não tem sessão/login (
usuário único hardcoded, sem expiração por inatividade) nem sistema de streak (Gems/XP/streak em
standby desde a Fase 6, reconfirmado nas Fases 7/8/9) - nenhum dos dois corresponde a um dos 4
tipos de erro pedidos.

## O que foi implementado

- **`lib/apiError.ts`** (novo) - `classifyApiError(err)`, classifica qualquer erro pego num catch
  numa `ApiFailure` tipada (`noConnection | timeout | serverError | notFound | generic`):
  `DOMException` com `name === 'TimeoutError'` → timeout (ver abaixo); `TypeError` ou
  `!navigator.onLine` → noConnection; `ApiError` (api/client.ts) com `status >= 500` → serverError,
  `404` → notFound, resto → generic.
- **`api/client.ts`** - `request()` ganhou timeout real via `AbortSignal.timeout()` (nativo, sem
  `AbortController` manual) - 10s por padrão (sugerido no prompt). `submitVoiceSummaryResponse` usa
  70s (o backend já tem seu próprio timeout de 60s pra Groq - ver "Decisões técnicas").
- **`useApiResource`** - `error` virou `ApiFailure | null` (era `string | null`); ganhou `retry()`
  (bump num contador que já estava nas deps do efeito, refaz o fetch sem duplicar a lógica).
- **`components/errors/`** (novo): `ErrorLayout` (chrome compartilhado - ícone/legenda/título/
  descrição/CTAs), `EmptyStateError`, `NoConnectionError`, `TimeoutError` (com spinner não-
  bloqueante), `GenericError`, e `ApiErrorScreen` (dispatcher - escolhe qual das 3 telas de erro
  de rede mostrar a partir do `ApiFailure.type`; `EmptyStateError` fica fora do dispatcher porque
  não é um erro de rede, é uma condição sobre dados carregados com sucesso).
- **`components/ErrorBoundary.tsx`** (novo) - class component (única forma de implementar
  `componentDidCatch`), pega exceções de render que nenhum catch de fetch cobriria. Montado em
  `App.tsx` ao redor do `<Outlet/>`, `key={location.pathname}` pra resetar sozinho ao navegar pra
  outra rota depois de um crash.
- **Integração**: as ~10 telas que usam `useApiResource` trocaram
  `if (error) return <Centered text={error} tone="alert" />` por
  `if (error) return <ApiErrorScreen error={error} onRetry={retry} />` (`StartPage`,
  `StartDashboard`, `CourseDetailPage`, `WeeklyDetailPage`, `WeeklyProjectPage`,
  `ReadingActivity`, `VideoActivity`, `AdminContentPage` x3). `TodayPage` (não usa
  `useApiResource`, tem seu próprio `useEffect`) ganhou o mesmo tratamento manualmente.
  `CourseDetailPage` ganhou `EmptyStateError` no lugar do texto "Nenhuma semana cadastrada ainda."

## Decisões técnicas tomadas que não estavam no prompt original

- **`useApiResource` mudou de forma** (`error: string|null` → `ApiFailure|null`, +`retry`) em vez
  de criar um hook `useApiError` paralelo (sugerido no prompt) - um hook que só guarda 1 `useState`
  e 1 função de classificação seria estado duplicado (`useApiResource` já gerencia
  loading/error/data); a classificação virou uma função pura (`classifyApiError`, não um hook -
  não precisa de state/effect próprio) reaproveitada tanto por `useApiResource` quanto por
  `TodayPage` (que não usa o hook).
- **`ApiErrorScreen` (dispatcher) não estava no prompt** - sem ele, cada uma das ~10 telas
  precisaria de 3-4 linhas de `if (error.type === ...)` repetidas - virou 1 componente central,
  cada tela troca 1 linha.
- **Timeout do VoiceSummary é 70s, não 10s** - o endpoint de áudio transcreve (Groq Whisper) e
  avalia (Groq chat completion) em sequência no backend, que já tem seu próprio timeout de 60s pra
  Groq (`GroqContentEvaluationService`, ver `docs/ARQUITETURA.md`). Um timeout de cliente de 10s
  quebraria essa atividade toda vez - não fazia sentido aplicar o mesmo valor padrão sem checar as
  outras chamadas da Api.
- **"Continuar Esperando" (Timeout) e "Tentar Novamente" chamam a mesma função (`retry`)** - depois
  que `AbortSignal.timeout()` dispara, a requisição original já está morta; não há como "estender"
  um fetch abortado, só refazer. Retry manual (nunca automático/silencioso, conforme pedido no
  prompt) cobre os dois textualmente.
- **"Modo Offline" (NoConnection) e "Reportar" (GenericError) não foram construídos** - ambos
  marcados "futuro" no próprio prompt, sem destino real (cache local não existe; não há endereço de
  suporte/formulário de feedback) - preferido omitir a deixar um botão que parece funcional mas não
  faz nada.
- **`AbortSignal.timeout()` rejeita com `DOMException` `name: "TimeoutError"`, não `"AbortError"`**
  (isso é especificação da API, não um detalhe do projeto) - `AbortError` é reservado pra
  cancelamento manual via `AbortController.abort()`, que este app não usa em lugar nenhum. Detalhe
  fácil de errar (o prompt sugeria checar `AbortError`) - verificado ao vivo antes de fechar a fase.
- **`EmptyStateError` só foi ligado num lugar real** (`CourseDetailPage`, sem semanas) - as outras
  telas do app sempre têm dado (curso único sempre seedado com Dailies) - não fabricado como
  "provavelmente vai precisar" em telas que nunca ficam vazias na prática.

## Estrutura de arquivos criada

```
frontend/src/
  lib/apiError.ts                    <- novo (classifyApiError, ApiFailure)
  api/client.ts                       <- request() com AbortSignal.timeout()
  api/useApiResource.ts                <- error tipado + retry()
  App.tsx                               <- <ErrorBoundary key={pathname}> ao redor do <Outlet/>
  components/
    ErrorBoundary.tsx                    <- novo
    errors/
      ErrorLayout.tsx                      <- novo (chrome compartilhado)
      EmptyStateError.tsx                   <- novo
      NoConnectionError.tsx                  <- novo
      TimeoutError.tsx                        <- novo
      GenericError.tsx                         <- novo
      ApiErrorScreen.tsx                        <- novo (dispatcher)
  routes/StartPage.tsx, StartDashboard.tsx, CourseDetailPage.tsx, WeeklyDetailPage.tsx,
         WeeklyProjectPage.tsx, AdminContentPage.tsx, TodayPage.tsx  <- integrados
  components/ReadingActivity.tsx, VideoActivity.tsx                  <- integrados
```

## Testes

- Backend: nenhuma mudança - `dotnet build`/`dotnet test` continuam limpos (57 aprovados), só
  rodados de novo pra garantir que nada quebrou.
- Frontend: `tsc -b`, `oxlint`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`/Fase 7, nenhum novo).
- Verificação ao vivo (Playwright headless, interceptando `page.route()` pra simular cada falha -
  sem precisar quebrar o backend de verdade), 4 cenários + o boundary:
  1. **Sem Conexão**: todas as chamadas a `/api/**` abortadas (`route.abort('failed')`) → tela
     "🔌 Sem Conexão com o Servidor" renderizou; clicar "TENTAR NOVAMENTE" com a "conexão de volta"
     (intercept desligado) voltou pro estado de carregamento e re-buscou.
  2. **Erro Genérico**: `/api/today` respondendo 500 com o envelope `{error, message}` real do
     backend → "❌ Algo Deu Errado", "ERRO 500" na legenda.
  3. **Empty State**: `/api/courses/{id}` respondendo 200 com `monthlies: []` →
     `CourseDetailPage` renderiza normal e mostra "📦 Nenhuma semana cadastrada".
  4. **Timeout**: `/api/today` interceptado sem nunca responder, esperado 11.5s reais (> 10s do
     timeout) → "⏱️ Carregamento Lento" com spinner, confirma que `AbortSignal.timeout()` +
     `classifyApiError` reconhecem `TimeoutError` corretamente (não `AbortError`).
  5. **ErrorBoundary**: `/api/courses/{id}` respondendo `monthlies: null` (quebra
     `course.monthlies.flatMap(...)` dentro do render, fora do try/catch do `useApiResource`) →
     boundary pegou, renderizou `GenericError`, erro logado no console.
  - Um bug real do **script de teste** (não do app) foi encontrado e corrigido durante essa
    verificação: o primeiro glob de rota (`**/api/**`) também interceptava os módulos-fonte que o
    Vite dev server serve por HTTP (`/src/api/client.ts`, `/src/api/types.ts`), quebrando o app
    inteiro (tela em branco) - corrigido restringindo o glob pro host do backend
    (`http://localhost:5282/api/**`).

## Dúvidas ou pontos abertos para a próxima fase

- **"Sessão Expirada" e "Streak Perdido"** (os 2 designs do Figma sem uso nesta fase) ficam
  registrados aqui caso façam sentido no futuro - o primeiro precisaria de um conceito de
  sessão/expiração que o app não tem (usuário único, sem login); o segundo é gamificação, em
  standby.
- **Timeout de 10s não foi calibrado contra latência real de produção** (só ambiente local) - o
  prompt já sinalizava isso como um valor "sugerido, pode ajustar".
- **`AdminContentPage`** ganhou a integração com `ApiErrorScreen` (forçado pela mudança de tipo de
  `useApiResource.error`, não por pedido explícito do checklist) - continua sem o restante do
  polimento visual das Fases 7-9 (decisão da Fase 6, reafirmada na Fase 8: "funcional, não o mesmo
  nível de `/hoje`").
