## Groq (transcricao e avaliacao por IA, Fase 5)

Os dois ports que existiam so como stub desde a Fase 1 (`IAudioTranscriptionService`,
`IContentEvaluationService`) agora tem adapter concreto via Groq
(`Focadu.Infrastructure.Services`) - ver "Resumo falado por voz" acima pro fluxo completo. Os
dois usam `HttpClient` tipado (`services.AddHttpClient<TPort, TAdapter>`), base address
`https://api.groq.com/openai/v1/`. Timeout por tentativa diferenciado por adapter (ver "Retry
automatico" abaixo) - diferente dos outros 3 adapters Groq (rascunho de post, avaliacao de
projeto, analogia de leitura), que continuam com 60s de chamada unica, sem retry (prompts
maiores, sem o orcamento apertado do fluxo de resumo falado).

### Retry automatico

`TranscribeAsync` e `EvaluateAsync` (as duas chamadas do fluxo de resumo falado por voz,
`SubmitVoiceSummaryResponseUseCase`) fazem ate 2 retries (3 tentativas) via `HttpRetry`
(`Focadu.Infrastructure.Services.HttpRetry`) - helper generico e reutilizavel (sem interface/DI, e
detalhe de HTTP), tambem usado por `GitHubService` (ver secao GitHub abaixo).

- **Retryable:** `HttpRequestException` (falha de transporte), `TaskCanceledException` que nao
  veio de cancelamento do usuario (timeout do `HttpClient`), HTTP 429 e HTTP 5xx. Groq/GitHub 4xx
  fora 429 nunca e retryable (o pedido em si esta errado). Resposta 200 mas com conteudo
  inutilizavel (`transcricao_vazia`, `avaliacao_ia_formato_invalido`) tambem retry - a Groq roda
  com `temperature=0.2`, nao e deterministica - mas entra no mesmo orcamento de 2 retries, nao e
  retry indefinido. `groq_api_key_nao_configurada` nunca retry (falha antes de qualquer chamada
  HTTP).
- **Backoff:** exponencial + jitter (~500ms na 1a espera, ~1s na 2a), com teto de 2s de espera por
  tentativa - mesmo se a Groq mandar um `Retry-After` maior num 429.
- **Timeout por tentativa - corrigido em 2026-09-13 e 2026-09-17, verificacao ao vivo:**
  `EvaluateAsync` (avaliacao, texto puro) usa 6s (`GroqContentEvaluationAttemptTimeout`) - valor
  original era 2s (cobria folgado o tempo real de resposta da Groq em chat completion simples),
  mas se mostrou curto demais depois da Fase 39 ter acrescentado um passo de raciocinio/correcao
  ao prompt antes do score: confirmado ao vivo (logs de 2026-09-17) que as 3 tentativas bateram no
  timeout de 2s em sequencia sem nenhuma completar. Esse timeout de 6s se aplica a CADA UMA das 2
  chamadas Groq que `EvaluateAsync` faz desde a Fase 42 (correcao de transcricao numa chamada
  dedicada, depois a nota numa 2a - ver secao "Resumo falado por voz" acima). `TranscribeAsync`
  (transcricao) usa 15s (`GroqAudioTranscriptionAttemptTimeout`) - **valor original tambem era
  2s, mas se mostrou curto demais na pratica**: diferente de `EvaluateAsync`, essa chamada faz
  upload do audio gravado (multipart) antes da Groq comecar a processar, e o tempo de upload
  depende da conexao real do usuario, nao so da velocidade da LPU. Confirmado ao vivo com uma
  gravacao real: as 3 tentativas bateram no timeout de 2s sem nenhuma completar, gerando
  `groq_timeout` (`"A transcricao demorou demais para responder"`) num audio legitimo, nao numa
  falha de rede de verdade.
- **Orcamento do fluxo:** pior caso de transcricao+avaliacao juntas (transcricao ate 3 tentativas
  de 15s + avaliacao = 2 chamadas sequenciais, cada uma ate 3 tentativas de 6s, mais backoff) fica
  em ~85s, dentro dos 95s que o frontend usa como referencia pro timeout dessa chamada
  (`VOICE_SUMMARY_TIMEOUT_MS = 95_000`, `frontend/src/api/client.ts` - 70_000 ate a Fase 42, quando
  a avaliacao virou 2 chamadas em vez de 1).
- Falha definitiva (depois de esgotar as tentativas) cai no mesmo erro/`Code` de antes
  (`groq_transcricao_falhou`, `groq_avaliacao_falhou`, `groq_timeout`, `groq_indisponivel`,
  `transcricao_vazia`, `avaliacao_ia_formato_invalido`) - sem mudanca de contrato pro frontend,
  que ja trata esses erros no mesmo estado `submitting`/erro de sempre (nenhum estado novo).
- `# ponytail: loop manual, migrar pra Polly se aparecer necessidade de circuit breaker/policy
  composta` - decisao registrada no proprio `HttpRetry`.

### Como configurar a chave da Groq

A chave **nunca** fica hardcoded nem commitada - vem de `Groq:ApiKey` na configuracao do
ASP.NET Core, com 3 formas de prover isso (da mais recomendada pra dev, a de producao/CI):

```bash
# 1. Recomendado em dev: user-secrets (Focadu.Api.csproj ja tem UserSecretsId configurado)
cd backend/src/Focadu.Api
dotnet user-secrets set "Groq:ApiKey" "sua-chave-aqui"

# 2. Alternativa: variavel de ambiente (funciona em qualquer ambiente, inclusive CI/deploy)
export Groq__ApiKey="sua-chave-aqui"   # note o duplo underscore - convencao do ASP.NET Core p/ chaves aninhadas

# 3. Nunca faca isso: colocar a chave em appsettings.json ou appsettings.Development.json -
# esses arquivos sao commitados no Git.
```

Sem a chave configurada, o resto da Api sobe normalmente (diferente da connection string, que
falha o startup se ausente) - so as duas chamadas à Groq falham, com um erro claro
(`groq_api_key_nao_configurada`, 502) em vez de um 401 sem contexto vindo da Groq. Chave obtida em
[console.groq.com](https://console.groq.com).

### Status de IA (badge no GlobalNav, Fase 28)

`GET /api/system/ai-status` devolve o status de cada `IAiProviderHealthCheck` registrado (hoje so
`GroqHealthCheckService`) - pensado pra ajudar o Falves a perceber de relance, direto na tela, quando
precisa trocar a chave da Groq ou desativar uma atividade que depende de IA (VoiceSummary, avaliacao
de projeto, rascunho de LinkedIn, analogia de leitura - todas usam a mesma `Groq:ApiKey`).

- **Ping de verdade, nao so "a chave existe":** `GroqHealthCheckService` faz `GET models` (lista o
  catalogo de modelos da Groq) - leve, nao consome cota de geracao, mas confirma que a chave e
  valida e a Groq esta respondendo, nao so que uma env var esta preenchida.
- **`Configured=false` nunca tenta a chamada** - mesma distincao de "nao configurado" vs "configurado
  mas fora do ar" que os outros adapters Groq ja fazem.
- **Cache de 45s em memoria** (dentro do proprio `GroqHealthCheckService`, `Singleton` - unico
  adapter Groq que nao e `Transient` via `AddHttpClient<TService>`, ver `DependencyInjection.cs`):
  varios usuarios com o GlobalNav aberto ao mesmo tempo geram no maximo 1 chamada de teste a cada
  45s, nao 1 por requisicao de badge. `SemaphoreSlim` evita 2 chamadas simultaneas quando o cache
  expira com requisicoes concorrentes.
- **Nunca lanca `ExternalServiceException`** - ao contrario dos outros adapters Groq, uma falha de
  rede/timeout aqui vira `Available=false` + `ErrorMessage` no DTO, nao um erro HTTP - o endpoint
  sempre devolve 200, o proprio "esta fora do ar" e um resultado valido, nao uma excecao.
- Endpoint atras de `.RequireAuthorization()` (mesmo criterio "app so mostra GlobalNav pra usuario
  logado"), mas sem filtro por usuario - o status do provedor e global, nao por conta.
- **Frontend:** `lib/useAiStatus.ts` faz polling a cada 45s (mesma janela do cache do backend);
  desde a Fase 62 o detalhe por provedor (`AiStatusDetails`, em `AiStatusBadge.tsx`) fica dentro do
  menu do usuario (`UserMenu`, no `GlobalNav`) - nao ha mais selo fixo na barra. Com a IA parcial/
  fora/sem resposta, um ponto colorido aparece no avatar.

### Suporte Rapido de IA (botao flutuante durante a sessao, Fase 32)

Implementa a ideia ja registrada em `secret/rascunhos/visual-ui-ux.md` ("Suporte Rápido de IA: Um
botão flutuante acessível para dúvidas pontuais... interações curtas e diretas, impedindo que o
usuário se perca em diálogos longos") - `QuickQuestionOrb` (`SessionShell.tsx`) existia desde a
Fase 19 como stub desativado (`return null`, os 2 call sites - `SessionLayout`/`WeeklyProjectPage`
- ja existiam) e volta a renderizar de verdade nesta fase.

- **`IStudyAssistantService`/`GroqStudyAssistantService`**: adapter Groq a mais (mesmo
  `HttpClient`/`GroqOptions`, `GroqDefaultTimeout` = 60s, sem retry - mesma categoria de
  Draft/ProjectEvaluation/Analogy, ver "Retry automatico" acima), texto livre (sem JSON mode,
  mesmo estilo de `GroqDraftGenerationService` - a resposta E o texto mostrado ao aluno).
  `GroqStudyAssistantService.BuildMessages` monta `system` (persona) + `system` (contexto da
  sessao + personalizacao, quando houver - valem a conversa inteira, por isso ficam fora do turno
  atual) + 1 mensagem `user`/`assistant` por item de `History` (ordem cronologica) + a pergunta
  atual como ultimo turno `user`.
- **`AskStudyAssistantUseCase`** (`Focadu.Application.Assistant`) **sem buscar Daily/Weekly/
  CuratedContent por Id**: recebe `Context` (string livre, opcional) ja pronto do frontend - o que
  ja esta na tela (titulo+trecho da leitura em andamento, especificacao do projeto semanal, ou so
  "tema da semana + etapa atual" como fallback generico) - evita duplicar toda a logica de posse/
  autorizacao que ja rodou quando o frontend buscou esses dados nos proprios endpoints
  (`GetDailyStateUseCase`, `GetCuratedContentUseCase`, `GetWeeklyDetailUseCase`). `Question`
  limitada a 500 chars (`pergunta_muito_longa`), `Context` truncado em 6000 chars (nunca erro, so
  corta) - constantes `internal` na propria classe, testadas puras (`Focadu.Tests.Assistant`).
  Personalizacao por interesses/notas (Fase 21/22/27) reaproveitada via
  `PersonalizationPromptBuilder`, mesmo padrao dos outros prompts de IA - bonus, nunca obrigatorio.
  **`History` (Fase 33, reversao parcial de uma decisao da Fase 32):** a Fase 32 tinha decidido de
  proposito NAO enviar nenhum historico ao backend, pra bater literalmente com "interacoes curtas
  e diretas" do rascunho - revertido apos o Falves testar ao vivo e ver o custo real: uma pergunta
  de seguimento natural ("como o cache e organizado?", sem repetir "do SO") perdeu o fio, porque o
  backend nao tinha como saber a qual dos 2 caches discutidos antes (navegador/DNS) a pergunta se
  referia, e respondeu com a leitura mais ampla do conteudo da tela. `ClampHistory` (`internal
  static`, testado puro) mantem so as ultimas `MaxHistoryMessages` = 8 mensagens (~4 trocas
  pergunta+resposta) - historico **curto** de proposito, nao memoria de conversa ilimitada: o
  espirito original da Fase 32 continua valendo, so a decisao de "zero historico" que virou "pouco
  historico". Cada item de `History` tambem trunca em `MaxHistoryMessageLength` = 800 chars.
- **Frontend**: `StudyAssistantWidget.tsx` (botao flutuante `fixed bottom-6 right-6` + painel de
  chat `fixed bottom-24 right-6` quando aberto) - `QuickQuestionOrb` (`SessionShell.tsx`) so
  renderiza isso. `context` vem de `useStudyAssistantContext()` (`lib/studyAssistantContext.ts`) -
  store externo modulo-level (mesmo padrao de `sessionExpiredHandler` em `api/client.ts`), nao
  React Context: `SessionLayout` seta isso sozinho via `useEffect` (prop nova opcional
  `assistantContext`, cai no fallback `eyebrow + stepLabel` quando omitida) e `WeeklyProjectPage`
  seta direto (nao usa `SessionLayout`) - nenhum dos ~9 pontos que ja renderizavam
  `<SessionLayout>`/`<QuickQuestionOrb/>` precisou de prop nova pra ganhar o botao em si, so
  `ReadingActivity`/`VideoActivity` passam `assistantContext` mais rico (titulo + corpo/descricao
  do conteudo) por serem o cenario mais provavel de duvida sobre o material.
  - `messages` (transcript local) e enviado como `History` (`StudyAssistantHistoryItem[]`, Fase
    33) a cada pergunta nova - o array de ANTES da pergunta atual, capado em
    `STUDY_ASSISTANT_MAX_HISTORY` = 8 no proprio cliente (mesmo numero do backend, so evita
    payload crescendo sem necessidade numa conversa longa - quem realmente garante o limite e o
    `ClampHistory` do backend).
  - **Fechar (✕ ou clique fora) so oculta o painel, nunca apaga `messages`** - so "Limpar" (botao
    no cabecalho, aparece so quando ha mensagens) ou digitar `/clear` (reconhecido localmente
    antes de virar pergunta - Fase 33: no teste real, "/clear" foi mandado como texto literal e a
    IA "respondeu" sem limpar nada de verdade) apagam o transcript de fato. `messages` some por
    completo so quando o componente desmonta (troca de atividade/pagina).
  - Clique fora fecha via `mousedown` em `document` checando `containerRef.current.contains(e.
    target)` (nao um backdrop `fixed inset-0` como `SettingsMenu` - o assistente nao e modal, o
    resto da tela continua interativo com o painel aberto).
  - **Fase 37 (pedido explicito: "ao inves do botao, algo mais parecido com um chat"):** nas telas
    com "material de hoje" (`SessionLayout`/`useMaterialSidebar`), o botao flutuante deu lugar ao
    card fixo `StudyAssistantPanel` (`components/assistant/`) no sidebar direito, ao lado do
    `QuickNotePanel`. Estado/logica (enviar pergunta, historico, `/clear`, erro) extraida pro hook
    `useStudyAssistantChat` (`lib/`) - compartilhado pelos 2 componentes, so a apresentacao muda
    (card sempre visivel vs. painel que abre por cima de tudo). `StudyAssistantWidget`/
    `QuickQuestionOrb` continuam existindo (WeeklyProjectPage nao tem esse sidebar).