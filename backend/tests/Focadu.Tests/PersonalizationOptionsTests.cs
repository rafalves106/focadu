using Focadu.Application.Shared;
using Xunit;

namespace Focadu.Tests;

/// <summary>Plano de curadoria (02/10/2026): a analogia "Pra voce" fica desligada por configuracao, sem apagar o codigo.</summary>
public class PersonalizationOptionsTests
{
    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("false", false)]
    [InlineData("qualquer coisa", false)]
    [InlineData("true", true)]
    [InlineData("True", true)]
    public void FromSetting_IsOffUnlessExplicitlyTrue(string? setting, bool expected) =>
        Assert.Equal(expected, PersonalizationOptions.FromSetting(setting).AnalogiesEnabled);

    [Fact]
    public void WhenOff_NoProfileDataReachesAPrompt()
    {
        var off = PersonalizationOptions.FromSetting("false");
        Assert.Null(off.Interests(["motos", "jogos"]));
        Assert.Null(off.Notes("gosta de carros"));
        Assert.Null(PersonalizationPromptBuilder.BuildInstruction(off.Interests(["motos"]), off.Notes("x")));
    }

    [Fact]
    public void WhenOn_ProfileDataPassesThrough()
    {
        var on = PersonalizationOptions.FromSetting("true");
        Assert.Equal(["motos"], on.Interests(["motos"]));
        Assert.Equal("x", on.Notes("x"));
        Assert.NotNull(PersonalizationPromptBuilder.BuildInstruction(on.Interests(["motos"]), null));
    }
}
