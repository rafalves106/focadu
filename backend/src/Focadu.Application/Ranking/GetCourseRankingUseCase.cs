using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Ranking;

/// <summary>
/// Caso de uso: ranking de um Course, num dos 3 recortes (RankingScope). Fase 16 - Score de
/// Estudo e SEMPRE calculado sob demanda (nunca persistido, mesmo padrao ja estabelecido pra
/// DailyStatus/Weekly.Number desde a Fase 13a - Weekly.CalculateScore ja deriva tudo de
/// ActivityResponse/WeeklyProject existentes). Performance nao deve ser problema no volume atual
/// (poucos usuarios, poucas Weeklies por Enrollment).
///
/// "Weekly"/"Monthly" sao por POSICAO no curriculo, nao calendario real (decisao confirmada com o
/// Falves) - cada Enrollment tem sua propria "Weekly atual" (resolvida por data, ver
/// ResolveCurrentWeekly), e o recorte compara "sua semana 1 vs a semana 1 de outro aluno" mesmo
/// que em datas de calendario diferentes. So "Course" soma tudo, sem depender de posicao nenhuma.
/// </summary>
public class GetCourseRankingUseCase
{
    private const int TopEntriesCount = 10;

    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedCosmeticsRepository;
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IClock _clock;

    public GetCourseRankingUseCase(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IUserRepository userRepository,
        IUserEquippedCosmeticsRepository equippedCosmeticsRepository,
        ICosmeticItemRepository cosmeticItemRepository,
        IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _equippedCosmeticsRepository = equippedCosmeticsRepository;
        _cosmeticItemRepository = cosmeticItemRepository;
        _clock = clock;
    }

    public async Task<RankingResultDto> ExecuteAsync(
        Guid requestingUserId, Guid courseId, RankingScope scope, CancellationToken cancellationToken = default)
    {
        _ = await _courseRepository.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollments = await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken);
        var today = _clock.Today();
        // Nome do item de cor equipado (Fase 18) - so o Name (token estavel do seed, ex: "Verde
        // Neon"), nao um hex: o frontend mapeia token -> cor de verdade, mesmo padrao ja
        // estabelecido de BadgeDto.code -> label/icone (BADGE_INFO) e CosmeticRarity -> swatch
        // (RARITY_STYLE). Catalogo inteiro (8 itens) cabe numa unica consulta, sem N+1.
        var itemsById = (await _cosmeticItemRepository.GetAllAsync(cancellationToken)).ToDictionary(i => i.Id);
        (int Number, bool Scored)? requesterWeek = null;

        var scored = new List<ScoredEnrollment>();
        foreach (var enrollment in enrollments)
        {
            var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
            var user = await _userRepository.GetByIdAsync(enrollment.UserId, cancellationToken);
            var equipped = await _equippedCosmeticsRepository.GetByUserIdAsync(enrollment.UserId, cancellationToken);
            var nameColor = equipped?.EquippedNameColorId is { } colorId && itemsById.TryGetValue(colorId, out var colorItem)
                ? colorItem.Name
                : null;

            if (enrollment.UserId == requestingUserId && weeklies.Count > 0)
            {
                var current = ResolveCurrentWeekly(weeklies, today);
                requesterWeek = (current.Number, current.CalculateScore() is not null);
            }

            scored.Add(new ScoredEnrollment(
                enrollment.UserId, user?.DisplayName ?? "Usuario", ComputeScore(weeklies, scope, today), enrollment.EnrolledAt, nameColor,
                AgentLooks.Resolve(equipped, itemsById)));
        }

        var ranked = RankEntries(scored);
        var topEntries = ranked.Take(TopEntriesCount).ToList();
        var currentUserEntry = ranked.FirstOrDefault(e => e.UserId == requestingUserId);

        return new RankingResultDto(
            topEntries, currentUserEntry, EntryAhead(ranked, currentUserEntry), ranked.Count,
            requesterWeek?.Number, requesterWeek?.Scored ?? false);
    }

    /// <summary>
    /// Score de uma Enrollment no recorte pedido, a partir das Weeklies ja carregadas - internal
    /// pra ser testavel direto com fixtures de dominio, sem repositorio nenhum (mesmo padrao de
    /// SubmitActivityResponseUseCase.ResolveScore). Weekly incompleta conta como 0 aqui (nunca
    /// null) - diferente de Weekly.CalculateScore() em qualquer outro contexto do app: um ranking
    /// PRECISA de um numero ordenavel, e "ainda nao pontuou neste recorte" e razoavelmente
    /// representado por 0 (nao e o mesmo aviso de "nao mostrar uma nota parcial enganosa" que
    /// vale pras telas de progresso do proprio usuario).
    /// </summary>
    internal static double ComputeScore(IReadOnlyCollection<Weekly> weeklies, RankingScope scope, DateOnly today)
    {
        if (weeklies.Count == 0) return 0;

        var current = ResolveCurrentWeekly(weeklies, today);

        return scope switch
        {
            RankingScope.Weekly => current.CalculateScore() ?? 0,
            RankingScope.Monthly => weeklies
                .Where(w => w.Template.MonthlyId == current.Template.MonthlyId)
                .Sum(w => w.CalculateScore() ?? 0),
            _ => weeklies.Sum(w => w.CalculateScore() ?? 0),
        };
    }

    /// <summary>
    /// "Weekly atual" de uma matricula (Fase 16): a de maior Number que ja tem ao menos 1 Daily
    /// datada em hoje-ou-antes (ja comecou) - mesmo criterio de "hoje" que o resto do app usa
    /// (GetTodayUseCase/EvaluateDailyAccess). Cai pra Weekly de menor Number se nenhuma comecou
    /// ainda (defensivo - nao deveria acontecer, EnrollUserInCourseUseCase sempre data a 1a Weekly
    /// pra hoje-ou-depois no momento da matricula).
    /// </summary>
    internal static Weekly ResolveCurrentWeekly(IReadOnlyCollection<Weekly> weeklies, DateOnly today) =>
        weeklies
            .Where(w => w.Dailies.Any(d => d.Date <= today))
            .OrderByDescending(w => w.Number)
            .FirstOrDefault()
        ?? weeklies.OrderBy(w => w.Number).First();

    /// <summary>Ordena decrescente por Score (empate: quem matriculou primeiro) e atribui Position - internal, testavel com dados simples, sem Enrollment/User/Weekly nenhum.</summary>
    internal static List<RankingEntryDto> RankEntries(IEnumerable<ScoredEnrollment> scored) =>
        scored
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.EnrolledAt)
            .Select((x, index) => new RankingEntryDto(x.UserId, x.DisplayName, x.Score, index + 1, x.EquippedNameColor, x.Look))
            .ToList();

    /// <summary>Quem esta logo acima de <paramref name="current"/> (Fase 72, cartao "Proximo alvo") - null pra quem e o 1o ou nao esta no curso.</summary>
    internal static RankingEntryDto? EntryAhead(IReadOnlyList<RankingEntryDto> ranked, RankingEntryDto? current) =>
        current is null || current.Position <= 1 ? null : ranked[current.Position - 2];
}

internal readonly record struct ScoredEnrollment(
    Guid UserId, string DisplayName, double Score, DateTime EnrolledAt, string? EquippedNameColor = null, AgentLookDto? Look = null);

/// <param name="Look">Fase 72: o agente em pixel art da pessoa (podio e placar), nulo sem agente criado.</param>
public record RankingEntryDto(Guid UserId, string DisplayName, double Score, int Position, string? EquippedNameColor = null, AgentLookDto? Look = null);

/// <summary>CurrentUserEntry e null so quando o usuario chamador nao tem Enrollment neste Course.</summary>
/// <param name="AheadEntry">Fase 72: quem esta logo acima do usuario, mesmo fora do top 10 ("Proximo alvo").</param>
/// <param name="TotalEntries">Fase 72: quantos matriculados o ranking tem.</param>
/// <param name="CurrentWeekNumber">Fase 72: a semana atual do usuario (recorte Semana).</param>
/// <param name="CurrentWeekScored">Fase 72: a semana atual do usuario ja fechou (Dailies + projeto avaliado) e pontua - senao o recorte Semana mostra um aviso.</param>
public record RankingResultDto(
    IReadOnlyCollection<RankingEntryDto> TopEntries, RankingEntryDto? CurrentUserEntry,
    RankingEntryDto? AheadEntry = null, int TotalEntries = 0, int? CurrentWeekNumber = null, bool CurrentWeekScored = false);
