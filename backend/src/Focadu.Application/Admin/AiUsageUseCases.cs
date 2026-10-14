using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.AiUsage;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Admin;

/// <summary>
/// Aba "Uso de IA" do Painel de gestao (Fase 94): visao do periodo, por aluno e o painel de um aluno. Regra da secao:
/// medir antes de limitar - nada aqui bloqueia, avisa aluno ou troca modelo. Custo sempre estimado na leitura.
/// </summary>
public class AiUsageReportUseCase
{
    private readonly IAiUsageRepository _usage;
    private readonly IAdminQueries _queries;
    private readonly IClock _clock;

    public AiUsageReportUseCase(IAiUsageRepository usage, IAdminQueries queries, IClock clock)
    {
        _usage = usage;
        _queries = queries;
        _clock = clock;
    }

    public async Task<AiUsageOverviewDto> OverviewAsync(string? period, Guid? courseId, CancellationToken cancellationToken = default)
    {
        var (name, from, to) = AiUsageMath.Range(period, _clock.Today());
        var settings = await _usage.GetSettingsAsync(cancellationToken);
        var prices = await _usage.ListPricesAsync(cancellationToken);
        var records = await _usage.ListRecordsAsync(from, to, courseId, cancellationToken);

        var (_, monthFrom, monthTo) = AiUsageMath.Range("mes", _clock.Today());
        var monthRecords = name == "mes" && courseId is null ? records : await _usage.ListRecordsAsync(monthFrom, monthTo, null, cancellationToken);

        return new AiUsageOverviewDto(
            name, from, to, settings?.MeasuringSince ?? from, courseId,
            AiUsageMath.Totals(records, prices), AiUsageMath.ByType(records, prices),
            MonthlyCap(settings, AiUsageMath.Totals(monthRecords, prices).EstimatedCostUsd),
            prices.Select(AiModelPriceDto.From).ToList(), AiUsageMath.UnpricedModels(records, prices));
    }

    private static AiMonthlyCapDto MonthlyCap(AiUsageSettings? settings, decimal monthCostUsd) =>
        new(settings?.MonthlyCapUsd, monthCostUsd, settings?.MonthlyCapUsd is { } cap && monthCostUsd >= cap,
            settings?.DailyBudgetUsd, settings?.FallbackModel);

    public async Task<AiUsageStudentsDto> StudentsAsync(string? period, Guid? courseId, CancellationToken cancellationToken = default)
    {
        var (name, from, to) = AiUsageMath.Range(period, _clock.Today());
        var prices = await _usage.ListPricesAsync(cancellationToken);
        var records = await _usage.ListRecordsAsync(from, to, courseId, cancellationToken);
        var users = (await _queries.ListUsersAsync(cancellationToken)).ToDictionary(u => u.Id);
        var courses = (await _queries.ListEnrollmentsAsync(null, cancellationToken))
            .GroupBy(e => e.UserId).ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(e => e.CourseName).Distinct().ToList());

        var rows = records.Where(r => r.UserId is not null && users.ContainsKey(r.UserId.Value))
            .GroupBy(r => r.UserId!.Value)
            .Select(g =>
            {
                var user = users[g.Key];
                var totals = AiUsageMath.Totals(g.ToList(), prices);
                return new AiUsageStudentRowDto(
                    user.Id, user.DisplayName, user.Email, courses.GetValueOrDefault(user.Id, []),
                    totals.EstimatedCostUsd, totals.Calls, totals.AudioMinutes, totals.InputTokens + totals.OutputTokens,
                    g.Max(r => r.OccurredAt));
            })
            .OrderByDescending(r => r.CostUsd).ThenBy(r => r.DisplayName)
            .ToList();

        return new AiUsageStudentsDto(name, from, to, AiUsageMath.Totals(records, prices).EstimatedCostUsd, rows);
    }

    public async Task<AiUsageStudentDetailDto> StudentAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = (await _queries.ListUsersAsync(cancellationToken)).FirstOrDefault(u => u.Id == userId)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Aluno nao encontrado.");
        var prices = await _usage.ListPricesAsync(cancellationToken);
        var records = await _usage.ListRecordsByUserAsync(userId, cancellationToken);
        var enrollments = await _queries.ListEnrollmentsAsync(userId, cancellationToken);

        var courses = new List<AiUsageStudentCourseDto>();
        foreach (var enrollment in enrollments)
        {
            // Media do curso naquele dia: custo medio por aluno que teve chamada nesse dia, desde o inicio da medicao.
            var courseRecords = await _usage.ListRecordsByCourseAsync(enrollment.CourseId, cancellationToken);
            var mine = records.Where(r => r.CourseId == enrollment.CourseId).ToList();
            courses.Add(new AiUsageStudentCourseDto(
                enrollment.CourseId, enrollment.CourseName, AiUsageMath.Totals(mine, prices).EstimatedCostUsd,
                AiUsageMath.ByCourseDay(mine, courseRecords, enrollment.TotalDays, prices)));
        }

        return new AiUsageStudentDetailDto(
            user.Id, user.DisplayName, user.Email, AiUsageMath.Totals(records, prices), AiUsageMath.ByType(records, prices), courses);
    }
}

/// <summary>Tabela de precos e teto mensal (gaveta da aba Uso de IA). Editar recalcula a estimativa; o uso medido nao muda.</summary>
public class AiUsageSettingsUseCase
{
    private readonly IAiUsageRepository _usage;
    private readonly IUnitOfWork _unitOfWork;

    public AiUsageSettingsUseCase(IAiUsageRepository usage, IUnitOfWork unitOfWork)
    {
        _usage = usage;
        _unitOfWork = unitOfWork;
    }

    public async Task<AiModelPriceDto> SetPriceAsync(
        string? model, decimal? inputPerMillion, decimal? outputPerMillion, decimal? audioPerHour, string? source, string updatedBy,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(model))
            throw new ValidationException("preco_invalido", "Diga de qual modelo e o preco.");

        var now = DateTime.UtcNow;
        var price = await _usage.GetPriceAsync(model.Trim(), cancellationToken);
        if (price is null)
        {
            price = AiModelPrice.Create(model, inputPerMillion, outputPerMillion, audioPerHour, now, updatedBy, source);
            await _usage.AddPriceAsync(price, cancellationToken);
        }
        else
        {
            price.Update(inputPerMillion, outputPerMillion, audioPerHour, now, updatedBy, source);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return AiModelPriceDto.From(price);
    }

    /// <summary>
    /// Fase 101: salva os limites de gasto (orcamento diario por aluno, teto mensal global, modelo reserva). Valor vazio tira o limite.
    /// O modelo reserva precisa ter linha na tabela de precos: sem preco o gasto dele sumiria da medicao.
    /// </summary>
    public async Task<AiLimitsDto> SetLimitsAsync(decimal? dailyBudgetUsd, decimal? monthlyCapUsd, string? fallbackModel, CancellationToken cancellationToken = default)
    {
        var settings = await _usage.GetSettingsAsync(cancellationToken)
            ?? throw new ConflictException("medicao_desligada", "A medicao de IA ainda nao foi ligada neste banco.");

        var model = string.IsNullOrWhiteSpace(fallbackModel) ? null : fallbackModel.Trim();
        if (model is not null && await _usage.GetPriceAsync(model, cancellationToken) is null)
            throw new DomainException("O modelo reserva precisa estar na tabela de precos.", "modelo_sem_preco");

        settings.SetDailyBudget(dailyBudgetUsd);
        settings.SetMonthlyCap(monthlyCapUsd);
        settings.SetFallbackModel(model);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new AiLimitsDto(settings.DailyBudgetUsd, settings.MonthlyCapUsd, settings.FallbackModel);
    }
}

/// <summary>Contas da Medicao de IA, puras (testadas em Focadu.Tests).</summary>
internal static class AiUsageMath
{
    /// <summary>"mes" (mes corrente ate agora), "7d" ou "30d" (contando hoje). Intervalo em UTC, fim exclusivo.</summary>
    internal static (string Name, DateTime FromUtc, DateTime ToUtc) Range(string? period, DateOnly today)
    {
        var name = period is "7d" or "30d" ? period : "mes";
        var start = name switch
        {
            "7d" => today.AddDays(-6),
            "30d" => today.AddDays(-29),
            _ => new DateOnly(today.Year, today.Month, 1),
        };
        // IClock.Today() e o dia vivido (hora local do servidor, TZ=America/Sao_Paulo): converte a meia-noite local pra UTC.
        var fromUtc = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Local).ToUniversalTime();
        var toUtc = today.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Local).ToUniversalTime();
        return (name, fromUtc, toUtc);
    }

    /// <summary>Fase 101: o dia de hoje (meia-noite local ate a meia-noite seguinte), em UTC, fim exclusivo.</summary>
    internal static (DateTime FromUtc, DateTime ToUtc) DayRange(DateOnly today) =>
        (today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Local).ToUniversalTime(),
         today.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Local).ToUniversalTime());

    internal static decimal CostOf(AiUsageRecord record, IReadOnlyDictionary<string, AiModelPrice> prices) =>
        prices.TryGetValue(record.Model, out var price) ? price.CostOf(record.InputTokens, record.OutputTokens, record.AudioSeconds) : 0m;

    internal static AiUsageTotalsDto Totals(IReadOnlyCollection<AiUsageRecord> records, IReadOnlyList<AiModelPrice> prices)
    {
        var table = Table(prices);
        var cost = Round(records.Sum(r => CostOf(r, table)));
        var active = records.Where(r => r.UserId is not null).Select(r => r.UserId).Distinct().Count();
        return new AiUsageTotalsDto(
            cost, active == 0 ? null : Round(cost / active), Math.Round(records.Sum(r => r.AudioSeconds) / 60d, 1),
            records.Sum(r => (long)r.InputTokens), records.Sum(r => (long)r.OutputTokens),
            records.Count, records.Count(r => !r.Succeeded), active);
    }

    internal static IReadOnlyList<AiUsageByTypeDto> ByType(IReadOnlyCollection<AiUsageRecord> records, IReadOnlyList<AiModelPrice> prices)
    {
        var table = Table(prices);
        var total = records.Sum(r => CostOf(r, table));
        return records.GroupBy(r => r.CallType)
            .Select(g =>
            {
                var cost = g.Sum(r => CostOf(r, table));
                return new AiUsageByTypeDto(g.Key.ToString(), Round(cost), total == 0 ? 0 : Math.Round((double)(cost / total) * 100, 1), g.Count());
            })
            .OrderByDescending(t => t.CostUsd).ThenByDescending(t => t.Calls)
            .ToList();
    }

    /// <summary>Custo do aluno em cada dia 1..N do curso + media do curso naquele dia (por aluno com chamada no dia).</summary>
    internal static IReadOnlyList<AiCostByDayDto> ByCourseDay(
        IReadOnlyCollection<AiUsageRecord> mine, IReadOnlyCollection<AiUsageRecord> course, int totalDays, IReadOnlyList<AiModelPrice> prices)
    {
        var table = Table(prices);
        var lastDay = Math.Max(totalDays, mine.Concat(course).Select(r => r.CourseDay ?? 0).DefaultIfEmpty(0).Max());
        return Enumerable.Range(1, lastDay).Select(day =>
        {
            var perStudent = course.Where(r => r.CourseDay == day && r.UserId is not null)
                .GroupBy(r => r.UserId).Select(g => g.Sum(r => CostOf(r, table))).ToList();
            return new AiCostByDayDto(
                day, Round(mine.Where(r => r.CourseDay == day).Sum(r => CostOf(r, table))),
                perStudent.Count == 0 ? null : Round(perStudent.Average()));
        }).ToList();
    }

    internal static IReadOnlyList<string> UnpricedModels(IReadOnlyCollection<AiUsageRecord> records, IReadOnlyList<AiModelPrice> prices)
    {
        var table = Table(prices);
        return records.Select(r => r.Model).Distinct().Where(m => !table.ContainsKey(m)).OrderBy(m => m).ToList();
    }

    private static Dictionary<string, AiModelPrice> Table(IReadOnlyList<AiModelPrice> prices) => prices.ToDictionary(p => p.Model);

    // 5 casas: o custo de uma chamada e fracao de centavo; a tela arredonda pra mostrar.
    private static decimal Round(decimal value) => Math.Round(value, 5);
}
