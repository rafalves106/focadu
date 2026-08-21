using Focadu.Domain.Enums;

namespace Focadu.Application.Dailies;

/// <summary>
/// Estado completo de uma Daily. AccessMode indica o que o cliente pode fazer com ela agora
/// (Start/Resume/Replay = tela de estudo imersiva; ReadOnly = so resumo/gabarito). O mesmo shape
/// e usado nos dois casos - quem decide como renderizar (editavel vs. so leitura) e o frontend,
/// olhando para AccessMode. PenaltyThreshold (Fase 15) e sempre EvaluationPolicy.
/// DailyPenaltyThreshold - exposto pro frontend nunca hardcodar o valor (PenaltyGauge).
/// </summary>
public record DailyStateDto(
    Guid Id,
    Guid WeeklyId,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int PenaltyPoints,
    int PenaltyThreshold,
    DailyAccessMode AccessMode,
    IReadOnlyCollection<DailyActivityDto> Activities);

public record DailyActivityDto(
    Guid Id,
    ActivityType Type,
    int OrderIndex,
    Guid? ContentId,
    ActivityStatus Status,
    AnswerMode AnswerMode,
    string? Prompt,
    string? ExpectedAnswer,
    IReadOnlyCollection<QuizOptionDto> QuizOptions,
    IReadOnlyCollection<RoleplayNodeDto> RoleplayNodes,
    IReadOnlyCollection<ActivityResponseDto> Responses);

/// <summary>
/// IsCorrect vem nulo enquanto a atividade não tem nenhuma ActivityResponse registrada - o
/// gabarito só é revelado depois da primeira tentativa (ver DailyStateMapper).
/// </summary>
public record QuizOptionDto(Guid Id, string Text, bool? IsCorrect);

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
    string? Justification,
    string? AiFeedback,
    DateTime CreatedAt);

public record SubmitActivityResponseResult(
    ActivityResponseDto Response,
    bool DailyReinforcementTriggered,
    Guid? ReinforcementDailyId,
    bool WeeklyReinforcementTriggered);

/// <summary>
/// Resultado de POST .../complete. O reforco (diario/semanal), quando existe, ja foi disparado
/// antes - durante alguma SubmitActivityResponse anterior, nao neste momento - mas so aqui o
/// cliente tem certeza de ter visto todas as atividades da Daily, entao e o ponto natural pra
/// reportar "voce precisa saber disso" antes de sair da tela.
///
/// GemsEarned/StreakAfterCompletion (Fase 14): GemsEarned e quanto ESTA conclusao especifica
/// gerou (0 em replay, ou se o cap mensal da categoria ja foi atingido - nunca negativo, nunca
/// "credito pendente"). StreakAfterCompletion e sempre o streak "ao vivo" (CurrentStreakAsOf),
/// mesmo quando esta conclusao nao mexeu nele (ex: replay) - o frontend sempre tem um numero
/// correto pra mostrar, sem precisar de uma 2a chamada a GET /api/users/me/gamification.
///
/// WasReinforcementBonus (Fase 15): true quando esta conclusao era elegivel ao Bonus de Superacao
/// (Daily de reforco, 1a conclusao, todas as atividades aprovadas) - independente de quantas Gems
/// o cap mensal efetivamente permitiu creditar (GemsEarned pode ser menor que
/// EvaluationPolicy.ReinforcementBonusGems perto do cap, ou ate 0). O frontend so usa isto pra
/// decidir qual COPY mostrar ("Bonus de Superacao" vs. texto padrao) quando GemsEarned > 0.
/// </summary>
public record CompleteDailyResult(
    DailyStateDto Daily,
    bool DailyReinforcementTriggered,
    Guid? ReinforcementDailyId,
    bool WeeklyReinforcementTriggered,
    Guid? WeeklyReinforcementId,
    int GemsEarned,
    int StreakAfterCompletion,
    bool WasReinforcementBonus);
