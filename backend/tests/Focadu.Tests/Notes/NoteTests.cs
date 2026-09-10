using Focadu.Domain.Exceptions;
using Focadu.Domain.Notes;
using Focadu.Domain.Policies;
using Xunit;

namespace Focadu.Tests.Notes;

public class NoteTests
{
    [Fact]
    public void Create_SetsFieldsAndTimestamps_TrimsContentAndTags()
    {
        var userId = Guid.NewGuid();
        var dailyId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var note = new Note(userId, dailyId, "  minha anotacao  ", new[] { " insight ", "duvida" });

        Assert.Equal(userId, note.UserId);
        Assert.Equal(dailyId, note.DailyId);
        Assert.Equal("minha anotacao", note.Content);
        Assert.Equal(new[] { "insight", "duvida" }, note.Tags);
        Assert.InRange(note.CreatedAt, before, DateTime.UtcNow);
        Assert.Equal(note.CreatedAt, note.UpdatedAt);
    }

    [Fact]
    public void Create_EmptyContent_Throws()
    {
        var ex = Assert.Throws<DomainException>(() => new Note(Guid.NewGuid(), Guid.NewGuid(), "   ", Array.Empty<string>()));
        Assert.Equal("nota_vazia", ex.Code);
    }

    [Fact]
    public void Create_ContentExceedsMaxLength_Throws()
    {
        var tooLong = new string('a', NotePolicy.MaxContentLength + 1);

        var ex = Assert.Throws<DomainException>(() => new Note(Guid.NewGuid(), Guid.NewGuid(), tooLong, Array.Empty<string>()));
        Assert.Equal("nota_muito_longa", ex.Code);
    }

    [Fact]
    public void Create_DedupesTagsCaseInsensitive_KeepsFirstCasing()
    {
        var note = new Note(Guid.NewGuid(), Guid.NewGuid(), "conteudo", new[] { "Insight", "insight", "INSIGHT" });

        Assert.Equal(new[] { "Insight" }, note.Tags);
    }

    [Fact]
    public void Create_TooManyTags_Throws()
    {
        var tags = Enumerable.Range(0, NotePolicy.MaxTagCount + 1).Select(i => $"tag{i}");

        var ex = Assert.Throws<DomainException>(() => new Note(Guid.NewGuid(), Guid.NewGuid(), "conteudo", tags));
        Assert.Equal("notas_tags_demais", ex.Code);
    }

    [Fact]
    public void Create_TagExceedsMaxLength_Throws()
    {
        var tooLongTag = new string('a', NotePolicy.MaxTagLength + 1);

        var ex = Assert.Throws<DomainException>(() => new Note(Guid.NewGuid(), Guid.NewGuid(), "conteudo", new[] { tooLongTag }));
        Assert.Equal("tag_muito_longa", ex.Code);
    }

    [Fact]
    public void Edit_UpdatesContentAndTagsAndUpdatedAt_KeepsCreatedAt()
    {
        var note = new Note(Guid.NewGuid(), Guid.NewGuid(), "original", new[] { "tagA" });
        var createdAt = note.CreatedAt;

        note.Edit("editado", new[] { "tagB", "tagC" });

        Assert.Equal("editado", note.Content);
        Assert.Equal(new[] { "tagB", "tagC" }, note.Tags);
        Assert.Equal(createdAt, note.CreatedAt);
        Assert.True(note.UpdatedAt >= createdAt);
    }

    [Fact]
    public void Edit_EmptyContent_Throws_KeepsOriginalContent()
    {
        var note = new Note(Guid.NewGuid(), Guid.NewGuid(), "original", Array.Empty<string>());

        Assert.Throws<DomainException>(() => note.Edit("   ", Array.Empty<string>()));
        Assert.Equal("original", note.Content);
    }
}
