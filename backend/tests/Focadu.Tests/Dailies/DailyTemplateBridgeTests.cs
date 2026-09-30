using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Dailies;

public class DailyTemplateBridgeTests
{
    private static WeeklyTemplate Week() => new(Guid.NewGuid(), 1, "Semana de teste");

    [Fact]
    public void IsBridge_NormalDay_IsFalse()
    {
        var day = Week().AddDailyTemplate(1);
        day.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: Guid.NewGuid());

        Assert.False(day.IsBridge);
    }

    [Fact]
    public void IsBridge_LanguageVariant_IsTrue()
    {
        var day = Week().AddDailyTemplate(6, ProjectLanguage.Python);

        Assert.True(day.IsBridge);
    }

    [Fact]
    public void IsBridge_CodeStepDayWithoutLanguage_IsTrue()
    {
        // Ponte dos cursos sem Projeto Semanal (Linux): a linguagem mora na semana, o dia fica sem Language.
        var day = Week().AddDailyTemplate(6);
        day.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: Guid.NewGuid());
        day.AddActivity(ActivityType.CodeStep, 1, AnswerMode.FreeText, "passo 1");

        Assert.True(day.IsBridge);
        Assert.Null(day.Language);
    }
}
