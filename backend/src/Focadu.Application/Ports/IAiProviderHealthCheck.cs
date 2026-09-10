namespace Focadu.Application.Ports;

/// <summary>
/// Port para o status de um provedor de IA externo (Groq, e futuramente qualquer outro que a
/// plataforma venha a usar) - alimenta o badge de status exibido no GlobalNav do frontend, cujo
/// proposito e sinalizar ao Falves quando uma chave precisa ser trocada ou uma atividade que
/// depende de IA precisa ser desativada temporariamente (ver docs/ARQUITETURA.md). Cada
/// implementacao decide sozinha COMO checar (ex: GroqHealthCheckService faz 1 chamada leve a Groq,
/// com cache curto) - o use case (GetAiProviderStatusUseCase) so agrega o resultado de todas as
/// registradas via IEnumerable&lt;IAiProviderHealthCheck&gt;.
/// </summary>
public interface IAiProviderHealthCheck
{
    /// <summary>Nome exibido no frontend (ex: "Groq").</summary>
    string ProviderName { get; }

    Task<AiProviderStatus> CheckAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Resultado de 1 check. Configured=false (chave ausente) e sempre Available=false, sem sequer
/// tentar a chamada de rede - mesma distincao que os outros adapters Groq ja fazem (ver
/// GroqAnalogyGenerationService, "groq_api_key_nao_configurada") entre "nao configurado" (erro de
/// setup) e "configurado mas fora do ar" (erro transitorio do provedor).
/// </summary>
public record AiProviderStatus(bool Configured, bool Available, string? ErrorMessage);
