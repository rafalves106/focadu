using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario responde a uma DailyActivity. Registra a tentativa, e em seguida checa
/// (na ordem) se essa resposta faz a Daily disparar reforco diario e se a Weekly, por sua vez,
/// disparou reforco semanal - as duas regras centrais de EvaluationPolicy.
///
/// Desde a Fase 4, o Score de TODO tipo de atividade e calculado aqui dentro (ResolveScore) -
/// nunca mais aceito pronto do cliente, pra nenhum tipo. Isso fechou de vez a lacuna que a Fase 3
/// deixou aberta so pra Cloze/Roleplay.
/// </summary>
public class SubmitActivityResponseUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public SubmitActivityResponseUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<SubmitActivityResponseResult> ExecuteAsync(
        Guid userId,
        Guid dailyId,
        Guid activityId,
        Guid? selectedOptionId,
        Guid? selectedRoleplayNodeId,
        string? transcript,
        string? justification,
        string? aiFeedback,
        IReadOnlyDictionary<Guid, Guid>? wordMatchMatches = null,
        CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var activity = daily.Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        var resolvedScore = ResolveScore(activity, selectedOptionId, selectedRoleplayNodeId, transcript, wordMatchMatches);

        return await ActivityResponseRecorder.RecordAsync(
            weekly, daily, activityId, resolvedScore, transcript, justification, aiFeedback,
            _clock, _unitOfWork, cancellationToken);
    }

    /// <summary>
    /// Decide como calcular o Score, conforme o tipo (e, pro Cloze, o AnswerMode) da atividade.
    /// Quiz e Cloze/MultipleChoice: a partir da QuizOption escolhida (IsCorrect e a fonte da
    /// verdade). WordMatch (Fase 23): a partir dos pares que o cliente diz ter formado, conferidos
    /// contra WordMatchPair.DefinitionId - pontuacao parcial (X de N pares certos), nao tudo-ou-
    /// nada (ver ScoreFromWordMatchMatches). Cloze/FreeText: comparacao textual do Transcript
    /// contra ExpectedAnswer. Roleplay: a partir do TerminalQuality do RoleplayNode terminal
    /// alcancado.
    /// </summary>
    internal static int ResolveScore(
        DailyActivity activity, Guid? selectedOptionId, Guid? selectedRoleplayNodeId, string? transcript,
        IReadOnlyDictionary<Guid, Guid>? wordMatchMatches = null)
    {
        return activity.Type switch
        {
            ActivityType.Quiz => ScoreFromSelectedOption(activity, selectedOptionId),
            ActivityType.WordMatch => ScoreFromWordMatchMatches(activity, wordMatchMatches),
            ActivityType.Cloze when activity.AnswerMode == AnswerMode.MultipleChoice =>
                ScoreFromSelectedOption(activity, selectedOptionId),
            ActivityType.Cloze => ScoreFromFreeTextAnswer(activity, transcript),
            ActivityType.Roleplay => ScoreFromRoleplayTerminalNode(activity, selectedRoleplayNodeId),
            // Reading/Video (Fase 7): nao ha avaliacao - concluir a etapa e o proprio "acerto".
            // Score fixo 100 (sempre Passed) so pra marcar a atividade como feita via o mesmo
            // pipeline de ActivityResponse/PenaltyPoints dos outros tipos, nunca penalizando.
            ActivityType.Reading or ActivityType.Video => 100,
            _ => throw new DomainException($"Tipo de atividade '{activity.Type}' nao tem calculo de Score definido."),
        };
    }

    private static int ScoreFromSelectedOption(DailyActivity activity, Guid? selectedOptionId)
    {
        if (selectedOptionId is null)
        {
            throw new ValidationException(
                "selected_option_id_obrigatorio", "O campo 'selectedOptionId' e obrigatorio para esta atividade.");
        }

        var option = activity.QuizOptions.FirstOrDefault(o => o.Id == selectedOptionId);
        if (option is null)
        {
            throw new ValidationException(
                "selected_option_id_invalido", "O 'selectedOptionId' informado nao corresponde a uma opcao desta atividade.");
        }

        return option.IsCorrect ? 100 : 0;
    }

    /// <summary>
    /// WordMatch (Fase 23): o cliente manda TODOS os pares de uma vez (TermId -> DefinitionId
    /// escolhido pelo usuario), nao 1 selectedOptionId por vez. Score = percentual de pares
    /// certos, arredondado - pontuacao parcial de proposito (nao tudo-ou-nada): reaproveita o
    /// mesmo EvaluationPolicy.PassingScore (80) de todo outro tipo de atividade pra decidir
    /// Passed, entao um grupo pequeno (2-3 pares) exige acertar quase tudo pra passar, e um grupo
    /// maior (4+ pares) tolera 1 erro - sem precisar de uma regra tudo-ou-nada separada.
    /// </summary>
    private static int ScoreFromWordMatchMatches(DailyActivity activity, IReadOnlyDictionary<Guid, Guid>? wordMatchMatches)
    {
        var pairs = activity.WordMatchPairs;
        if (wordMatchMatches is null || wordMatchMatches.Count == 0)
        {
            throw new ValidationException(
                "word_match_matches_obrigatorio", "O campo 'wordMatchMatches' e obrigatorio para esta atividade.");
        }

        var hasUnknownTerm = wordMatchMatches.Keys.Any(termId => pairs.All(p => p.Id != termId));
        if (wordMatchMatches.Count != pairs.Count || hasUnknownTerm)
        {
            throw new ValidationException(
                "word_match_matches_invalido",
                "O 'wordMatchMatches' precisa conter exatamente um par por termo desta atividade.");
        }

        var correctCount = pairs.Count(p => wordMatchMatches.TryGetValue(p.Id, out var chosen) && chosen == p.DefinitionId);
        return (int)Math.Round(100.0 * correctCount / pairs.Count);
    }

    // ponytail: comparacao textual exata (trim + case-insensitive), sem avaliacao semantica/IA -
    // suficiente pra respostas curtas de codigo/termo unico. Upgrade natural: trocar por
    // IContentEvaluationService quando existir um adapter concreto (ver docs/ARQUITETURA.md).
    private static int ScoreFromFreeTextAnswer(DailyActivity activity, string? transcript)
    {
        if (string.IsNullOrWhiteSpace(transcript))
        {
            throw new ValidationException(
                "transcript_obrigatorio", "O campo 'transcript' (sua resposta) e obrigatorio para esta atividade.");
        }

        if (string.IsNullOrWhiteSpace(activity.ExpectedAnswer))
            throw new DomainException("Esta atividade Cloze/FreeText nao tem ExpectedAnswer configurado.");

        var isCorrect = string.Equals(transcript.Trim(), activity.ExpectedAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
        return isCorrect ? 100 : 0;
    }

    /// <summary>
    /// Mapeamento TerminalQuality -> Score, decidido na Fase 4: Ideal e a unica qualidade que
    /// passa do EvaluationPolicy.PassingScore (80) - Suboptimal e Poor sempre reprovam, com
    /// Suboptimal valendo mais que Poor pra diferenciar "quase la" de "resposta ruim" no
    /// historico, mesmo os dois nao passando.
    /// </summary>
    private static int ScoreFromRoleplayTerminalNode(DailyActivity activity, Guid? selectedRoleplayNodeId)
    {
        if (selectedRoleplayNodeId is null)
        {
            throw new ValidationException(
                "selected_roleplay_node_id_obrigatorio", "O campo 'selectedRoleplayNodeId' e obrigatorio para esta atividade.");
        }

        var node = activity.RoleplayNodes.FirstOrDefault(n => n.Id == selectedRoleplayNodeId);
        if (node is null)
        {
            throw new ValidationException(
                "selected_roleplay_node_id_invalido",
                "O 'selectedRoleplayNodeId' informado nao corresponde a um node desta atividade.");
        }

        if (!node.IsTerminal)
        {
            throw new ValidationException(
                "selected_roleplay_node_nao_terminal",
                "So e possivel enviar a resposta ao atingir um node terminal (IsTerminal = true).");
        }

        return node.TerminalQuality switch
        {
            TerminalQuality.Ideal => 100,
            TerminalQuality.Suboptimal => 60,
            TerminalQuality.Poor => 20,
            _ => throw new DomainException("Node terminal sem TerminalQuality definida."),
        };
    }
}
