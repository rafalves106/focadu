using Focadu.Application.Admin;
using Focadu.Domain.Exceptions;
using Focadu.Domain.ProductMetrics;
using Xunit;

namespace Focadu.Tests.Admin;

// Fase 103, Medicao de produto: aparelho do User-Agent, tela normalizada e as contas da aba Retencao.
public class RetentionTests
{
    private static readonly DateOnly Today = new(2026, 10, 15); // quinta-feira
    private static readonly Guid Ana = Guid.NewGuid();
    private static readonly Guid Bia = Guid.NewGuid();
    private static readonly Guid Caio = Guid.NewGuid();

    [Theory]
    [InlineData("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", DeviceClass.Mobile)]
    [InlineData("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129.0 Mobile Safari/537.36", DeviceClass.Mobile)]
    [InlineData("Mozilla/5.0 (Linux; Android 13; SM-X200) Chrome/129.0 Safari/537.36", DeviceClass.Tablet)]
    [InlineData("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)", DeviceClass.Tablet)]
    [InlineData("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15", DeviceClass.Desktop)]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0", DeviceClass.Desktop)]
    [InlineData("", DeviceClass.Desktop)]
    [InlineData(null, DeviceClass.Desktop)]
    public void DeviceClassifier_ResumeOUserAgent(string? userAgent, DeviceClass expected) =>
        Assert.Equal(expected, DeviceClassifier.FromUserAgent(userAgent));

    [Theory]
    [InlineData("sessao", "sessao")]
    [InlineData(" Hoje ", "hoje")]
    [InlineData("<script>", "outra")]
    [InlineData(null, "outra")]
    public void ScreenVisit_TelaDesconhecidaViraOutra(string? screen, string expected) =>
        Assert.Equal(expected, ScreenVisit.Create(Ana, Today, screen, DeviceClass.Mobile, DateTime.UtcNow).Screen);

    [Fact]
    public void ScreenVisit_SemAluno_Falha() =>
        Assert.Throws<DomainException>(() => ScreenVisit.Create(Guid.Empty, Today, "hoje", DeviceClass.Desktop, DateTime.UtcNow));

    [Fact]
    public void WeekStart_EASegundaFeira()
    {
        Assert.Equal(new DateOnly(2026, 10, 12), RetentionCalculator.WeekStart(Today));
        Assert.Equal(new DateOnly(2026, 10, 12), RetentionCalculator.WeekStart(new DateOnly(2026, 10, 18))); // domingo
    }

    [Fact]
    public void Cohorts_RetornoContinuo_ContaSoQuemJaTemNDias()
    {
        // Ana: cadastro 01/10 (semana de 29/09), voltou em 09/10 (dia 8). Bia: 02/10, nunca voltou. Caio: 14/10, voltou 15/10.
        var students = new[]
        {
            new RetentionStudent(Ana, new DateOnly(2026, 10, 1)),
            new RetentionStudent(Bia, new DateOnly(2026, 10, 2)),
            new RetentionStudent(Caio, new DateOnly(2026, 10, 14)),
        };
        var opened = new[] { (Ana, new DateOnly(2026, 10, 1)), (Ana, new DateOnly(2026, 10, 9)), (Caio, new DateOnly(2026, 10, 15)) };
        var daily = new[] { (Ana, new DateOnly(2026, 10, 1)) };

        var cohorts = RetentionCalculator.Cohorts(students, opened, daily, Today);

        Assert.Equal(2, cohorts.Count);
        var current = cohorts[0]; // mais recente primeiro
        Assert.Equal(new DateOnly(2026, 10, 12), current.WeekStart);
        Assert.Equal(new RetentionCellDto(1, 1), current.OpenedD1);
        Assert.Null(current.OpenedD7); // ninguem da coorte tem 7 dias ainda

        var old = cohorts[1];
        Assert.Equal(2, old.Students);
        Assert.Equal(new RetentionCellDto(1, 2), old.OpenedD1); // voltar no dia 8 conta pro D1 (continuo)
        Assert.Equal(new RetentionCellDto(1, 2), old.OpenedD7);
        Assert.Null(old.OpenedD30);
        Assert.Equal(new RetentionCellDto(0, 2), old.DailyD1); // a Daily foi no dia do cadastro, nao depois

        var total = RetentionCalculator.Total(cohorts)!;
        Assert.Equal(3, total.Students);
        Assert.Equal(new RetentionCellDto(2, 3), total.OpenedD1);
        Assert.Equal(new RetentionCellDto(1, 2), total.OpenedD7);
        Assert.Null(total.OpenedD30);
    }

    [Fact]
    public void Total_SemCoorte_ENulo() => Assert.Null(RetentionCalculator.Total([]));

    [Fact]
    public void DailyToProject_SoSemanasAlcancadas_EEntregaEntreQuemFezDaily()
    {
        var completions = new[] { (Ana, 1), (Ana, 1), (Bia, 1), (Ana, 2) };
        var delivered = new[] { (Ana, 1), (Caio, 1) }; // Caio entregou sem Daily: fora da conta

        var weeks = RetentionCalculator.DailyToProject(completions, [1, 2, 3], delivered);

        Assert.Equal([new DailyToProjectWeekDto(1, 2, 1), new DailyToProjectWeekDto(2, 1, 0)], weeks);
    }

    [Fact]
    public void Dropout_ParadoHa7Dias_PelaUltimaSemana_ComSemanasZeradas()
    {
        var enrolled = new[]
        {
            new RetentionStudent(Ana, new DateOnly(2026, 9, 1)),   // ultima vez em 01/10, parou na Semana 3
            new RetentionStudent(Bia, new DateOnly(2026, 10, 1)),  // nunca abriu: conta o cadastro, parou antes da 1a Daily
            new RetentionStudent(Caio, new DateOnly(2026, 10, 1)), // abriu ontem: ativo
        };
        var opened = new[] { (Ana, new DateOnly(2026, 10, 1)), (Caio, new DateOnly(2026, 10, 14)) };
        var completions = new[] { (Ana, 1), (Ana, 3), (Caio, 4) };

        var dropout = RetentionCalculator.Dropout(enrolled, opened, completions, Today);

        Assert.Equal(1, dropout.Active);
        Assert.Equal(1, dropout.BeforeFirstDaily);
        Assert.Equal(
            [new DropoutWeekDto(1, 0), new DropoutWeekDto(2, 0), new DropoutWeekDto(3, 1), new DropoutWeekDto(4, 0)],
            dropout.ByWeek);
    }

    [Fact]
    public void Dropout_SeteDiasExatos_ContaComoParado()
    {
        var enrolled = new[] { new RetentionStudent(Ana, new DateOnly(2026, 9, 1)) };
        var dropout = RetentionCalculator.Dropout(enrolled, [(Ana, Today.AddDays(-7))], [], Today);
        Assert.Equal(0, dropout.Active);
        Assert.Equal(1, dropout.BeforeFirstDaily);
    }

    [Fact]
    public void ScreensByDevice_JanelaEContagemPorAparelho()
    {
        var visits = new[]
        {
            ScreenVisit.Create(Ana, Today, "sessao", DeviceClass.Mobile, DateTime.UtcNow),
            ScreenVisit.Create(Ana, Today, "sessao", DeviceClass.Desktop, DateTime.UtcNow),
            ScreenVisit.Create(Bia, Today.AddDays(-1), "sessao", DeviceClass.Desktop, DateTime.UtcNow),
            ScreenVisit.Create(Bia, Today, "loja", DeviceClass.Tablet, DateTime.UtcNow),
            ScreenVisit.Create(Bia, Today.AddDays(-40), "perfil", DeviceClass.Mobile, DateTime.UtcNow), // fora da janela
        };

        var rows = RetentionCalculator.ScreensByDevice(visits, Today.AddDays(-29));

        Assert.Equal([new ScreenDeviceRowDto("sessao", 2, 1, 0), new ScreenDeviceRowDto("loja", 0, 0, 1)], rows);
    }
}
