using Focadu.Application.Admin;
using Focadu.Application.Shared;
using Focadu.Domain.AiUsage;
using Focadu.Domain.Exceptions;
using Focadu.Infrastructure.AiUsage;
using Xunit;

namespace Focadu.Tests.AiUsage;

// Fase 101, travas de IA: orcamento diario, teto mensal com modelo reserva, tentativas por dia e troca de modelo.
public class AiLimitsTests
{
    private static readonly DateTime Now = new(2026, 10, 14, 15, 0, 0, DateTimeKind.Utc);

    private static AiModelPrice Price(string model, decimal input, decimal output) =>
        AiModelPrice.Create(model, input, output, null, Now, "teste", null);

    [Theory]
    [InlineData(0.5, false)]
    [InlineData(null, false)]
    [InlineData(0.0, true)]
    [InlineData(-1.0, true)]
    public void Settings_LimiteDiarioPrecisaSerPositivoOuVazio(double? budget, bool throws)
    {
        var settings = AiUsageSettings.Start(Now);
        var set = () => settings.SetDailyBudget(budget is null ? null : (decimal)budget);
        if (throws) Assert.Equal("limite_invalido", Assert.Throws<DomainException>(set).Code);
        else set();
    }

    [Fact]
    public void Settings_ModeloReservaApararEspacoEVazioViraNulo()
    {
        var settings = AiUsageSettings.Start(Now);
        settings.SetFallbackModel("  openai/gpt-oss-20b ");
        Assert.Equal("openai/gpt-oss-20b", settings.FallbackModel);

        settings.SetFallbackModel("   ");
        Assert.Null(settings.FallbackModel);
    }

    [Fact]
    public void Orcamento_GastoIgualAoLimiteJaEstaEsgotado()
    {
        Assert.False(AiBudget.IsExhausted(0.49m, 0.50m));
        Assert.True(AiBudget.IsExhausted(0.50m, 0.50m));
        Assert.True(AiBudget.IsExhausted(0.51m, 0.50m));
    }

    [Fact]
    public void Orcamento_GastoDoDiaVemDoUsoMedidoVezesOPreco()
    {
        // 1 M de tokens de entrada a US$ 0,15 e 1 M de saida a US$ 0,60 = US$ 0,75.
        var prices = new List<AiModelPrice> { Price("openai/gpt-oss-120b", 0.15m, 0.60m) };
        var records = new List<AiUsageRecord>
        {
            AiUsageRecord.Create(Now, AiCallType.ContentEvaluation, "openai/gpt-oss-120b", Guid.NewGuid(), null, null, 1_000_000, 1_000_000, 0, true),
        };

        var spent = AiUsageMath.Totals(records, prices).EstimatedCostUsd;

        Assert.Equal(0.75m, spent);
        Assert.True(AiBudget.IsExhausted(spent, 0.50m));
    }

    [Fact]
    public void Teto_PassouDoValorComModeloReservaComPreco_Troca()
    {
        var settings = AiUsageSettings.Start(Now);
        settings.SetMonthlyCap(30m);
        settings.SetFallbackModel("openai/gpt-oss-20b");
        var prices = new List<AiModelPrice> { Price("openai/gpt-oss-120b", 0.15m, 0.60m), Price("openai/gpt-oss-20b", 0.075m, 0.30m) };

        var below = AiBudget.CapStatus(settings, prices, 29.99m);
        var at = AiBudget.CapStatus(settings, prices, 30m);

        Assert.False(below.OverCap);
        Assert.True(at.OverCap);
        Assert.Equal("openai/gpt-oss-20b", at.FallbackModel);
    }

    [Fact]
    public void Teto_ModeloReservaSemPreco_NaoTroca()
    {
        var settings = AiUsageSettings.Start(Now);
        settings.SetMonthlyCap(10m);
        settings.SetFallbackModel("modelo-sem-preco");

        var status = AiBudget.CapStatus(settings, [Price("openai/gpt-oss-120b", 0.15m, 0.60m)], 50m);

        Assert.True(status.OverCap);
        Assert.Null(status.FallbackModel);
    }

    [Fact]
    public void Teto_SemTetoOuSemConfiguracao_NuncaEstoura()
    {
        Assert.False(AiBudget.CapStatus(AiUsageSettings.Start(Now), [], 9_999m).OverCap);
        Assert.False(AiBudget.CapStatus(null, [], 9_999m).OverCap);
    }

    [Fact]
    public void Tentativas_ContamSoAsDeHoje()
    {
        var today = new DateOnly(2026, 10, 14);
        var (from, to) = AiUsageMath.DayRange(today);
        var times = new[] { from, from.AddHours(5), to.AddTicks(-1), from.AddTicks(-1), to };

        Assert.Equal(3, AiLimits.AttemptsToday(times, today));
    }

    [Theory]
    [InlineData(9, false)]
    [InlineData(10, true)]
    [InlineData(11, true)]
    public void Tentativas_NoLimiteLancaCodigoEstavel(int attempts, bool throws)
    {
        var check = () => AiLimits.EnsureBelowLimit(attempts);
        if (throws) Assert.Equal("limite_tentativas_dia", Assert.Throws<DomainException>(check).Code);
        else check();
    }

    [Fact]
    public void DayRange_CobreUmDiaInteiro()
    {
        var (from, to) = AiUsageMath.DayRange(new DateOnly(2026, 10, 14));
        Assert.True(to - from >= TimeSpan.FromHours(23));
        Assert.True(to - from <= TimeSpan.FromHours(25));
    }

    [Fact]
    public void Downgrade_TrocaSoOCampoModelEMantemORestante()
    {
        var swapped = AiModelDowngradeHandler.Swap(
            """{"model":"openai/gpt-oss-120b","temperature":0.2,"messages":[{"role":"user","content":"oi"}],"response_format":{"type":"json_object"}}""",
            "openai/gpt-oss-20b");

        Assert.NotNull(swapped);
        using var doc = System.Text.Json.JsonDocument.Parse(swapped!);
        Assert.Equal("openai/gpt-oss-20b", doc.RootElement.GetProperty("model").GetString());
        Assert.Equal(0.2, doc.RootElement.GetProperty("temperature").GetDouble());
        Assert.Equal("oi", doc.RootElement.GetProperty("messages")[0].GetProperty("content").GetString());
        Assert.Equal("json_object", doc.RootElement.GetProperty("response_format").GetProperty("type").GetString());
    }

    [Theory]
    [InlineData("""{"model":"openai/gpt-oss-20b","messages":[]}""")] // ja e o reserva
    [InlineData("""{"messages":[]}""")] // sem model
    [InlineData("""{"model":42}""")] // model nao e texto
    [InlineData("[]")] // nao e objeto
    [InlineData("isto nao e json")]
    public void Downgrade_CorpoInesperado_SeguePeloOriginal(string body)
    {
        Assert.Null(AiModelDowngradeHandler.Swap(body, "openai/gpt-oss-20b"));
    }
}
