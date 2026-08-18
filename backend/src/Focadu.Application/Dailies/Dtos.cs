using Focadu.Domain.Enums;

namespace Focadu.Application.Dailies;

/// <summary>
/// Estado completo de uma Daily. AccessMode indica o que o cliente pode fazer com ela agora
/// (Start/Resume/Replay = tela de estudo imersiva; ReadOnly = so resumo/gabarito). O mesmo shape
/// e usado nos dois casos - quem decide como renderizar (editavel vs. so leitura) e o frontend,
/// olhando para AccessMode.
/// </summary>
public record DailyStateDto(
    Guid Id,
    Guid WeeklyId,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int PenaltyPoints,
    DailyAccessMode AccessMode,
    IReadOnlyCollection<DailyActivityDto> Activities);

public record DailyActivityDto(
    Guid Id,
    ActivityType Type,
    int OrderIndex,
    Guid? ContentId,
    ActivityStatus Status,
    AnswerMode AnswerMode,
    string? ExpectedAnswer,
    IReadOnlyCollection<QuizOptionDto> QuizOptions,
    IReadOnlyCollection<RoleplayNodeDto> RoleplayNodes,
    IReadOnlyCollection<ActivityResponseDto> Responses);

public record QuizOptionDto(Guid Id, string Text, bool IsCorrect);

public record RoleplayNodeDto(
    Guid Id,
    string NodeKey,
    string Text,
    bool IsTerminal,
    TerminalQuality? TerminalQuality,
    IReadOnlyCollection<RoleplayOptionDto> Options);

public record RoleplayOptionDto(Guid Id, string Text, Guid? NextNodeId);

public record ActivityResponseDto(
    Guid Id,
    Guid ActivityId,
    int AttemptNumber,
    int Score,
    bool Passed,
    string? Transcript,
    string? AiFeedback,
    DateTime CreatedAt);

public record SubmitActivityResponseResult(
    ActivityResponseDto Response,
    bool DailyReinforcementTriggered,
    Guid? ReinforcementDailyId,
    bool WeeklyReinforcementTriggered);
