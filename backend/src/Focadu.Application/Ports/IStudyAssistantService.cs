namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) do Suporte Rapido de IA (Fase 32, ver
/// secret/rascunhos/visual-ui-ux.md "Suporte Rápido de IA" - botao flutuante acessivel durante uma
/// sessao pra duvidas pontuais). Port a parte de IContentEvaluationService/IAnalogyGenerationService
/// pelo mesmo motivo dos outros: prompt e tarefa de IA proprios (aqui e Q&A curto, nao avaliacao nem
/// analogia). Sem historico de conversa de proposito - cada pergunta e independente (ver
/// AskStudyAssistantUseCase), o design pede "interacoes curtas e diretas", nao um chat com memoria.
/// </summary>
public interface IStudyAssistantService
{
    /// <summary>Nunca lanca por resposta "ruim"/generica - so ExternalServiceException quando o provedor de fato falha (fora do ar, timeout, resposta vazia).</summary>
    Task<string> AskAsync(StudyAssistantRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Pedido ao assistente: a pergunta do aluno + o contexto opcional "o que esta na tela agora"
/// (montado no frontend a partir do que ja esta carregado - titulo/trecho da leitura, enunciado da
/// atividade, especificacao do projeto semanal - ver frontend/src/lib/studyAssistantContext.ts).
/// UserInterests/UserNotes (Fase 21/22/27) sao opcionais, mesmo perfil que os outros prompts de IA
/// ja usam - aqui so pra render a resposta mais proxima do aluno quando ajudar, nunca obrigatorio.
/// </summary>
public record StudyAssistantRequest(
    string Question,
    string? SessionContext,
    IReadOnlyCollection<string>? UserInterests = null,
    string? UserNotes = null);
