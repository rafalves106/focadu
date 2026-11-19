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
    LabConfigDto? Lab = null,
    SessionInfoDto? Session = null,
    /// <summary>Fase 113: "intercalada" na ponte intercalada (o front usa o molde Foco dividido); nulo nos outros dias.</summary>
    string? BridgeFormat = null,
    /// <summary>
    /// Fase 113: a saida do script pronto (a saida esperada do ultimo passo de codigo), que o terminal da Abertura mostra
    /// como previa. O molde da ponte intercalada manda mostrar a saida final antes do 1o passo. Nulo fora dela.
    /// </summary>
    string? BridgePreview = null);

/// <summary>
/// Fase 111: curso em sessoes (StudyFormat.Sessions). Sessoes nao-reforco concluidas hoje, o limite do curso e a sala da
/// sessao anterior que ainda falta (a tela mostra o aviso com o link). Nulo em curso Daily.
/// </summary>
public record SessionInfoDto(int CompletedToday, int PerDay, SessionRoomDto? PendingRoom);

/// <summary>Fase 112: tempo e máquina pro destaque do Início ("Sala da Sessão 1 · 40 min · Kali + Vitrine").</summary>
public record SessionRoomDto(Guid Id, string Slug, string Title, int EstimatedMinutes = 0, string MachineLabel = "");

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
    /// <summary>Molde v1: alvo de aprendizagem (t1 a t15) que a atividade cobra.</summary>
    string? Target = null,
    /// <summary>Fase 113: Quiz que e um Prever da ponte intercalada - errar nao conta erro do dia.</summary>
    bool IsPrediction = false,
    /// <summary>Fase 113: so em atividade do tipo Parsons (ordenar linhas).</summary>
    ParsonsDto? Parsons = null);

/// <summary>
/// Fase 113: ordenar linhas. <see cref="Lines"/> vem embaralhada (estavel por atividade). <see cref="Solution"/> (a ordem
/// certa) so aparece quando o passo acaba - passou ou gastou <see cref="MaxAttempts"/> - mesma regra de gabarito do
/// CodeStep. <see cref="LastCheck"/> diz, por posicao, se a linha da ultima conferencia estava no lugar certo.
/// <see cref="PriorCode"/> e o script ate antes deste passo (nulo enquanto o passo anterior nao acabou).
/// </summary>
public record ParsonsDto(
    IReadOnlyCollection<string> FixedLines, IReadOnlyCollection<string> Lines, bool Done, int MaxAttempts,
    IReadOnlyCollection<string>? Solution, IReadOnlyCollection<bool>? LastCheck, string? PriorCode);

/// <summary>Fase 113: linha marcada do codigo inicial (1 = 1a linha do codeStarter); Kind e "Lacuna" ou "Erro".</summary>
public record CodeMarkDto(int Line, string Kind);

/// <summary>Fase 113: conferencia da Focada (rodar o script de novo trocando From por To e comparar com ExpectedOutput).</summary>
public record CodeCheckDto(string From, string To, string ExpectedOutput);

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
/// Fase 113 (ponte intercalada): Marks sao as linhas de lacuna/erro do CodeStarter; Check e a conferencia da Focada;
/// Replaces = o passo "refaz" o trecho anterior - sem codigo inicial proprio, CodeStarter vem com o trecho que ele
/// substitui (e PriorCode ja nao o tem).
/// </remarks>
public record CodeStepDto(
    string? PriorCode, bool Done, int MaxAttempts, string? Solution, string? ExpectedOutput,
    bool LabEnabled = false, string? CodeStarter = null, int MaxHints = 0, IReadOnlyCollection<CodeStepHintDto>? Hints = null,
    IReadOnlyCollection<CodeMarkDto>? Marks = null, CodeCheckDto? Check = null, bool Replaces = false);

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
