namespace Focadu.Api.Contracts;

/// <summary>
/// Qual campo e usado depende do ActivityType (e, pro Cloze, do AnswerMode) da atividade -
/// decidido dentro de SubmitActivityResponseUseCase.ResolveScore, que e quem enxerga esses dados:
/// - Quiz/Cloze(MultipleChoice): SelectedOptionId.
/// - WordMatch (Fase 23): WordMatchMatches - TODOS os pares da atividade de uma vez (chave =
///   WordMatchTermDto.Id, valor = WordMatchDefinitionDto.Id que o usuario ligou a ele), nao 1
///   selectedOptionId por termo (o schema antigo, ate a Fase 21).
/// - Cloze(FreeText): Transcript (a resposta em texto livre, comparada no backend contra
///   ExpectedAnswer) + opcionalmente Justification (guardada, nao avaliada nesta fase).
/// - Roleplay: SelectedRoleplayNodeId (o node terminal alcancado ao percorrer o dialogo).
/// Nao ha mais campo Score - desde a Fase 4, o backend calcula o Score de todo tipo de atividade,
/// nunca aceita pronto do cliente.
/// </summary>
public record SubmitActivityResponseRequest(
    Guid? SelectedOptionId,
    Guid? SelectedRoleplayNodeId,
    string? Transcript,
    string? Justification,
    string? AiFeedback,
    IReadOnlyDictionary<Guid, Guid>? WordMatchMatches = null);

/// <summary>
/// Fase 79: passo de codigo da ponte - o trecho que o passo pede e a saida que o aluno viu rodando
/// na maquina dele. A IA confere os dois (ver SubmitCodeStepResponseUseCase).
/// </summary>
public record SubmitCodeStepRequest(string? Code, string? Output, LabRunRequest? LabRun = null);

/// <summary>
/// Fase 86: o que o laboratorio de codigo produziu ao rodar o passo (saida da ultima execucao, exit code e,
/// no Linux, o historico de comandos com a saida de cada um). Obrigatorio nos passos que rodam no
/// laboratorio - ai <c>Output</c> do SubmitCodeStepRequest e ignorado.
/// </summary>
public record LabRunRequest(string? Output, int ExitCode, IReadOnlyList<LabCommandRequest>? Commands = null);

public record LabCommandRequest(string? Command, string? Output);

/// <summary>Fase 86: pedido de dica da Focada num passo com laboratorio - o codigo atual e o que aconteceu ao rodar (opcional).</summary>
public record RequestCodeHintRequest(string? Code, LabRunRequest? LabRun = null);

/// <summary>Fase 79: endereco do repositorio do script da ponte - vazio/nulo desliga.</summary>
public record LinkCodeRepositoryRequest(string? Url);
