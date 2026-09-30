namespace Focadu.Api.Contracts;

/// <summary>
/// Suporte Rapido de IA (Fase 32) - botao flutuante durante a sessao. Context e opcional/livre (o
/// que ja esta na tela, montado no frontend - ver frontend/src/lib/studyAssistantContext.ts).
/// History (Fase 33) e o transcript local do painel de chat (ver StudyAssistantWidget.tsx) - ja vem
/// clampado no cliente, mas quem clampa de verdade (limite de seguranca) e AskStudyAssistantUseCase.
/// </summary>
/// <param name="CodeBridge">Fase 79: pergunta feita na ponte "code comigo" - sem analogia, e sintaxe sem entregar o passo.</param>
/// <param name="CourseId">Fase 85: curso da sessao/projeto em tela - o prompt cita o curso certo.</param>
public record AskStudyAssistantRequest(string Question, string? Context, IReadOnlyList<AskStudyAssistantHistoryItemRequest>? History, bool? CodeBridge = null, Guid? CourseId = null);

/// <summary>Um turno anterior da conversa - `FromUser=true` e a pergunta do aluno, `false` e a resposta da IA.</summary>
public record AskStudyAssistantHistoryItemRequest(bool FromUser, string Content);

/// <summary>Resposta do assistente - so o texto, sem Score/estrutura (nao e uma avaliacao).</summary>
public record AskStudyAssistantResponse(string Answer);
