namespace Focadu.Api.Contracts;

/// <summary>
/// SelectedOptionId e Score sao mutuamente exclusivos, dependendo do tipo da atividade (decidido
/// dentro de SubmitActivityResponseUseCase, que e quem enxerga o ActivityType):
/// - Quiz/WordMatch: cliente manda SelectedOptionId; o Score e sempre calculado no servidor a
///   partir de QuizOption.IsCorrect (nunca aceito pronto do cliente, pra nao dar pra forjar nota).
/// - Cloze/Roleplay: cliente ainda manda Score pronto, ate IContentEvaluationService existir.
/// Ambos os campos sao nullable de proposito, pra distinguir "nao veio" de "veio 0"/Guid vazio.
/// </summary>
public record SubmitActivityResponseRequest(Guid? SelectedOptionId, int? Score, string? Transcript, string? AiFeedback);
