using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
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
    private readonly IClock _clock;

    public GetCourseRankingUseCase(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IUserRepository userRepository,
        IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _clock = clock;
    }

    public async Task<RankingResultDto> ExecuteAsync(
        Guid requestingUserId, Guid courseId, RankingScope scope, CancellationToken cancellationToken = default)
    {
        _ = await _courseRepository.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollments = await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken);
        var today = _clock.Today();

        var scored = new List<ScoredEnrollment>();
        foreach (var enrollment in enrollments)
        {
            var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
            var user = await _userRepository.GetByIdAsync(enrollment.UserId, cancellationToken);

            scored.Add(new ScoredEnrollment(
                enrollment.UserId, user?.DisplayName ?? "Usuario", ComputeScore(weeklies, scope, today), enrollment.EnrolledAt));
        }

        var ranked = RankEntries(scored);
        var topEntries = ranked.Take(TopEntriesCount).ToList();
        var currentUserEntry = ranked.FirstOrDefault(e => e.UserId == requestingUserId);

        return new RankingResultDto(topEntries, currentUserEntry);
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
            .Select((x, index) => new RankingEntryDto(x.UserId, x.DisplayName, x.Score, index + 1))
            .ToList();
}

internal readonly record struct ScoredEnrollment(Guid UserId, string DisplayName, double Score, DateTime EnrolledAt);

public record RankingEntryDto(Guid UserId, string DisplayName, double Score, int Position);

/// <summary>CurrentUserEntry e null so quando o usuario chamador nao tem Enrollment neste Course.</summary>
public record RankingResultDto(IReadOnlyCollection<RankingEntryDto> TopEntries, RankingEntryDto? CurrentUserEntry);
