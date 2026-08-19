namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que gera um texto livre a partir de um prompt -
/// usado pelo rascunho de publicacao no LinkedIn (Fase 11). Distinto de IContentEvaluationService:
/// aquele avalia uma resposta contra um gabarito (Score + Feedback), este so gera texto (sem nota).
/// </summary>
public interface IDraftGenerationService
{
    Task<string> GenerateAsync(string prompt, CancellationToken cancellationToken = default);
}
