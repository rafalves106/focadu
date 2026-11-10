using Focadu.Application.Dailies;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Aquecimento (plano de curadoria, 02/10/2026): 2 perguntas de dias anteriores, sorteadas com semente no dia atual para
/// rodar de um dia pro outro; o que o aluno errou tem mais chance de voltar, sem lugar garantido.
/// </summary>
public class WarmupSelectorTests
{
    private static WarmupCandidate Candidate(Guid dailyId, int week, int day, int score, int order = 0)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(day);
        var activity = template.AddActivity(ActivityType.Quiz, order, AnswerMode.MultipleChoice, $"pergunta s{week} d{day} #{order}");
        return new WarmupCandidate(dailyId, activity, week, day, score);
    }

    private static List<WarmupCandidate> OnePerDay(int days, int score = 100) =>
        Enumerable.Range(1, days).Select(d => Candidate(Guid.NewGuid(), 1 + (d - 1) / 6, 1 + (d - 1) % 6, score)).ToList();

    [Fact]
    public void Select_SameSeed_GivesTheSameQuestions_WhateverTheInputOrder()
    {
        var candidates = OnePerDay(10);
        var reversed = Enumerable.Reverse(candidates).ToList();

        Assert.Equal(WarmupSelector.Select(candidates, 2, seed: 42), WarmupSelector.Select(reversed, 2, seed: 42));
    }

    [Fact]
    public void Select_RotatesAcrossDays_InsteadOfRepeatingTheSamePair()
    {
        var candidates = OnePerDay(12);

        var seen = Enumerable.Range(0, 30).SelectMany(seed => WarmupSelector.Select(candidates, 2, seed)).Distinct().Count();

        Assert.True(seen >= 10, $"so {seen} perguntas diferentes em 30 dias");
    }

    [Fact]
    public void Select_MissedQuestionsComeBackMoreOften_ButDoNotTakeEveryDay()
    {
        var candidates = OnePerDay(10);
        var missed = Candidate(Guid.NewGuid(), 2, 6, 0);
        candidates.Add(missed);

        var days = Enumerable.Range(0, 200).Count(seed => WarmupSelector.Select(candidates, 2, seed).Contains(missed));

        // Sem peso, cada pergunta entra em ~2/11 dos dias (~36 de 200); com o dobro de chance, bem mais, mas nao todo dia.
        Assert.InRange(days, 50, 150);
    }

    [Fact]
    public void Select_UsesEachSourceDayOnceBeforeRepeatingOne()
    {
        var sameDay = Guid.NewGuid();
        var q1 = Candidate(sameDay, 1, 1, 100, order: 0);
        var q2 = Candidate(sameDay, 1, 1, 100, order: 1);
        var otherDay = Candidate(Guid.NewGuid(), 1, 2, 100);

        foreach (var seed in Enumerable.Range(0, 20))
        {
            var picked = WarmupSelector.Select([q1, q2, otherDay], 2, seed);
            Assert.Contains(otherDay, picked);
        }
    }

    [Fact]
    public void Select_RepeatsADayWhenThereIsNoOtherChoice()
    {
        var sameDay = Guid.NewGuid();
        var q1 = Candidate(sameDay, 1, 1, 10, order: 0);
        var q2 = Candidate(sameDay, 1, 1, 20, order: 1);

        Assert.Equal(2, WarmupSelector.Select([q2, q1], 2, seed: 7).Count);
    }

    [Fact]
    public void Select_WithFewerCandidatesThanRequested_ReturnsWhatThereIs()
    {
        Assert.Empty(WarmupSelector.Select([], 2, seed: 1));
        var only = Candidate(Guid.NewGuid(), 1, 1, 50);
        Assert.Equal([only], WarmupSelector.Select([only], 2, seed: 1));
    }
}
