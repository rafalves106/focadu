namespace Focadu.Application.Ports;

/// <summary>
/// Port da dica da Focada num passo de codigo com laboratorio (Fase 86, rascunho
/// laboratorio-de-codigo-na-ponte.md, decisao 4). Olha o codigo, o que aconteceu ao rodar (saida, erro,
/// historico de comandos) e a rubrica do passo, e responde em tres blocos curtos: o que esta certo, onde
/// errou e o que melhorar. Pode apontar erro de sintaxe (ajuda livre desde a Fase 79); nunca entrega a
/// logica de seguranca do passo nem a solucao de referencia. Nao avalia nem decide nada.
/// </summary>
public interface ICodeStepHintService
{
    Task<CodeStepHintResult> HintAsync(CodeStepHintRequest request, CancellationToken cancellationToken = default);
}

public record CodeStepHintRequest(
    string Language,
    string StepPrompt,
    string Rubric,
    string ExpectedOutput,
    string ReferenceSolution,
    string PriorCode,
    string StepCode,
    string Output,
    CodeStepLabRun? Lab,
    int HintNumber,
    int MaxHints,
    string? CourseName = null);

/// <summary>Tres blocos da dica - o que esta certo, onde errou, o que melhorar.</summary>
public record CodeStepHintResult(string Right, string Wrong, string Improve);
