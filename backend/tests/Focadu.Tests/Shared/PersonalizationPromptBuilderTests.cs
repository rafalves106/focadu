using Focadu.Application.Shared;
using Xunit;

namespace Focadu.Tests.Shared;

public class PersonalizationPromptBuilderTests
{
    [Fact]
    public void BuildInstruction_NoInterestsNoNotes_ReturnsNull()
    {
        Assert.Null(PersonalizationPromptBuilder.BuildInstruction([], null));
    }

    [Fact]
    public void BuildInstruction_OnlyWhitespaceNotes_TreatedAsAbsent()
    {
        Assert.Null(PersonalizationPromptBuilder.BuildInstruction([], "   "));
    }

    [Fact]
    public void BuildInstruction_OnlyInterests_MentionsThemAndOmitsNotesSentence()
    {
        var instruction = PersonalizationPromptBuilder.BuildInstruction(["motos esportivas", "violão"], null);

        Assert.NotNull(instruction);
        Assert.Contains("motos esportivas, violão", instruction);
        Assert.DoesNotContain("Notas adicionais", instruction);
    }

    [Fact]
    public void BuildInstruction_OnlyNotes_MentionsThemAndOmitsInterestsSentence()
    {
        var instruction = PersonalizationPromptBuilder.BuildInstruction([], "  gosta de exemplos bem diretos  ");

        Assert.NotNull(instruction);
        Assert.Contains("gosta de exemplos bem diretos", instruction);
        Assert.DoesNotContain("Interesses do aluno", instruction);
    }

    [Fact]
    public void BuildInstruction_BothInterestsAndNotes_IncludesBothSentences()
    {
        var instruction = PersonalizationPromptBuilder.BuildInstruction(["JDM/tuning"], "prefere respostas curtas");

        Assert.NotNull(instruction);
        Assert.Contains("JDM/tuning", instruction);
        Assert.Contains("prefere respostas curtas", instruction);
    }
}
