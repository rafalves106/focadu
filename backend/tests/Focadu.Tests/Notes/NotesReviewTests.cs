using Focadu.Application.Notes;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Notes;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Notes;

/// <summary>Revisao por IA do Caderninho (Fase 78): entidade e as regras puras (hash, material, dia do limite).</summary>
public class NotesReviewTests
{
    private static readonly Guid User = Guid.NewGuid();

    [Fact]
    public void Hash_SameNotes_SameHash_AndChangesOnEdit()
    {
        var daily = Guid.NewGuid();
        var a = new Note(User, daily, "JWT: payload é base64", ["jwt"]);
        var b = new Note(User, daily, "alg none", []);

        var before = NotesReviewRules.Hash([a, b]);
        Assert.Equal(before, NotesReviewRules.Hash([b, a]));

        b.Edit("alg none: validar o algoritmo no servidor", []);
        Assert.NotEqual(before, NotesReviewRules.Hash([a, b]));
    }

    [Fact]
    public void Hash_ChangesWhenANoteIsAdded()
    {
        var daily = Guid.NewGuid();
        var a = new Note(User, daily, "nota 1", []);
        var b = new Note(User, daily, "nota 2", []);

        Assert.NotEqual(NotesReviewRules.Hash([a]), NotesReviewRules.Hash([a, b]));
    }

    [Fact]
    public void Review_WithoutNotes_Throws()
    {
        var ex = Assert.Throws<DomainException>(() => new NotesReview(User, Guid.NewGuid(), "abc", 0, "bom", "falta", "material", DateTime.UtcNow));
        Assert.Equal("sem_notas", ex.Code);
    }

    [Fact]
    public void Review_ClipsLongTexts()
    {
        var review = new NotesReview(User, Guid.NewGuid(), "abc", 1, new string('x', 5000), "falta", "material", DateTime.UtcNow);
        Assert.Equal(NotesReview.MaxTextLength, review.Strengths.Length);
    }

    [Fact]
    public void Material_UsesReadingTitleBodyAndVoicePrompt()
    {
        var weekly = DailyFixtures.NewWeekly(2);
        var reading = weekly.Template.AddCuratedContent(CuratedContentType.Reading, "JWT: tokens autocontidos", bodyText: "### Assinatura\nO servidor fixa o algoritmo.");
        var template = weekly.Template.AddDailyTemplate(8);
        template.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        template.AddActivity(ActivityType.VoiceSummary, 1, AnswerMode.MultipleChoice, prompt: "Explique por que alg none é perigoso.", contentId: reading.Id);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var (title, material) = NotesReviewRules.Material(weekly, daily.Id);

        Assert.Equal("Semana 2 · Dia 8 — JWT: tokens autocontidos", title);
        Assert.Contains("O servidor fixa o algoritmo.", material);
        Assert.Contains("Explique por que alg none é perigoso.", material);
    }

    [Fact]
    public void Material_OfReinforcement_ComesFromTheSourceDay()
    {
        var weekly = DailyFixtures.NewWeekly();
        var reading = weekly.Template.AddCuratedContent(CuratedContentType.Reading, "Cookies", bodyText: "SameSite contra CSRF.");
        var template = weekly.Template.AddDailyTemplate(7);
        template.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        var quizzes = Enumerable.Range(1, 3).Select(i => template.AddActivity(ActivityType.Quiz, i, AnswerMode.MultipleChoice)).ToList();
        var source = weekly.AddDaily(template, DailyFixtures.Today);
        source.Start();
        foreach (var q in quizzes) source.SubmitActivityResponse(q.Id, 0);
        var reinforcement = weekly.CreateDailyReinforcement(source.Id, DailyFixtures.Today);

        var (title, material) = NotesReviewRules.Material(weekly, reinforcement.Id);

        Assert.Equal("Semana 1 · Dia 7 — Cookies (reforço)", title);
        Assert.Contains("SameSite contra CSRF.", material);
    }

    [Fact]
    public void StartOfTodayUtc_IsLocalMidnight()
    {
        var today = new DateOnly(2026, 9, 27);
        var start = NotesReviewRules.StartOfTodayUtc(today);

        Assert.Equal(DateTimeKind.Utc, start.Kind);
        Assert.Equal(today.ToDateTime(TimeOnly.MinValue), start.ToLocalTime());
    }
}
