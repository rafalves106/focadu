namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que escreve o post de LinkedIn da publicacao do modulo (Fase 11).
/// Distinto de IContentEvaluationService: aquele avalia uma resposta contra um gabarito, este so gera texto.
/// Fase 107: alem do post, devolve os textos curtos da imagem de conclusao da semana (destaques e nome do projeto),
/// numa resposta so (JSON mode). Resposta malformada vira ExternalServiceException, nunca texto inventado.
/// </summary>
public interface IDraftGenerationService
{
    Task<GeneratedLinkedInDraft> GenerateAsync(string prompt, CancellationToken cancellationToken = default);
}

/// <param name="Post">Texto do post.</param>
/// <param name="Highlights">O que o aluno aprendeu, em frases curtas, pra imagem (pode vir com mais ou menos de 3; a Application normaliza).</param>
/// <param name="ProjectTitle">Nome curto do projeto entregue, ou nulo se a semana nao tem projeto.</param>
public record GeneratedLinkedInDraft(string Post, IReadOnlyList<string> Highlights, string? ProjectTitle);
