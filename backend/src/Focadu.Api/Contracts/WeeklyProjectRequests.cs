namespace Focadu.Api.Contracts;

public record SubmitWeeklyProjectRequest(string? SubmissionUrl);

/// <summary>Fase 16: Score agora obrigatorio (0-100) - alimenta 30% de Weekly.CalculateScore(). Feedback continua opcional (so armazenado).</summary>
public record EvaluateWeeklyProjectRequest(int? Score, string? Feedback);
