using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class ModulePublicationTests
{
    [Fact]
    public void StartPublication_CreatesWithPendingStatus()
    {
        var weekly = DailyFixtures.NewWeekly();

        var publication = weekly.StartPublication();

        Assert.Equal(PublicationStatus.Pending, publication.Status);
        Assert.Null(publication.Platform);
    }

    [Fact]
    public void StartPublication_IsIdempotent()
    {
        var weekly = DailyFixtures.NewWeekly();

        var first = weekly.StartPublication();
        first.GenerateDraft("rascunho");
        var second = weekly.StartPublication();

        Assert.Same(first, second);
        Assert.Equal("rascunho", weekly.Publication?.GeneratedDraft);
    }

    [Fact]
    public void Submit_SetsPlatformUrlAndStatus()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();

        publication.Submit(PublicationPlatform.LinkedIn, "https://linkedin.com/posts/x");

        Assert.Equal(PublicationStatus.Submitted, publication.Status);
        Assert.Equal(PublicationPlatform.LinkedIn, publication.Platform);
        Assert.Equal("https://linkedin.com/posts/x", publication.SubmittedUrl);
        Assert.NotNull(publication.SubmittedAt);
    }

    [Fact]
    public void Submit_WithoutUrl_Throws()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();

        Assert.Throws<DomainException>(() => publication.Submit(PublicationPlatform.GitHub, ""));
    }

    [Fact]
    public void Submit_AfterValidated_Throws()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();
        publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/x");
        publication.MarkValidated();

        var ex = Assert.Throws<DomainException>(() => publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/y"));
        Assert.Equal("publicacao_ja_validada", ex.Code);
    }

    [Fact]
    public void Submit_AfterFailed_AllowsRetry()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();
        publication.Submit(PublicationPlatform.LinkedIn, "https://naolinkedin.com/x");
        publication.MarkFailed("URL invalida.");

        publication.Submit(PublicationPlatform.LinkedIn, "https://linkedin.com/posts/x");

        Assert.Equal(PublicationStatus.Submitted, publication.Status);
        Assert.Null(publication.ValidationError);
    }

    [Fact]
    public void MarkValidated_WithoutSubmit_Throws()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();

        Assert.Throws<DomainException>(() => publication.MarkValidated());
    }

    [Fact]
    public void MarkValidated_SetsStatusAndTimestamp()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();
        publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/x");

        publication.MarkValidated();

        Assert.Equal(PublicationStatus.Validated, publication.Status);
        Assert.NotNull(publication.ValidatedAt);
    }

    [Fact]
    public void MarkFailed_SetsStatusAndReason()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();
        publication.Submit(PublicationPlatform.LinkedIn, "https://naolinkedin.com/x");

        publication.MarkFailed("URL não parece ser um post do LinkedIn válido.");

        Assert.Equal(PublicationStatus.Failed, publication.Status);
        Assert.Equal("URL não parece ser um post do LinkedIn válido.", publication.ValidationError);
    }

    [Fact]
    public void GenerateDraft_WithEmptyText_Throws()
    {
        var publication = DailyFixtures.NewWeekly().StartPublication();

        Assert.Throws<DomainException>(() => publication.GenerateDraft(""));
    }
}
