# Resumo — Fase 32: Suporte Rápido de IA (botão flutuante)

## O que foi implementado

- **Backend**:
  - `IStudyAssistantService` (port, `Focadu.Application.Ports`) + `GroqStudyAssistantService`
    (adapter, `Focadu.Infrastructure.Services`) - chat completion Groq (`openai/gpt-oss-120b`),
    texto livre (sem JSON mode, mesmo estilo de `GroqDraftGenerationService`), mesmo `HttpClient`/
    `GroqOptions`/timeout padrão (60s, sem retry) dos outros adapters Groq de chamada única.
  - `AskStudyAssistantUseCase` (`Focadu.Application.Assistant`) - valida a pergunta (obrigatória,
    máximo 500 chars), trunca o contexto opcional em 6000 chars, busca `IUserRepository` só pra
    personalização por interesses/notas (Fase 21/22/27, via `PersonalizationPromptBuilder`,
    reaproveitado sem mudança), chama o port e devolve a resposta.
  - `POST /api/study-assistant/ask` (`Focadu.Api/Program.cs`) - `RequireAuthorization()`, sem
    `dailyId`/`weeklyId` na rota: recebe `{question, context}` prontos do request, nunca busca
    Daily/Weekly/CuratedContent por Id.
  - DI registrado em `Focadu.Application/DependencyInjection.cs` e
    `Focadu.Infrastructure/DependencyInjection.cs` (novo `AddHttpClient<IStudyAssistantService,
    GroqStudyAssistantService>`, mesma categoria de timeout de Draft/ProjectEvaluation/Analogy).
- **Frontend**:
  - `StudyAssistantWidget.tsx` - botão flutuante (`fixed bottom-6 right-6`) + painel de chat
    (`fixed bottom-24 right-6` quando aberto), transcript local (nunca enviado/persistido),
    `Enter` envia (`Shift+Enter` quebra linha), erro de API mostrado inline (mesmo padrão de
    `QuickNotePanel`).
  - `lib/studyAssistantContext.ts` - store externo módulo-level (`useSyncExternalStore`, mesmo
    padrão de `sessionExpiredHandler` em `api/client.ts`) pro "o que está na tela agora".
    `SessionLayout` (`SessionShell.tsx`) seta isso sozinho via `useEffect` (nova prop opcional
    `assistantContext`, cai no fallback `eyebrow + stepLabel` quando omitida);
    `WeeklyProjectPage.tsx` seta direto (não usa `SessionLayout`).
  - `QuickQuestionOrb` (`SessionShell.tsx`) reativado - existia como stub desativado
    (`return null`) desde a Fase 19/20, os 2 call sites (`SessionLayout`, `WeeklyProjectPage`) já
    existiam e não precisaram mudar pra ganhar o botão de verdade.
  - `ReadingActivity.tsx`/`VideoActivity.tsx` passam `assistantContext` mais rico (título + corpo/
    descrição do conteúdo) - as outras 5 atividades (Quiz/Ligar Palavras/Cloze/Roleplay/Resumo
    Falado) usam o fallback genérico (o enunciado já fica visível em tela).
  - `api/client.ts` ganhou `askStudyAssistant(question, context)`; `api/types.ts` ganhou
    `StudyAssistantAnswerDto`.
- **Testes**: `Focadu.Tests/Assistant/AskStudyAssistantUseCaseTests.cs` - só a parte pura
  (`Truncate`, `internal static`), mesmo padrão de `GetCuratedContentUseCaseTests` (projeto não
  tem fakes de repositório). 4 testes novos, suíte completa (337 testes) passando.

## Decisões técnicas tomadas que não estavam no prompt original

- **Sem histórico de conversa enviado ao backend, de propósito.** O pedido do usuário não
  especificou, mas `secret/rascunhos/visual-ui-ux.md` já registrava a intenção original do "Suporte
  Rápido de IA": "interações curtas e diretas, impedindo que o usuário se perca em diálogos
  longos". Decidi que cada pergunta é independente (o frontend mostra o transcript local pra
  referência visual, mas nunca reenvia turnos anteriores) - bate literalmente com essa frase, além
  de simplificar bastante o backend (sem payload crescente, sem limite de turnos pra decidir) e o
  custo/latência por chamada. Se o produto quiser memória de conversa dentro do mesmo chat depois,
  é mudança deliberada de escopo, não uma correção.
- **`Context` vem pronto do frontend, o backend nunca busca Daily/Weekly/CuratedContent por Id.**
  Havia duas opções: (a) a rota receber `dailyId`/`activityId` e o backend montar o contexto
  buscando os dados (replicando a lógica de posse/autorização que `GetDailyStateUseCase`/
  `GetCuratedContentUseCase` já fazem), ou (b) o frontend montar um texto livre a partir do que já
  tem carregado na tela (o mesmo dado que o aluno já está vendo) e mandar pronto. Escolhi (b):
  evita duplicar autorização, evita um round-trip extra ao abrir o chat, e o endpoint fica
  desacoplado de qualquer entidade específica (funciona igual pra uma Daily, um Projeto Semanal, ou
  qualquer tela futura que queira o mesmo botão).
- **Contexto propagado via store externo (`useSyncExternalStore`), não React Context nem props
  novas nos ~9 call sites que já renderizavam `<SessionLayout>`/`<QuickQuestionOrb/>`.** O próprio
  código já tinha essa decisão pré-tomada: o comentário do stub desativado dizia "é o único ponto
  de renderização, os 2 call sites (SessionLayout e WeeklyProjectPage) não precisam mudar" - segui
  isso à risca. `SessionLayout` ganhou 1 prop nova *opcional* (`assistantContext`) que só
  `ReadingActivity`/`VideoActivity` passam; as outras 5 atividades e o botão em si continuam
  funcionando sem nenhuma mudança de assinatura.
- **Limites escolhidos sem input explícito**: pergunta = 500 chars (curta, "dúvida pontual", não
  um campo de redação - mesmo espírito do "interações curtas"); contexto = 6000 chars (cobre um
  texto de leitura/especificação de projeto inteiros na maioria dos casos, sem estourar o prompt).
- **Timeout do cliente (frontend) = 45s**, mesma lógica já documentada de
  `WEEKLY_PROJECT_SUBMIT_TIMEOUT_MS` (1 chamada Groq sem retry no backend, client um pouco mais
  curto que o timeout de 60s do servidor - Groq normalmente responde bem antes disso).
- **System prompt** instrui respostas curtas (2-4 frases), em português, priorizando o contexto
  da sessão quando presente, e reconduzindo com gentileza pro foco quando a pergunta foge do
  curso - não é moderação de conteúdo real (app pessoal, 1 usuário), só reforço do produto
  ("voltar rápido pro foco").

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/
├── Ports/IStudyAssistantService.cs                    (novo)
└── Assistant/AskStudyAssistantUseCase.cs               (novo)
backend/src/Focadu.Infrastructure/Services/
└── GroqStudyAssistantService.cs                        (novo)
backend/src/Focadu.Api/Contracts/
└── AssistantRequests.cs                                (novo)
backend/tests/Focadu.Tests/Assistant/
└── AskStudyAssistantUseCaseTests.cs                    (novo)

frontend/src/
├── components/StudyAssistantWidget.tsx                 (novo)
├── lib/studyAssistantContext.ts                        (novo)
├── components/SessionShell.tsx                         (editado - QuickQuestionOrb reativado, assistantContext)
├── components/ReadingActivity.tsx                       (editado - assistantContext rico)
├── components/VideoActivity.tsx                         (editado - assistantContext rico)
├── routes/WeeklyProjectPage.tsx                         (editado - seta contexto do projeto)
├── api/client.ts                                        (editado - askStudyAssistant)
└── api/types.ts                                         (editado - StudyAssistantAnswerDto)
```

Mais os 2 arquivos de DI editados (`Focadu.Application/DependencyInjection.cs`,
`Focadu.Infrastructure/DependencyInjection.cs`) e `Focadu.Api/Program.cs` (endpoint novo).

## Testes

- `dotnet build` (Focadu.Api, cascata completa) - sem erros/avisos novos.
- `dotnet test tests/Focadu.Tests/Focadu.Tests.csproj` - **337 testes, 0 falhas** (4 novos, os
  outros 333 continuam passando - nenhuma regressão).
- `npx tsc -b` (frontend) - sem erros de tipo.
- `npm run lint` (oxlint) - só o aviso pré-existente em `TodayPage.tsx` (não relacionado a esta
  fase), nenhum aviso novo.
- `npx vite build` - build de produção ok.
- **Smoke test end-to-end com a chave real da Groq configurada** (Postgres/API/frontend já
  rodavam localmente, ver `.claude/skills/rodar-projeto/`): registrei um usuário descartável
  (`smoketest-fase32@example.com` - ver "pontos abertos" abaixo), fiz login, e chamei
  `POST /api/study-assistant/ask` de verdade com uma pergunta + contexto de leitura simulado. A
  IA respondeu correto, curto, em português, grounded no contexto dado, e reconduzindo pro foco
  ("Boa leitura e continue focado no conteúdo!") - bate com o objetivo do rascunho original.
  Também validei os 2 erros de validação (`pergunta_obrigatoria` com pergunta vazia,
  `pergunta_muito_longa` com 600 chars) - ambos 400 com o código esperado.
- **Não testado via browser real** (sem ferramenta de automação de navegador disponível nesta
  sessão) - a verificação visual do botão/painel (posicionamento, cores, responsividade) ficou por
  `tsc`/build bem-sucedidos + inspeção manual do JSX contra os padrões visuais já usados em
  `AiStatusBadge.tsx`/`SettingsMenu.tsx`/`QuickNotePanel.tsx`, não por screenshot.

## Dúvidas ou pontos abertos para a próxima fase

- **Usuário de teste descartável ficou no banco local**: `smoketest-fase32@example.com`, criado
  só pra validar o endpoint ponta a ponta com a Groq real (mesmo padrão do `qa-fase25@example.com`
  da Fase 25) - sem endpoint de remoção de usuário pra limpar via API.
- **Verificação visual real (browser) não foi feita** - vale conferir ao vivo se o botão/painel
  não colide com o `PenaltyGauge` (`fixed left-6 top-[72px]`, canto oposto - não deveria, mas não
  foi visto lado a lado) nem com o `GlobalNav` em telas estreitas, e se o toggle não atrapalha o
  fluxo do `useSessionExitGuard` (ESC abre o `SettingsMenu` por cima do chat, se ambos abertos ao
  mesmo tempo - não tratado nesta fase, caso de borda aceito).
- **Sem rate limit dedicado** no endpoint - qualquer usuário autenticado pode mandar quantas
  perguntas quiser (custo de Groq por chamada). Não é um problema hoje (app pessoal, 1 usuário),
  mas vale revisar se/quando o app tiver mais de um usuário de verdade.
- **Se algum dia quiser memória de conversa dentro do mesmo chat** (ex: "explica melhor" sem
  repetir contexto), isso muda o contrato do endpoint (`history` no request) e o design
  deliberado desta fase (ver "Decisões técnicas" acima) - não é um bug a corrigir, é uma decisão
  de produto a tomar antes.
- **Personalização por interesses no prompt do assistente não foi validada ao vivo** - o
  smoke test usou um usuário sem `Interests`/`AdditionalProfileNotes` preenchidos (registro
  simples, sem passar pela Entrevista de Perfil), então `PersonalizationPromptBuilder.
  BuildInstruction` nunca foi exercitado de fato nesta fase (só por leitura de código - já é
  reaproveitado sem mudança dos outros prompts que o usam).
