namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que gera uma analogia curta por SECAO de um texto de
/// leitura, conectando cada uma ao(s) interesse(s)/hobbies do aluno (Fase 21/22 - a personalizacao
/// que CURADORIA.md previa como "ancoras" no Texto Cru pra um motor futuro injetar). Port a parte
/// de IContentEvaluationService/IDraftGenerationService pelo mesmo motivo dos outros: prompt
/// proprio, tarefa de IA diferente.
/// </summary>
public interface IAnalogyGenerationService
{
    /// <summary>Retorna exatamente 1 analogia por item de request.Sections, na mesma ordem - nunca menos nem mais (formato invalido vira ExternalServiceException).</summary>
    Task<IReadOnlyList<string>> GenerateAsync(AnalogyRequest request, CancellationToken cancellationToken = default);
}

/// <summary>Pedido de analogias: uma secao do Reading por item de Sections (ver GetCuratedContentUseCase.SplitIntoSections) e os interesses do aluno que a Entrevista de Perfil capturou.</summary>
public record AnalogyRequest(IReadOnlyList<string> Sections, IReadOnlyCollection<string> Interests, string? AdditionalNotes);
