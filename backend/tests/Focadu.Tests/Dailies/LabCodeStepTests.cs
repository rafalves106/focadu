using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Fase 86: laboratorio de codigo (secret/rascunhos/laboratorio-de-codigo-na-ponte.md) - configuracao
/// do dia (LabConfig), opt-out por passo, dicas da Focada (3 por passo, sem ser tentativa) e o que a
/// Daily expoe pro cliente.
/// </summary>
public class LabCodeStepTests
{
    private static LabConfig PythonLab(params Guid[] files) =>
        LabConfig.Create("python", null, files, ["scapy"], null, "auditor.py", "python auditor.py ponte.pcap", 10);

    private static (Daily Daily, DailyTemplate Template, DailyActivity Step1, DailyActivity Step2) NewLabBridge(bool withLab = true)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(6);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var step1 = template.AddActivity(ActivityType.CodeStep, 0, AnswerMode.FreeText, "passo 1");
        step1.ConfigureCodeStep("pacotes = rdpcap(arquivo)\n", "pacotes: 54", "le com rdpcap");
        var step2 = template.AddActivity(ActivityType.CodeStep, 1, AnswerMode.FreeText, "passo 2");
        step2.ConfigureCodeStep("tcp = 0\n", "TCP: 38", "haslayer antes", starter: "# comece aqui");
        if (withLab) template.SetLab(PythonLab());

        daily.Start();
        return (daily, template, step1, step2);
    }

    // ---- LabConfig ----

    [Fact]
    public void LabConfig_Create_NormalizesAndKeepsTheFields()
    {
        var file = Guid.NewGuid();
        var lab = LabConfig.Create(" Python ", null, [file, file], ["scapy", " scapy ", ""], null, " auditor.py ", "python auditor.py ponte.pcap", 10);

        Assert.Equal("python", lab.Runtime);
        Assert.Null(lab.Image);
        Assert.Equal([file], lab.FileContentIds);
        Assert.Equal(["scapy"], lab.Packages);
        Assert.Equal("auditor.py", lab.Entry);
    }

    [Theory]
    [InlineData("ruby", null, "x.rb", "ruby x.rb", 10, "lab_runtime_invalido")]
    [InlineData("bash", null, "a.sh", "bash a.sh", 10, "lab_imagem_invalida")]        // bash exige image
    [InlineData("bash", "gigante", "a.sh", "bash a.sh", 10, "lab_imagem_invalida")]
    [InlineData("python", "basico", "a.py", "python a.py", 10, "lab_imagem_invalida")] // image so pro bash
    [InlineData("python", null, "", "python a.py", 10, "lab_entry_obrigatorio")]
    [InlineData("python", null, "a.py", " ", 10, "lab_command_obrigatorio")]
    [InlineData("python", null, "a.py", "python b.py", 10, "lab_command_invalido")]    // o comando roda o entry
    [InlineData("python", null, "a.py", "python a.py", 0, "lab_timeout_invalido")]
    [InlineData("python", null, "a.py", "python a.py", 61, "lab_timeout_invalido")]
    public void LabConfig_Create_RejectsInvalidFields(string runtime, string? image, string entry, string command, int timeout, string code)
    {
        var ex = Assert.Throws<DomainException>(() => LabConfig.Create(runtime, image, null, null, null, entry, command, timeout));
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public void LabConfig_Services_RequireTheServerImage_AndBashHasNoPackages()
    {
        Assert.Equal("lab_servico_invalido",
            Assert.Throws<DomainException>(() => LabConfig.Create("bash", "basico", null, null, ["lab_http.py"], "a.sh", "bash a.sh", 10)).Code);
        Assert.Equal("lab_pacote_invalido",
            Assert.Throws<DomainException>(() => LabConfig.Create("bash", "servidor", null, ["curl"], null, "a.sh", "bash a.sh", 10)).Code);

        var ok = LabConfig.Create("bash", "servidor", null, null, ["lab_http.py"], "auditar.sh", "bash auditar.sh lab", 10);
        Assert.Equal(["lab_http.py"], ok.Services);
    }

    // ---- DailyTemplate / passo ----

    [Fact]
    public void SetLab_NeedsACodeStep_AndStepsCanOptOut()
    {
        var weekly = DailyFixtures.NewWeekly();
        var empty = weekly.Template.AddDailyTemplate(1);
        empty.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice, "q");
        Assert.Equal("lab_sem_passo_de_codigo", Assert.Throws<DomainException>(() => empty.SetLab(PythonLab())).Code);

        var (_, template, step1, step2) = NewLabBridge();
        Assert.True(template.StepUsesLab(step1));
        step2.SetLabOptions(null, labDisabled: true);
        Assert.False(template.StepUsesLab(step2));
        Assert.True(step2.LabDisabled);

        template.SetLab(null);
        Assert.False(template.StepUsesLab(step1));
    }

    [Fact]
    public void LabOptions_OnlyForCodeSteps()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var quiz = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice, "q");

        Assert.Throws<DomainException>(() => quiz.SetLabOptions("x", false));
    }

    // ---- dicas ----

    [Fact]
    public void Hint_IsNotAnAttempt_AndIsNumberedPerStep_UpToTheLimit()
    {
        var (daily, _, step1, step2) = NewLabBridge();

        for (var i = 1; i <= CodeStepProgress.MaxHints; i++)
            Assert.Equal(i, daily.AddCodeStepHint(step1.Id, "certo", "erro", "melhorar").Number);

        var ex = Assert.Throws<DomainException>(() => daily.AddCodeStepHint(step1.Id, "a", "b", "c"));
        Assert.Equal("dicas_esgotadas", ex.Code);

        // nao gastou tentativa, nao somou penalidade e o limite e por passo
        Assert.Empty(daily.Responses);
        Assert.Equal(0, daily.PenaltyPoints);
        daily.SubmitActivityResponse(step1.Id, 100, transcript: "ok"); // passo 1 acabou
        Assert.Equal(1, daily.AddCodeStepHint(step2.Id, "certo", "erro", "melhorar").Number);
    }

    [Fact]
    public void Hint_RequiresLab_ThePreviousStepDone_AndAnOpenStep()
    {
        var (noLab, _, noLabStep, _) = NewLabBridge(withLab: false);
        Assert.Equal("passo_sem_laboratorio", Assert.Throws<DomainException>(() => noLab.AddCodeStepHint(noLabStep.Id, "a", "b", "c")).Code);

        var (daily, _, step1, step2) = NewLabBridge();
        Assert.Equal("passo_anterior_pendente", Assert.Throws<DomainException>(() => daily.AddCodeStepHint(step2.Id, "a", "b", "c")).Code);

        daily.SubmitActivityResponse(step1.Id, 100, transcript: "ok");
        Assert.Equal("passo_concluido", Assert.Throws<DomainException>(() => daily.AddCodeStepHint(step1.Id, "a", "b", "c")).Code);
    }

    [Fact]
    public void Hint_IsNotAllowed_OnAStepThatOptedOut()
    {
        var (daily, _, _, step2) = NewLabBridge();
        step2.SetLabOptions(null, labDisabled: true);
        daily.SubmitActivityResponse(daily.Activities.OrderBy(a => a.OrderIndex).First().Id, 100, transcript: "ok");

        Assert.Equal("passo_sem_laboratorio", Assert.Throws<DomainException>(() => daily.AddCodeStepHint(step2.Id, "a", "b", "c")).Code);
    }

    [Fact]
    public void ResetAfterTemplateRefresh_AlsoClearsTheHints()
    {
        var (daily, _, step1, _) = NewLabBridge();
        daily.AddCodeStepHint(step1.Id, "a", "b", "c");

        daily.ResetAfterTemplateRefresh();

        Assert.Empty(daily.Hints);
    }

    // ---- entrada do laboratorio ----

    [Fact]
    public void LabRun_Normalize_UsesTheOutput_OrTheCommandHistoryWhenThereIsOne()
    {
        var plain = new LabRunInput("4 dominios", 0).Normalize(1000);
        Assert.Equal("4 dominios", plain.Text);
        Assert.Empty(plain.Run.Commands);

        var history = new LabRunInput("ignorado", 1, [new LabCommandInput(" bash a.sh lab ", "IP: 127.0.0.1\n"), new LabCommandInput("", "x"), new LabCommandInput("ls", null)])
            .Normalize(1000);
        Assert.Equal("$ bash a.sh lab\nIP: 127.0.0.1\n$ ls", history.Text);
        Assert.Equal(2, history.Run.Commands.Count);
        Assert.Equal(1, history.Run.ExitCode);
    }

    [Fact]
    public void LabRun_Normalize_AllowsEmptyOutput_ButRejectsHugeHistories()
    {
        Assert.Equal("", new LabRunInput(null, 0).Normalize(1000).Text);

        var tooMany = Enumerable.Range(0, LabRunInput.MaxCommands + 1).Select(i => new LabCommandInput($"c{i}", "")).ToList();
        Assert.Equal("laboratorio_historico_grande", Assert.Throws<ValidationException>(() => new LabRunInput("", 0, tooMany).Normalize(100_000)).Code);
        Assert.Equal("codigo_muito_grande", Assert.Throws<ValidationException>(() => new LabRunInput(new string('x', 1001), 0).Normalize(1000)).Code);
    }

    // ---- o que a Daily expoe ----

    [Fact]
    public void Mapper_ExposesTheLab_TheStarterAndTheHints_OnlyForStepsThatRunThere()
    {
        var (daily, template, step1, step2) = NewLabBridge();
        step1.SetLabOptions(null, labDisabled: true);
        daily.SubmitActivityResponse(step1.Id, 100, transcript: "ok");
        daily.AddCodeStepHint(step2.Id, "certo", "erro", "melhorar");

        var dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Resume);

        Assert.Equal("python", dto.Lab!.Runtime);
        Assert.Equal("auditor.py", dto.Lab.Entry);
        var first = dto.Activities.Single(a => a.Id == step1.Id).CodeStep!;
        Assert.False(first.LabEnabled);
        Assert.Null(first.Hints);
        Assert.Equal(0, first.MaxHints);

        var second = dto.Activities.Single(a => a.Id == step2.Id).CodeStep!;
        Assert.True(second.LabEnabled);
        Assert.Equal("# comece aqui", second.CodeStarter);
        Assert.Equal(CodeStepProgress.MaxHints, second.MaxHints);
        Assert.Equal("melhorar", Assert.Single(second.Hints!).Improve);

        template.SetLab(null);
        Assert.Null(DailyStateMapper.ToDto(daily, DailyAccessMode.Resume).Lab);
    }
}
