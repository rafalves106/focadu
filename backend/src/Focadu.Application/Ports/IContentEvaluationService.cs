namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que avalia uma resposta livre (texto ou transcricao
/// de voz) contra o gabarito esperado de uma atividade. Sem implementacao concreta neste passo:
/// a implementacao real (chamada ao provedor de IA) e assunto de um prompt tecnico separado.
/// </summary>
public interface IContentEvaluationService
{
    Task<ContentEvaluationResult> EvaluateAsync(ContentEvaluationRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Pedido de avaliacao de uma resposta de atividade. `UserInterests`/`UserNotes` (Fase 27) sao
/// opcionais - so `SubmitVoiceSummaryResponseUseCase` preenche hoje (perfil do usuario, mesmo dado
/// que a Fase 21/22 ja usava so pra analogia de Leitura), `GroqContentEvaluationService` injeta no
/// prompt quando presentes. `EvaluateWeeklyProjectUseCase` (avaliacao de projeto, mesmo shape de
/// request) deixa de proposito em branco - feedback sobre codigo nao ganha com analogia de hobby.
/// </summary>
public record ContentEvaluationRequest(
    string ExpectedAnswer,
    string UserAnswer,
    string? ContextText,
    IReadOnlyCollection<string>? UserInterests = null,
    string? UserNotes = null,
    /// <summary>Fase 85: curso da atividade, citado no prompt (nulo = so "Focadu").</summary>
    string? CourseName = null,
    /// <summary>
    /// Conversa por voz (molde v1): <c>ExpectedAnswer</c> e a resposta correta curada e <c>ContextText</c> a pergunta. A IA
    /// devolve a nota e so os pontos a melhorar no conteudo (ignora vicios de linguagem); a resposta correta nao e
    /// gerada, vem da curadoria.
    /// </summary>
    bool Debrief = false,
    /// <summary>Texto de apoio so para corrigir termos mal reconhecidos na transcricao (ex.: o texto do bloco). Nulo = usa o ExpectedAnswer.</summary>
    string? VocabularyText = null);

/// <summary>
/// Resultado da avaliacao: Score de 0 a 100 e um feedback textual gerado pela IA. CorrectedTranscript
/// (Fase 39) e a versao de UserAnswer com termos claramente mal reconhecidos pela transcricao de voz
/// corrigidos pela propria IA usando ExpectedAnswer/ContextText como contexto, antes de avaliar - nulo
/// quando o adapter nao suporta essa correcao ou nao houve nada a corrigir (nesse caso, igual a
/// UserAnswer). Ver GroqContentEvaluationService para o raciocinio do prompt.
/// </summary>
public record ContentEvaluationResult(int Score, string Feedback, string? CorrectedTranscript = null, string? ImprovementPoints = null);
