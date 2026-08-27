using Focadu.Domain.Content;
using Focadu.Domain.Exceptions;
using Xunit;

namespace Focadu.Tests.Content;

public class PersonalizedAnalogyTests
{
    [Fact]
    public void Create_SetsUserContentAndSectionsInOrder()
    {
        var userId = Guid.NewGuid();
        var contentId = Guid.NewGuid();

        var analogy = new PersonalizedAnalogy(userId, contentId, ["  Assim como trocar a corrente da moto, ...  ", "Segunda analogia."]);

        Assert.Equal(userId, analogy.UserId);
        Assert.Equal(contentId, analogy.CuratedContentId);
        Assert.Equal(2, analogy.Sections.Count);
        Assert.Equal(0, analogy.Sections[0].SectionIndex);
        Assert.Equal("Assim como trocar a corrente da moto, ...", analogy.Sections[0].Text);
        Assert.Equal(1, analogy.Sections[1].SectionIndex);
        Assert.Equal("Segunda analogia.", analogy.Sections[1].Text);
    }

    [Fact]
    public void Create_WithoutAnySection_Throws()
    {
        Assert.Throws<DomainException>(() => new PersonalizedAnalogy(Guid.NewGuid(), Guid.NewGuid(), []));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankSectionText_Throws(string? text)
    {
        Assert.Throws<DomainException>(() => new PersonalizedAnalogy(Guid.NewGuid(), Guid.NewGuid(), [text!]));
    }
}
