using Focadu.Application.Admin;
using Focadu.Application.Ports;
using Focadu.Domain.AiUsage;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Focadu.Infrastructure.AiUsage;
using Xunit;

namespace Focadu.Tests.Admin;

// Fase 94, Painel de gestao: papel de admin, limites do convite, medicao de IA e grade de curadoria.
public class AdminPanelTests
{
    private static readonly DateTime Now = new(2026, 10, 5, 13, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void User_NasceAluno_ESetRoleTrocaOPapel()
    {
        var user = User.Create("a@b.com", "hash", "Ana");
        Assert.Equal(UserRole.Student, user.Role);
        Assert.False(user.IsAdmin);

        user.SetRole(UserRole.Admin);
        Assert.True(user.IsAdmin);

        Assert.Throws<DomainException>(() => user.SetRole((UserRole)99));
    }

    [Theory]
    [InlineData(20, true)]
    [InlineData(21, false)]
    public void Convite_LimiteDeUsos(int maxUses, bool ok)
    {
        var create = () => SignupInvite.Create("ABCD2345", "Fulano", maxUses, Now.AddDays(7));
        if (ok) create();
        else Assert.Equal("convite_usos_invalidos", Assert.Throws<DomainException>(create).Code);
    }

    [Fact]
    public void Convite_StatusCalculado()
    {
        var invite = SignupInvite.Create("ABCD2345", "Fulano", 1, Now.AddDays(1));
        Assert.Equal("ativo", invite.StatusAt(Now));
        Assert.Equal("vencido", invite.StatusAt(Now.AddDays(2)));

        invite.Consume(Now);
        Assert.Equal("esgotado", invite.StatusAt(Now));

        invite.Revoke(Now);
        Assert.Equal("revogado", invite.StatusAt(Now));
    }

    [Fact]
    public void Preco_CustoDeTokensEAudio()
    {
        var chat = AiModelPrice.Create("openai/gpt-oss-120b", 0.15m, 0.60m, null, Now, "seed", null);
        Assert.Equal(0.15m + 0.30m, chat.CostOf(1_000_000, 500_000, 0));

        var whisper = AiModelPrice.Create("whisper-large-v3", null, null, 0.111m, Now, "seed", null);
        Assert.Equal(0.111m / 2, whisper.CostOf(0, 0, 1800));

        Assert.Throws<DomainException>(() => chat.Update(null, null, null, Now, "x", null));
        Assert.Throws<DomainException>(() => chat.Update(-1m, null, null, Now, "x", null));
    }

    [Fact]
    public void Teto_PrecisaSerPositivoOuVazio()
    {
        var settings = AiUsageSettings.Start(Now);
        settings.SetMonthlyCap(10m);
        Assert.Equal(10m, settings.MonthlyCapUsd);
        settings.SetMonthlyCap(null);
        Assert.Null(settings.MonthlyCapUsd);
        Assert.Throws<DomainException>(() => settings.SetMonthlyCap(0m));
    }

    [Fact]
    public void Medicao_TotaisPorTipoEModeloSemPreco()
    {
        var ana = Guid.NewGuid();
        var bia = Guid.NewGuid();
        var prices = new[]
        {
            AiModelPrice.Create("chat", 1m, 2m, null, Now, "seed", null),
            AiModelPrice.Create("audio", null, null, 3.6m, Now, "seed", null),
        };
        var records = new[]
        {
            Record(ana, AiCallType.ContentEvaluation, "chat", input: 1_000_000, output: 1_000_000),   // US$ 3
            Record(bia, AiCallType.Transcription, "audio", seconds: 1000),                           // US$ 1
            Record(bia, AiCallType.StudyAssistant, "novo-modelo", input: 1_000_000),                 // sem preco
            Record(null, AiCallType.ContentEvaluation, "chat", succeeded: false),
        };

        var totals = AiUsageMath.Totals(records, prices);
        Assert.Equal(4m, totals.EstimatedCostUsd);
        Assert.Equal(2m, totals.CostPerActiveStudentUsd);
        Assert.Equal(2, totals.ActiveStudents);
        Assert.Equal(4, totals.Calls);
        Assert.Equal(1, totals.FailedCalls);
        Assert.Equal(16.7, totals.AudioMinutes);

        var byType = AiUsageMath.ByType(records, prices);
        Assert.Equal("ContentEvaluation", byType[0].CallType);
        Assert.Equal(75, byType[0].SharePercent);
        Assert.Equal(2, byType[0].Calls);

        Assert.Equal(["novo-modelo"], AiUsageMath.UnpricedModels(records, prices));
    }

    [Fact]
    public void Medicao_CustoPorDiaDoCursoComMediaDoCurso()
    {
        var ana = Guid.NewGuid();
        var bia = Guid.NewGuid();
        var prices = new[] { AiModelPrice.Create("chat", 1m, null, null, Now, "seed", null) };
        var mine = new[] { Record(ana, AiCallType.ContentEvaluation, "chat", input: 1_000_000, day: 1) };
        var course = mine.Concat([Record(bia, AiCallType.ContentEvaluation, "chat", input: 3_000_000, day: 1)]).ToList();

        var days = AiUsageMath.ByCourseDay(mine, course, totalDays: 3, prices);

        Assert.Equal(3, days.Count);
        Assert.Equal(1m, days[0].CostUsd);
        Assert.Equal(2m, days[0].CourseAverageUsd);
        Assert.Null(days[1].CourseAverageUsd);
    }

    [Theory]
    [InlineData("7d", 2026, 9, 29)]
    [InlineData("30d", 2026, 9, 6)]
    [InlineData("mes", 2026, 10, 1)]
    [InlineData(null, 2026, 10, 1)]
    public void Medicao_PeriodoComecaNoDiaCerto(string? period, int y, int m, int d)
    {
        var (_, from, to) = AiUsageMath.Range(period, new DateOnly(2026, 10, 5));
        Assert.Equal(new DateOnly(y, m, d), DateOnly.FromDateTime(from.ToLocalTime()));
        Assert.Equal(new DateOnly(2026, 10, 6), DateOnly.FromDateTime(to.ToLocalTime()));
    }

    [Fact]
    public void Medicao_LeUsoDoChatEDuracaoDoAudio()
    {
        var chat = AiUsageMeasuringHandler.ParseUsage("""{"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":45,"total_tokens":165}}""");
        Assert.Equal((120, 45, 0d), (chat.InputTokens, chat.OutputTokens, chat.AudioSeconds));

        var audio = AiUsageMeasuringHandler.ParseUsage("""{"text":"oi","duration":12.5}""");
        Assert.Equal(12.5, audio.AudioSeconds);

        var nothing = AiUsageMeasuringHandler.ParseUsage("[]");
        Assert.Equal(0, nothing.InputTokens);
    }

    [Fact]
    public async Task Medicao_ContextoValeSoDentroDoUsing()
    {
        var context = new AiUsageContext();
        var user = Guid.NewGuid();
        Assert.Null(AiUsageContext.Current);

        using (context.Begin(user, dailyId: Guid.Empty))
        {
            await Task.Yield();
            Assert.Equal(user, AiUsageContext.Current?.UserId);
        }

        Assert.Null(AiUsageContext.Current);
    }

    [Fact]
    public void Curadoria_EstadoDeCadaDia()
    {
        var files = new List<(int Day, int Week, bool HasFile, string? Hash)>
        {
            (1, 1, true, "h1"), (2, 1, true, "novo"), (3, 1, true, "h3"), (4, 1, false, null), (5, 1, false, null),
        };
        var db = new List<AdminCourseDayRow>
        {
            new(1, "h1", 10, 2), new(2, "velho", 4, 1), new(4, "h4", 0, 0), new(9, "h9", 7, 3),
        };

        var course = AdminCurationUseCase.BuildCourse("linux", null, "Linux", files, db);

        Assert.Equal(
            ["em_dia", "difere", "so_no_arquivo", "so_no_banco", "sem_curadoria", "so_no_banco"],
            course.Days.Select(d => d.State).ToArray());
        Assert.Equal(3, course.CuratedDays);
        Assert.Equal(2, course.StaleDays);
    }

    [Fact]
    public void Curadoria_ImportacaoEhTudoOuNada()
    {
        static ImportDayPreviewDto Day(string status) => new(1, status, "", []);

        Assert.True(AdminCurationUseCase.CanConfirm([Day("Created"), Day("Unchanged")]));
        Assert.False(AdminCurationUseCase.CanConfirm([Day("Created"), Day("Rejected")]));
        Assert.False(AdminCurationUseCase.CanConfirm([Day("Unchanged")]));
        Assert.False(AdminCurationUseCase.CanConfirm([]));
    }

    [Theory]
    [InlineData(" Web Security ", true)]
    [InlineData("web security", true)]
    [InlineData("Web", false)]
    [InlineData(null, false)]
    public void Confirmacao_Digitada(string? typed, bool ok) =>
        Assert.Equal(ok, AdminConfirmation.Matches(typed, "Web Security"));

    private static AiUsageRecord Record(
        Guid? user, AiCallType type, string model, int input = 0, int output = 0, double seconds = 0, int? day = null, bool succeeded = true) =>
        AiUsageRecord.Create(Now, type, model, user, null, day, input, output, seconds, succeeded);
}
