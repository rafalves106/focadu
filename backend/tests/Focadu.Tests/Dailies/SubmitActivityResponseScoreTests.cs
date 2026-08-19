using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// SubmitActivityResponseUseCase.ResolveScore e a unica logica que decide o Score de uma resposta
/// (Quiz/WordMatch calculado no servidor, Cloze/Roleplay ainda recebido do chamador) - testada
/// direto (internal, via InternalsVisibleTo em Focadu.Application) sem precisar de fakes de
/// repositorio, ja que so depende de objetos de dominio.
/// </summary>
public class SubmitActivityResponseScoreTests
{
    [Fact]
    public void Quiz_SelectedCorrectOption_ScoresFull()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var correct = activity.AddQuizOption("Certa", true);
        activity.AddQuizOption("Errada", false);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, score: null, selectedOptionId: correct.Id);

        Assert.Equal(100, score);
    }

    [Fact]
    public void WordMatch_SelectedWrongOption_ScoresZero()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.WordMatch, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);
        var wrong = activity.AddQuizOption("Errada", false);

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, score: null, selectedOptionId: wrong.Id);

        Assert.Equal(0, score);
    }

    [Fact]
    public void Quiz_WithoutSelectedOptionId_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, score: 100, selectedOptionId: null));

        Assert.Equal("selected_option_id_obrigatorio", ex.Code);
    }

    [Fact]
    public void Quiz_ClientSentScoreIsIgnored_ScoreIsAlwaysComputedFromOption()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var wrong = activity.AddQuizOption("Errada", false);

        // Cliente tenta forjar score:100 numa opcao errada - o Score calculado (0) prevalece.
        var score = SubmitActivityResponseUseCase.ResolveScore(activity, score: 100, selectedOptionId: wrong.Id);

        Assert.Equal(0, score);
    }

    [Fact]
    public void Quiz_SelectedOptionId_FromAnotherActivity_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        activity.AddQuizOption("Certa", true);
        var otherActivity = daily.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var otherOption = otherActivity.AddQuizOption("De outra atividade", true);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, score: null, selectedOptionId: otherOption.Id));

        Assert.Equal("selected_option_id_invalido", ex.Code);
    }

    [Fact]
    public void Cloze_UsesScoreFromCaller_UntilContentEvaluationServiceExists()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Cloze, 0, AnswerMode.FreeText, expectedAnswer: "resposta esperada");

        var score = SubmitActivityResponseUseCase.ResolveScore(activity, score: 85, selectedOptionId: null);

        Assert.Equal(85, score);
    }

    [Fact]
    public void Cloze_WithoutScore_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Cloze, 0, AnswerMode.FreeText);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, score: null, selectedOptionId: null));

        Assert.Equal("score_obrigatorio", ex.Code);
    }

    [Fact]
    public void Roleplay_ScoreOutOfRange_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var activity = daily.AddActivity(ActivityType.Roleplay, 0, AnswerMode.FreeText);

        var ex = Assert.Throws<ValidationException>(
            () => SubmitActivityResponseUseCase.ResolveScore(activity, score: 150, selectedOptionId: null));

        Assert.Equal("score_invalido", ex.Code);
    }
}
