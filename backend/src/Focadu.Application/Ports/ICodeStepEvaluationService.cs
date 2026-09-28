namespace Focadu.Application.Ports;

/// <summary>
/// Port da IA que confere um passo de codigo da ponte (Fase 79, "code comigo"). Cobra o conceito
/// do passo (Rubric) olhando o codigo E a saida que o aluno colou, nao o estilo; quando nao passa,
/// aponta o conceito que falta sem entregar a linha pronta. Sintaxe e ajuda livre.
/// </summary>
public interface ICodeStepEvaluationService
{
    Task<CodeStepEvaluationResult> EvaluateAsync(CodeStepEvaluationRequest request, CancellationToken cancellationToken = default);
}

/// <param name="Language">Linguagem da ponte (Python/JavaScript).</param>
/// <param name="StepPrompt">O que o passo pede (o mesmo texto que o aluno ve).</param>
/// <param name="Rubric">O conceito que o passo cobra - so a IA ve.</param>
/// <param name="ExpectedOutput">O que a solucao de referencia imprime contra o arquivo do dia.</param>
/// <param name="ReferenceSolution">Solucao de referencia do passo - so pra IA calibrar, nunca pra citar.</param>
/// <param name="PriorCode">O script ate antes deste passo (passos anteriores ja aceitos).</param>
/// <param name="StepCode">O que o aluno escreveu neste passo.</param>
/// <param name="Output">A saida que o aluno colou do terminal.</param>
/// <param name="AttemptNumber">Esta tentativa (1-based).</param>
/// <param name="MaxAttempts">Na ultima sem passar, a solucao aparece pro aluno.</param>
public record CodeStepEvaluationRequest(
    string Language,
    string StepPrompt,
    string Rubric,
    string ExpectedOutput,
    string ReferenceSolution,
    string PriorCode,
    string StepCode,
    string Output,
    int AttemptNumber,
    int MaxAttempts);

/// <summary>Veredito do passo: passou ou "ajuste isto" - sem nota. Feedback e a fala da Focada.</summary>
public record CodeStepEvaluationResult(bool Passed, string Feedback);
