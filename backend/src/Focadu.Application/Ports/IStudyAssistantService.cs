namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) do Suporte Rapido de IA (Fase 32, ver
/// secret/rascunhos/visual-ui-ux.md "Suporte Rápido de IA" - botao flutuante acessivel durante uma
/// sessao pra duvidas pontuais). Port a parte de IContentEvaluationService/IAnalogyGenerationService
/// pelo mesmo motivo dos outros: prompt e tarefa de IA proprios (aqui e Q&A curto, nao avaliacao nem
/// analogia).
///
/// Historico curto (Fase 33): a Fase 32 tinha decidido de proposito nao enviar historico nenhum
/// ("interacoes curtas e diretas") - revertido apos teste real do Falves mostrar o custo disso: uma
/// pergunta de seguimento ("como o cache e organizado?", sem repetir "do SO") perdeu o fio porque o
/// backend nao tinha como saber a qual dos 2 caches (navegador/DNS) discutidos antes a pergunta se
/// referia. `History` e limitado (ver AskStudyAssistantUseCase.MaxHistoryMessages) - continua sendo
/// so as ultimas trocas, nao memoria ilimitada.
/// </summary>
public interface IStudyAssistantService
{
    /// <summary>Nunca lanca por resposta "ruim"/generica - so ExternalServiceException quando o provedor de fato falha (fora do ar, timeout, resposta vazia).</summary>
    Task<string> AskAsync(StudyAssistantRequest request, CancellationToken cancellationToken = default);
}

/// <summary>Um turno anterior da conversa - `FromUser=true` e a pergunta do aluno, `false` e a resposta da IA. Ordem cronologica (mais antigo primeiro).</summary>
public record StudyAssistantChatTurn(bool FromUser, string Content);

/// <summary>
/// Pedido ao assistente: a pergunta do aluno + o contexto opcional "o que esta na tela agora"
/// (montado no frontend a partir do que ja esta carregado - titulo/trecho da leitura, enunciado da
/// atividade, especificacao do projeto semanal - ver frontend/src/lib/studyAssistantContext.ts) +
/// as ultimas trocas da mesma conversa (Fase 33, ja clampadas por AskStudyAssistantUseCase).
/// UserInterests/UserNotes (Fase 21/22/27) sao opcionais, mesmo perfil que os outros prompts de IA
/// ja usam - aqui so pra render a resposta mais proxima do aluno quando ajudar, nunca obrigatorio.
/// </summary>
public record StudyAssistantRequest(
    string Question,
    string? SessionContext,
    IReadOnlyList<StudyAssistantChatTurn>? History = null,
    IReadOnlyCollection<string>? UserInterests = null,
    string? UserNotes = null);
