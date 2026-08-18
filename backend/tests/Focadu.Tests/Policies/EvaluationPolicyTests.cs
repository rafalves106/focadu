using Focadu.Domain.Policies;
using Xunit;

namespace Focadu.Tests.Policies;

public class EvaluationPolicyTests
{
    [Fact]
    public void Thresholds_MatchSpecification()
    {
        Assert.Equal(80, EvaluationPolicy.PassingScore);
        Assert.Equal(3, EvaluationPolicy.DailyPenaltyThreshold);
        Assert.Equal(2, EvaluationPolicy.WeeklyWeakDaysThreshold);
    }
}
