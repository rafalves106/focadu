using Focadu.Application.Dailies;
using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Fase 79: passo de codigo da ponte ("code comigo", secret/rascunhos/ponte-code-comigo.md) - o
/// passo acaba ao passar ou em CodeStepProgress.MaxAttempts tentativas, ajustar nao e erro da
/// sessao, nao vale nota, e cada passo parte do que o anterior entregou (aprovado ou a solucao).
/// </summary>
public class CodeStepTests
{
    private static (Daily Daily, DailyActivity Step1, DailyActivity Step2, DailyActivity Voice) NewBridge()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(6);
        var reading = weekly.Template.AddCuratedContent(CuratedContentType.Reading, "Exemplo", bodyText: "texto");
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var step1 = template.AddActivity(ActivityType.CodeStep, 0, AnswerMode.FreeText, "passo 1");
        step1.ConfigureCodeStep("pacotes = rdpcap(arquivo)\n", "pacotes: 54", "le com rdpcap");
        var step2 = template.AddActivity(ActivityType.CodeStep, 1, AnswerMode.FreeText, "passo 2");
        step2.ConfigureCodeStep("tcp = 0\n", "TCP: 38", "haslayer antes");
        var voice = template.AddActivity(ActivityType.VoiceSummary, 2, AnswerMode.FreeText, "resuma", reading.Id);

        daily.Start();
        return (daily, step1, step2, voice);
    }

    [Fact]
    public void FailedAttempt_IsNotASessionError_NorAReinforcementCandidate()
    {
        var (daily, step1, _, _) = NewBridge();

        daily.SubmitActivityResponse(step1.Id, 0, transcript: "print(54)");
        daily.SubmitActivityResponse(step1.Id, 0, transcript: "print(54)");
        daily.SubmitActivityResponse(step1.Id, 0, transcript: "print(54)");

        Assert.Equal(0, daily.PenaltyPoints);
        Assert.False(daily.ShouldTriggerDailyReinforcement());
        Assert.Empty(daily.GetFailedActivities());
    }

    [Fact]
    public void Step_IsDone_WhenPassed_OrAfterMaxAttempts()
    {
        var (daily, step1, step2, _) = NewBridge();

        daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado");
        Assert.False(daily.IsCodeStepDone(step1.Id));
        daily.SubmitActivityResponse(step1.Id, 100, transcript: "certo");
        Assert.True(daily.IsCodeStepDone(step1.Id));

        for (var i = 0; i < CodeStepProgress.MaxAttempts - 1; i++)
        {
            daily.SubmitActivityResponse(step2.Id, 0, transcript: "errado");
            Assert.False(daily.IsCodeStepDone(step2.Id));
        }
        daily.SubmitActivityResponse(step2.Id, 0, transcript: "errado");
        Assert.True(daily.IsCodeStepDone(step2.Id));
    }

    [Fact]
    public void PriorCode_IsNull_UntilThePreviousStepIsDone_ThenCarriesTheApprovedCode()
    {
        var (daily, step1, step2, _) = NewBridge();

        Assert.Equal("", daily.PriorCode(step1.Id));
        Assert.Null(daily.PriorCode(step2.Id));

        daily.SubmitActivityResponse(step1.Id, 0, transcript: "tentativa ruim");
        Assert.Null(daily.PriorCode(step2.Id));

        daily.SubmitActivityResponse(step1.Id, 100, transcript: "meu_codigo()\n\n");
        Assert.Equal("meu_codigo()", daily.PriorCode(step2.Id));
    }

    [Fact]
    public void PriorCode_CarriesTheReferenceSolution_WhenTheStepRanOutOfAttempts()
    {
        var (daily, step1, step2, _) = NewBridge();

        for (var i = 0; i < CodeStepProgress.MaxAttempts; i++)
            daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado");

        Assert.Equal("pacotes = rdpcap(arquivo)", daily.PriorCode(step2.Id));
    }

    [Fact]
    public void CodeStep_DoesNotCountInTheDailyScore()
    {
        var (daily, step1, _, voice) = NewBridge();

        daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado");
        daily.SubmitActivityResponse(voice.Id, 90, transcript: "resumo");

        Assert.Equal(90, daily.CalculateScore());
    }

    [Fact]
    public void ResetAfterTemplateRefresh_ClearsResponsesAndPenalty_OnlyBeforeCompletion()
    {
        var (daily, step1, _, voice) = NewBridge();
        daily.SubmitActivityResponse(voice.Id, 0, transcript: "nada");
        daily.SubmitActivityResponse(step1.Id, 100, transcript: "ok");

        daily.ResetAfterTemplateRefresh();

        Assert.Empty(daily.Responses);
        Assert.Equal(0, daily.PenaltyPoints);

        daily.Complete();
        Assert.Throws<DomainException>(() => daily.ResetAfterTemplateRefresh());
    }

    [Fact]
    public void ConfigureCodeStep_RequiresTheType_AndAllThreeFields()
    {
        var template = DailyFixtures.NewWeekly().Template.AddDailyTemplate(6);
        var quiz = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var step = template.AddActivity(ActivityType.CodeStep, 1, AnswerMode.FreeText, "passo");

        Assert.Throws<DomainException>(() => quiz.ConfigureCodeStep("a", "b", "c"));
        Assert.Throws<DomainException>(() => step.ConfigureCodeStep("a", " ", "c"));
    }

    [Fact]
    public void Mapper_KeepsTheStepPending_AndTheSolutionHidden_UntilTheStepIsDone()
    {
        var (daily, step1, step2, _) = NewBridge();
        daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado", justification: "saida");

        var dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Resume);
        var step1Dto = dto.Activities.Single(a => a.Id == step1.Id);
        Assert.Equal(ActivityStatus.Pending, step1Dto.Status);
        Assert.NotNull(step1Dto.CodeStep);
        Assert.False(step1Dto.CodeStep!.Done);
        Assert.Null(step1Dto.CodeStep.Solution);
        Assert.Null(step1Dto.CodeStep.ExpectedOutput);
        Assert.Equal(CodeStepProgress.MaxAttempts, step1Dto.CodeStep.MaxAttempts);
        Assert.Null(dto.Activities.Single(a => a.Id == step2.Id).CodeStep!.PriorCode);

        daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado");
        daily.SubmitActivityResponse(step1.Id, 0, transcript: "errado");

        dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Resume);
        step1Dto = dto.Activities.Single(a => a.Id == step1.Id);
        Assert.Equal(ActivityStatus.Completed, step1Dto.Status);
        Assert.Equal("pacotes = rdpcap(arquivo)\n", step1Dto.CodeStep!.Solution);
        Assert.Equal("pacotes: 54", step1Dto.CodeStep.ExpectedOutput);
        Assert.Equal("pacotes = rdpcap(arquivo)", dto.Activities.Single(a => a.Id == step2.Id).CodeStep!.PriorCode);
    }

    [Fact]
    public void ResolveScore_RefusesCodeStep_ItHasItsOwnEndpoint()
    {
        var (_, step1, _, _) = NewBridge();

        Assert.Throws<Focadu.Application.Exceptions.ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(step1, null, null, "print(1)"));
    }

    [Fact]
    public void LinkCodeRepository_OnlyAfterCompletion_WithAnHttpUrl_AndCanBeCleared()
    {
        var (daily, _, _, _) = NewBridge();

        Assert.Throws<DomainException>(() => daily.LinkCodeRepository("https://github.com/aluno/auditor"));

        daily.Complete();
        Assert.Throws<DomainException>(() => daily.LinkCodeRepository("github.com/aluno/auditor"));
        Assert.Throws<DomainException>(() => daily.LinkCodeRepository("javascript:alert(1)"));

        daily.LinkCodeRepository("  https://github.com/aluno/auditor ");
        Assert.Equal("https://github.com/aluno/auditor", daily.CodeRepositoryUrl);

        daily.LinkCodeRepository("");
        Assert.Null(daily.CodeRepositoryUrl);
    }

    [Fact]
    public void LinkCodeRepository_IsOnlyForTheCodeBridge()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, _) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();
        daily.Complete();

        Assert.Throws<DomainException>(() => daily.LinkCodeRepository("https://github.com/aluno/x"));
    }
}
