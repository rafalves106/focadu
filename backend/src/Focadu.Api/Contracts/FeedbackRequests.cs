namespace Focadu.Api.Contracts;

/// <summary>Feedback do dia (plano de curadoria, 02/10/2026): clareza de 1 a 5, atividade em que travou (opcional) e comentario (opcional).</summary>
public record SubmitDayFeedbackRequest(int Clarity, Guid? StuckActivityId, string? Comment);
