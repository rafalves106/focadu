namespace Focadu.Api.Contracts;

/// <summary>Suporte Rapido de IA (Fase 32) - botao flutuante durante a sessao. Context e opcional/livre (o que ja esta na tela, montado no frontend - ver frontend/src/lib/studyAssistantContext.ts).</summary>
public record AskStudyAssistantRequest(string Question, string? Context);

/// <summary>Resposta do assistente - so o texto, sem Score/estrutura (nao e uma avaliacao).</summary>
public record AskStudyAssistantResponse(string Answer);
