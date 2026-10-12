namespace Focadu.Domain.AiUsage;

/// <summary>
/// Tipo de chamada a IA medida (Fase 94, Medicao de IA). Um por adapter do Groq: o tipo vem de qual cliente HTTP fez
/// a chamada, nao do caso de uso. Guardado como string no banco.
/// </summary>
public enum AiCallType
{
    /// <summary>Whisper: audio do Resumo Falado e da conversa por voz virando texto.</summary>
    Transcription,

    /// <summary>Correcao da transcricao + nota/devolutiva da resposta falada ou escrita (GroqContentEvaluationService).</summary>
    ContentEvaluation,

    /// <summary>Analogia "Pra voce" (desligada por flag desde a Fase 92).</summary>
    Analogy,

    /// <summary>Chat rapido da sessao.</summary>
    StudyAssistant,

    /// <summary>Revisao do Caderninho.</summary>
    NotesReview,

    /// <summary>Passo de codigo da ponte "code comigo".</summary>
    CodeStepEvaluation,

    /// <summary>Dica da Focada no laboratorio de codigo.</summary>
    CodeStepHint,

    /// <summary>Avaliacao do Projeto Semanal.</summary>
    ProjectEvaluation,

    /// <summary>Rascunho do post do LinkedIn.</summary>
    LinkedInDraft,
}
