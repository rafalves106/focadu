using Focadu.Application.Dailies;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// DailyStateMapper.ToDto e internal (testado via InternalsVisibleTo em Focadu.Application) -
/// cobre o gabarito (QuizOptions[].IsCorrect, ExpectedAnswer, RoleplayNodes[].TerminalQuality)
/// ficando nulo ate a primeira ActivityResponse, e revelado depois.
/// </summary>
public class DailyStateMapperTests
{
    [Fact]
    public void Gabarito_IsHidden_BeforeFirstResponse()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var quiz = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        quiz.AddQuizOption("Certa", true);
        quiz.AddQuizOption("Errada", false);

        var cloze = template.AddActivity(ActivityType.Cloze, 1, AnswerMode.FreeText, expectedAnswer: "resposta certa");

        var roleplay = template.AddActivity(ActivityType.Roleplay, 2, AnswerMode.FreeText);
        roleplay.AddRoleplayNode("start", "Ola, como posso ajudar?", isTerminal: true, terminalQuality: TerminalQuality.Ideal);

        var dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Start);

        var quizDto = dto.Activities.Single(a => a.Id == quiz.Id);
        Assert.All(quizDto.QuizOptions, o => Assert.Null(o.IsCorrect));

        var clozeDto = dto.Activities.Single(a => a.Id == cloze.Id);
        Assert.Null(clozeDto.ExpectedAnswer);

        var roleplayDto = dto.Activities.Single(a => a.Id == roleplay.Id);
        Assert.All(roleplayDto.RoleplayNodes, n => Assert.Null(n.TerminalQuality));
    }

    [Fact]
    public void Gabarito_IsRevealed_AfterFirstResponse()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var quiz = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var correct = quiz.AddQuizOption("Certa", true);
        quiz.AddQuizOption("Errada", false);

        var cloze = template.AddActivity(ActivityType.Cloze, 1, AnswerMode.FreeText, expectedAnswer: "resposta certa");

        var roleplay = template.AddActivity(ActivityType.Roleplay, 2, AnswerMode.FreeText);
        roleplay.AddRoleplayNode("start", "Ola, como posso ajudar?", isTerminal: true, terminalQuality: TerminalQuality.Ideal);

        daily.Start();
        daily.SubmitActivityResponse(quiz.Id, 100);
        daily.SubmitActivityResponse(cloze.Id, 100);
        daily.SubmitActivityResponse(roleplay.Id, 100);

        var dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Resume);

        var quizDto = dto.Activities.Single(a => a.Id == quiz.Id);
        Assert.Equal(correct.Id, quizDto.QuizOptions.Single(o => o.IsCorrect == true).Id);

        var clozeDto = dto.Activities.Single(a => a.Id == cloze.Id);
        Assert.Equal("resposta certa", clozeDto.ExpectedAnswer);

        var roleplayDto = dto.Activities.Single(a => a.Id == roleplay.Id);
        Assert.Equal(TerminalQuality.Ideal, roleplayDto.RoleplayNodes.Single().TerminalQuality);
    }
}
