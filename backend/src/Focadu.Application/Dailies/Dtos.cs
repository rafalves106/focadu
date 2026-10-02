using Focadu.Domain.Enums;

namespace Focadu.Application.Dailies;

/// <summary>
/// Estado completo de uma Daily. AccessMode indica o que o cliente pode fazer com ela agora
/// (Start/Resume/Replay = tela de estudo imersiva; ReadOnly = so resumo/gabarito). O mesmo shape
/// e usado nos dois casos - quem decide como renderizar (editavel vs. so leitura) e o frontend,
/// olhando para AccessMode. PenaltyThreshold (Fase 15) e sempre EvaluationPolicy.
/// DailyPenaltyThreshold - exposto pro frontend nunca hardcodar o valor (PenaltyGauge).
///
/// PendingReinforcementDailyId (Fase 56): id da Daily de reforco ainda nao concluida da matricula,
/// preenchido so por GET /api/today (GetTodayUseCase) - null em qualquer outro lugar e quando nao
/// ha reforco pendente. Existe pra o cliente manter um botao "Ir para a sessao de reforco"
/// visivel ate ela ser concluida (ver DailySequencing.FindPendingReinforcement).
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
    IReadOnlyCollection<DailyActivityDto> Activities,
    Guid? PendingReinforcementDailyId = null,
    string? CodeRepositoryUrl = null,
    LabConfigDto? Lab = null);

/// <summary>
/// Fase 86: laboratorio de codigo do dia (nulo = dia sem laboratorio). FileContentIds sao os File do
/// "Material de hoje" que ja vem no ambiente; quem roda o codigo e o navegador do aluno (ver LabConfig).
/// </summary>
public record LabConfigDto(
    string Runtime,
    string? Image,
    IReadOnlyCollection<Guid> FileContentIds,
    IReadOnlyCollection<string> Packages,
    IReadOnlyCollection<string> Services,
    string Entry,
    string Command,
    int TimeoutSeconds,
    IReadOnlyCollection<string> Setup,
    string? User);

/// <summary>Fase 86: uma dica da Focada num passo de codigo com laboratorio (tres blocos curtos).</summary>
public record CodeStepHintDto(int Number, string Right, string Wrong, string Improve, DateTime CreatedAt);

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
    IReadOnlyCollection<WordMatchTermDto> WordMatchTerms,
    IReadOnlyCollection<WordMatchDefinitionDto> WordMatchDefinitions,
    IReadOnlyCollection<RoleplayNodeDto> RoleplayNodes,
    IReadOnlyCollection<ActivityResponseDto> Responses,
    CodeStepDto? CodeStep = null,
    IReadOnlyCollection<TerminalMissionDto>? Missions = null,
    /// <summary>TerminalMission (terminal v3): a cola "Comandos de hoje" do bloco.</summary>
    IReadOnlyCollection<TerminalCommandDto>? Commands = null,
    /// <summary>VoiceSummary (molde v1): pista mostrada na tela no lugar do texto do bloco.</summary>
    string? Hint = null,
    /// <summary>VoiceSummary (molde v1): e a pergunta final (explique o dia com suas palavras).</summary>
    bool IsFinalQuestion = false,
    /// <summary>Pergunta final: os 3 topicos-pista.</summary>
    IReadOnlyCollection<string>? Topics = null,
    /// <summary>Molde v1: alvo de aprendizagem (t1, t2, t3) que a atividade cobra.</summary>
    string? Target = null);

/// <summary>Missao no terminal (ActivityType.TerminalMission): o navegador do aluno confere pelo <see cref="TerminalMissionCheckDto"/>; nada aqui e segredo.</summary>
public record TerminalMissionDto(
    string Title, string Prompt, IReadOnlyCollection<string> Hints, string Note, TerminalMissionCheckDto Check,
    string? Situation = null, string? Goal = null, IReadOnlyCollection<string>? Steps = null);

public record TerminalCommandDto(string Command, string Description);

public record TerminalMissionCheckDto(string? Command, string? Output, string? Probe, string? State);

/// <summary>
/// Passo de codigo da ponte (Fase 79), so em DailyActivityDto de tipo CodeStep. PriorCode e o
/// script ate antes deste passo (o que os passos anteriores entregaram) - nulo enquanto o passo
/// anterior nao acabou. Solution/ExpectedOutput so aparecem depois que o passo acaba (passou ou
/// gastou MaxAttempts), mesma regra de "gabarito so depois" dos outros tipos.
/// </summary>
/// <remarks>
/// Fase 86: LabEnabled diz se este passo roda no laboratorio do dia (o dia tem lab e o passo nao saiu
/// dele); CodeStarter e o codigo inicial do editor (nulo = vazio, ou o acumulado nas pontes); Hints sao
/// as dicas da Focada ja dadas no passo (limite MaxHints, nao contam como tentativa).
/// </remarks>
public record CodeStepDto(
    string? PriorCode, bool Done, int MaxAttempts, string? Solution, string? ExpectedOutput,
    bool LabEnabled = false, string? CodeStarter = null, int MaxHints = 0, IReadOnlyCollection<CodeStepHintDto>? Hints = null);

/// <summary>
/// IsCorrect vem nulo enquanto a atividade não tem nenhuma ActivityResponse registrada - o
/// gabarito só é revelado depois da primeira tentativa (ver DailyStateMapper).
/// </summary>
public record QuizOptionDto(Guid Id, string Text, bool? IsCorrect);

/// <summary>
/// Termo (coluna esquerda) de uma DailyActivity WordMatch (Fase 23). CorrectDefinitionId vem nulo
/// até a atividade ter uma ActivityResponse - mesma regra/motivo de QuizOptionDto.IsCorrect (ver
/// DailyStateMapper): é o gabarito, não pode vir antes de responder. Quando revelado, é sempre um
/// dos Id em WordMatchDefinitions desta mesma DailyActivityDto.
/// </summary>
public record WordMatchTermDto(Guid Id, string Text, Guid? CorrectDefinitionId);

/// <summary>
/// Definição (coluna direita) de uma DailyActivity WordMatch (Fase 23) - ordem embaralhada a cada
/// carga (ver DailyStateMapper), pra posição não denunciar a correspondência com o termo. Id é
/// intencionalmente um Guid diferente do WordMatchTermDto correspondente (ver WordMatchPair) -
/// nunca reaproveitar o Id do termo aqui.
/// </summary>
public record WordMatchDefinitionDto(Guid Id, string Text);

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
    string? CorrectedTranscript,
    string? Justification,
    string? AiFeedback,
    DateTime CreatedAt,
    /// <summary>Conversa por voz: a resposta correta (do referenceAnswer curado), 1a parte da devolutiva.</summary>
    string? CorrectAnswer = null,
    /// <summary>Conversa por voz: pontos a melhorar no conteudo, 2a parte da devolutiva.</summary>
    string? ImprovementPoints = null);

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
