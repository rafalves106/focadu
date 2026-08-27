namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que avalia o conteudo de um repositorio de projeto
/// contra a especificacao pedida (Weekly Project). Reaproveita o formato de
/// ContentEvaluationRequest/Result (ExpectedAnswer=especificacao, UserAnswer=snapshot do repo) mas
/// e um port a parte de IContentEvaluationService porque o prompt e completamente diferente (la e
/// "resumo falado vs referencia de estudo", aqui e "codigo entregue vs especificacao de projeto") -
/// mesmo motivo de IDraftGenerationService ja existir separado de IContentEvaluationService.
/// </summary>
public interface IProjectEvaluationService
{
    Task<ContentEvaluationResult> EvaluateAsync(ContentEvaluationRequest request, CancellationToken cancellationToken = default);
}
