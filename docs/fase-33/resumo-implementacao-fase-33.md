# Resumo — Fase 33: Histórico Curto no Suporte Rápido de IA

## O que foi implementado

Revisão do Suporte Rápido de IA (Fase 32) motivada por teste real do Falves na mesma sessão em que
a Fase 32 foi fechada: uma pergunta de seguimento sem repetir o assunto ("como o cache é
organizado?", depois de 3 mensagens já falando especificamente do cache do SO) perdeu o fio -
a IA respondeu sobre cache de navegador também, porque o backend não tinha memória nenhuma da
conversa (decisão deliberada da Fase 32, para bater com "interações curtas e diretas"). Também
veio à tona que digitar `/clear` no chat virava uma pergunta literal pra IA, sem limpar nada.

- **Backend**:
  - `IStudyAssistantService`/`StudyAssistantRequest` ganharam `History` (`IReadOnlyList<
    StudyAssistantChatTurn>?`, `StudyAssistantChatTurn(bool FromUser, string Content)`).
  - `AskStudyAssistantUseCase` ganhou o parâmetro `history` + `ClampHistory` (`internal static`,
    testado puro) - mantém só as últimas `MaxHistoryMessages` = 8 mensagens (~4 trocas
    pergunta+resposta), descarta entradas vazias, trunca cada `Content` em
    `MaxHistoryMessageLength` = 800 chars.
  - `GroqStudyAssistantService.BuildMessages` substitui o antigo "1 system + 1 user com tudo
    junto": agora monta `system` (persona) + `system` (contexto da sessão + personalização, quando
    houver - valem a conversa inteira) + 1 mensagem `user`/`assistant` por turno de `History` + a
    pergunta atual como último turno `user`. System prompt ganhou uma frase orientando o modelo a
    manter o foco no assunto que a conversa já estreitou, em vez de voltar ao contexto genérico.
  - `AskStudyAssistantRequest` (contrato da Api) ganhou `History` (`IReadOnlyList<
    AskStudyAssistantHistoryItemRequest>?`); `Program.cs` mapeia pro tipo do port.
- **Frontend**:
  - `StudyAssistantWidget.tsx`: `handleSend` monta `history` a partir de `messages` (o transcript
    de ANTES da pergunta atual) e manda em toda chamada (`api.askStudyAssistant(question, context,
    history)`), capado em `STUDY_ASSISTANT_MAX_HISTORY` = 8 no próprio cliente (mesmo número do
    backend - quem garante o limite de verdade é o `ClampHistory` do servidor).
  - Botão "Limpar" no cabeçalho do painel (só aparece quando há mensagens) - apaga `messages`.
  - `/clear` digitado no campo é reconhecido localmente em `handleSend` (case-insensitive) e nunca
    vira uma chamada à API - só limpa o transcript.
  - Fechar o painel (✕ **ou clique fora**, novo nesta fase) só alterna `open` - nunca mais toca em
    `messages`. Clique fora implementado com um listener de `mousedown` em `document` enquanto
    `open`, checando se o alvo do clique está fora de um `containerRef` que envolve botão + painel
    (não é modal - sem backdrop bloqueando o resto da tela).
  - `api/client.ts`: `askStudyAssistant` ganhou o 3º argumento `history`; novo tipo
    `StudyAssistantHistoryItem` (`{fromUser, content}`).
- **Testes**: `AskStudyAssistantUseCaseTests` ganhou 5 testes novos pra `ClampHistory` (null,
  poucas mensagens preserva ordem, mais que o teto descarta as mais antigas mantendo ordem
  cronológica das que sobram, entrada em branco é descartada, conteúdo longo é truncado). Suíte
  completa: 342 testes, 0 falhas.

## Decisões técnicas tomadas que não estavam no prompt original

- **Reversão parcial, não total, da decisão "sem histórico" da Fase 32.** O pedido do Falves foi
  só "adicionar histórico curto" (confirmado via pergunta direta - ver "Duvidas" do resumo da Fase
  32, que já tinha essa ressalva registrada). Mantive o teto curto (8 mensagens/~4 trocas) de
  propósito, em vez de enviar o transcript inteiro sem limite - o espírito "interações curtas e
  diretas" do rascunho original continua valendo, só a interpretação "curto" mudou de "zero
  memória" pra "memória de curto prazo".
- **Contexto/personalização viraram mensagem `system` própria, não mais coladas em cada mensagem
  `user`.** Antes (Fase 32, single-turn) o contexto ia dentro da única mensagem do usuário -
  funcionava porque só havia 1 turno. Com histórico multi-turno, repetir o contexto em toda
  mensagem `user` seria redundante e confundiria a leitura da conversa pelo modelo; movi pra 1
  mensagem `system` logo após a persona, que vale a conversa inteira.
- **`/clear` tratado como atalho local, não uma feature nova de "comandos".** O Falves só reportou
  o comportamento observado (a IA "respondeu" ao `/clear` em vez de limpar) sem pedir
  explicitamente esse tratamento - inferi que reconhecer esse texto específico (hábito natural de
  quem usa Claude Code) e transformar em ação local, em vez de gastar uma chamada à Groq com uma
  "pergunta" sem sentido, era o comportamento esperado. Não criei um sistema de comandos genérico
  (`/ajuda`, etc.) - só esse caso específico, que é o único observado até agora.
- **Clique fora fecha via listener de `mousedown` em `document` + `ref` de contenção, não um
  backdrop `fixed inset-0` (padrão do `SettingsMenu`).** O assistente não é um modal - a intenção
  (confirmada pelo pedido do Falves: "fecha ele, mas não apaga as mensagens, somente oculta") é só
  esconder o painel, mantendo o resto da tela de estudo totalmente interativa por baixo, então um
  backdrop bloqueando cliques no resto da página teria sido um passo além do pedido.

## Estrutura de arquivos criada

Nenhum arquivo novo - só edição dos arquivos criados na Fase 32:

```
backend/src/Focadu.Application/Ports/IStudyAssistantService.cs        (editado)
backend/src/Focadu.Application/Assistant/AskStudyAssistantUseCase.cs  (editado)
backend/src/Focadu.Infrastructure/Services/GroqStudyAssistantService.cs (editado)
backend/src/Focadu.Api/Contracts/AssistantRequests.cs                 (editado)
backend/src/Focadu.Api/Program.cs                                     (editado)
backend/tests/Focadu.Tests/Assistant/AskStudyAssistantUseCaseTests.cs (editado)

frontend/src/components/StudyAssistantWidget.tsx                      (editado)
frontend/src/api/client.ts                                            (editado)
```

## Testes

- `dotnet build` (Focadu.Api, cascata completa) - sem erros/avisos novos.
- `dotnet test tests/Focadu.Tests/Focadu.Tests.csproj` - **342 testes, 0 falhas** (5 novos desta
  fase, nenhuma regressão nos 337 da Fase 32).
- `npx tsc -b` (frontend) - sem erros de tipo.
- `npm run lint` (oxlint) - só o aviso pré-existente em `TodayPage.tsx` (não relacionado), nenhum
  aviso novo.
- **Smoke test end-to-end reproduzindo o cenário real do Falves** (API reiniciada com o código
  novo, mesmo ambiente local da Fase 32): repeti as 3 perguntas em sequência ("cache do SO é o
  cache do sistema operacional?" → "onde ele fica, exemplo Windows/Mac" → "como é organizado,
  linhas de texto ou binário?") passando o histórico acumulado a cada chamada. A 3ª resposta agora
  fica inteiramente sobre o cache do SO (estrutura em memória, chave domínio→IP, TTL/metadados) -
  não menciona mais cache de navegador, confirmando que o problema original foi corrigido.
- **Não testado via browser real** (sem ferramenta de automação de navegador nesta sessão) - o
  clique-fora-fecha e o botão "Limpar" foram verificados só por leitura do código/tipos, não visto
  rodando de verdade num navegador.

## Dúvidas ou pontos abertos para a próxima fase

- **Verificação visual real (clique fora, botão "Limpar", `/clear`) ainda não foi feita** - mesma
  pendência já registrada no resumo da Fase 32 pro resto do widget, agora estendida a este
  comportamento novo.
- **`MaxHistoryMessages` = 8 (~4 trocas) foi um palpite, não uma medição** - se na prática 4 trocas
  ainda cortarem uma conversa legítima cedo demais (ou se o custo por chamada à Groq crescer
  demais com o histórico), é só ajustar a constante em `AskStudyAssistantUseCase` (e o espelho no
  frontend, `STUDY_ASSISTANT_MAX_HISTORY` em `api/client.ts`) - sem mudança de contrato.
- **`/clear` só existe no campo de texto do widget, não em nenhum outro lugar do app** - se o
  Falves achar útil um padrão de "comandos" mais amplo no chat (ex: `/ajuda`), isso é decisão de
  produto nova, não uma extensão natural do que foi feito aqui.
