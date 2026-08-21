using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// SubmitActivityResponseUseCase.ResolveScore e a unica logica que decide o Score de uma resposta
/// (todo tipo de atividade, desde a Fase 4) - testada direto (internal, via InternalsVisibleTo em
/// Focadu.Application) sem precisar de fakes de repositorio, ja que so depende de objetos de
/// dominio. Fase 13: DailyActivity so existe dentro de um DailyTemplate agora (curriculo) - estes
/// testes nunca precisaram de uma Daily-instancia de verdade, so da definicao da atividade.
/// </summary>
public class SubmitActivityResponseScoreTests
{
    [Fact]
    public void Quiz_SelectedCorrectOption_ScoresFull()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var correct = activity.AddQuizOption("Certa", true);
        activity.AddQuizOption("Errada", false);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, correct.Id, null, null);

        Assert.Equal(100, score);
    }

    [Fact]
    public void WordMatch_SelectedWrongOption_ScoresZero()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.WordMatch, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);
        var wrong = activity.AddQuizOption("Errada", false);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, wrong.Id, null, null);

        Assert.Equal(0, score);
    }

    [Fact]
    public void Quiz_WithoutSelectedOptionId_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, null, null, null));

        Assert.Equal("selected_option_id_obrigatorio", ex.Code);
    }

    [Fact]
    public void Quiz_SelectedOptionId_FromAnotherActivity_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);
        var otherActivity = template.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var otherOption = otherActivity.AddQuizOption("De outra atividade", true);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, otherOption.Id, null, null));

        Assert.Equal("selected_option_id_invalido", ex.Code);
    }

    [Fact]
    public void ClozeMultipleChoice_UsesSameSelectedOptionPathAsQuiz()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Cloze, 0, AnswerMode.MultipleChoice);
        var correct = activity.AddQuizOption("GET", true);
        activity.AddQuizOption("DELETE", false);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, correct.Id, null, null);

        Assert.Equal(100, score);
    }

    [Theory]
    [InlineData("console.log(x)", true)]
    [InlineData("  console.log(x)  ", true)]
    [InlineData("CONSOLE.LOG(X)", true)]
    [InlineData("console.log(y)", false)]
    public void ClozeFreeText_ComparesTranscriptAgainstExpectedAnswer_TrimmedAndCaseInsensitive(string transcript, bool expectedCorrect)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Cloze, 0, AnswerMode.FreeText, expectedAnswer: "console.log(x)");

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, null, null, transcript);

        Assert.Equal(expectedCorrect ? 100 : 0, score);
    }

    [Fact]
    public void ClozeFreeText_WithoutTranscript_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Cloze, 0, AnswerMode.FreeText, expectedAnswer: "x");

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, null, null, null));

        Assert.Equal("transcript_obrigatorio", ex.Code);
    }

    [Theory]
    [InlineData(TerminalQuality.Ideal, 100)]
    [InlineData(TerminalQuality.Suboptimal, 60)]
    [InlineData(TerminalQuality.Poor, 20)]
    public void Roleplay_TerminalNodeReached_ScoresFromTerminalQuality(TerminalQuality quality, int expectedScore)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Roleplay, 0, AnswerMode.FreeText);
        var terminalNode = activity.AddRoleplayNode("end", "Fim de papo.", isTerminal: true, terminalQuality: quality);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, null, terminalNode.Id, null);

        Assert.Equal(expectedScore, score);
    }

    [Fact]
    public void Roleplay_WithoutSelectedNodeId_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Roleplay, 0, AnswerMode.FreeText);
        activity.AddRoleplayNode("end", "Fim.", isTerminal: true, terminalQuality: TerminalQuality.Ideal);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, null, null, null));

        Assert.Equal("selected_roleplay_node_id_obrigatorio", ex.Code);
    }

    // Reading/Video (Fase 7): sem avaliacao - concluir a etapa sempre pontua 100 (sempre Passed,
    // nunca penaliza). Ver SubmitActivityResponseUseCase.ResolveScore.
    [Theory]
    [InlineData(ActivityType.Reading)]
    [InlineData(ActivityType.Video)]
    public void ReadingOrVideo_AlwaysScoresFull(ActivityType type)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(type, 0, AnswerMode.MultipleChoice, contentId: Guid.NewGuid());

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, null, null, null);

        Assert.Equal(100, score);
    }

    [Fact]
    public void Roleplay_SelectedNode_NotTerminal_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var activity = template.AddActivity(ActivityType.Roleplay, 0, AnswerMode.FreeText);
        var startNode = activity.AddRoleplayNode("start", "Ola.");

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, null, startNode.Id, null));

        Assert.Equal("selected_roleplay_node_nao_terminal", ex.Code);
    }
}
