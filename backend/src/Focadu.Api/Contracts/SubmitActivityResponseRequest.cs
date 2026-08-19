namespace Focadu.Api.Contracts;

/// <summary>
/// Qual campo e usado depende do ActivityType (e, pro Cloze, do AnswerMode) da atividade -
/// decidido dentro de SubmitActivityResponseUseCase.ResolveScore, que e quem enxerga esses dados:
/// - Quiz/WordMatch/Cloze(MultipleChoice): SelectedOptionId.
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
    string? AiFeedback);
