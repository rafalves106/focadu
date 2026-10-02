using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Users;
using Xunit;

namespace Focadu.Tests.Users;

/// <summary>Reset de usuarios (plano de curadoria, 02/10/2026): destrutivo, entao dry-run por padrao e backup afirmado.</summary>
public class ResetUsersUseCaseTests
{
    [Theory]
    [InlineData(false, false, ResetMode.DryRun)]
    [InlineData(false, true, ResetMode.DryRun)]
    [InlineData(true, false, ResetMode.Refuse)]
    [InlineData(true, true, ResetMode.Execute)]
    public void Decide_NeverDeletesWithoutConfirmAndBackup(bool confirm, bool backup, ResetMode expected) =>
        Assert.Equal(expected, ResetUsersUseCase.Decide(confirm, backup));

    private sealed class RecordingService : IUserResetService
    {
        public string? PlannedEmail;
        public string? ExecutedEmail;
        private static UserResetPlan Plan(string email) => new(email, Guid.NewGuid(), 3, [], []);
        public Task<UserResetPlan> PlanAsync(string keepEmail, CancellationToken cancellationToken = default) { PlannedEmail = keepEmail; return Task.FromResult(Plan(keepEmail)); }
        public Task<UserResetPlan> ExecuteAsync(string keepEmail, CancellationToken cancellationToken = default) { ExecutedEmail = keepEmail; return Task.FromResult(Plan(keepEmail)); }
    }

    [Fact]
    public async Task WithoutConfirm_OnlyPlans_AndNormalizesTheEmail()
    {
        var service = new RecordingService();
        var result = await new ResetUsersUseCase(service).ExecuteAsync("  Dono@Teste.COM ", confirm: false, backupDone: true);

        Assert.False(result.Executed);
        Assert.Equal("dono@teste.com", service.PlannedEmail);
        Assert.Null(service.ExecutedEmail);
    }

    [Fact]
    public async Task ConfirmWithoutBackup_IsRefusedAndNothingRuns()
    {
        var service = new RecordingService();
        var ex = await Assert.ThrowsAsync<ValidationException>(() => new ResetUsersUseCase(service).ExecuteAsync("dono@teste.com", confirm: true, backupDone: false));

        Assert.Equal("backup_obrigatorio", ex.Code);
        Assert.Null(service.PlannedEmail);
        Assert.Null(service.ExecutedEmail);
    }

    [Fact]
    public async Task ConfirmWithBackup_Executes()
    {
        var service = new RecordingService();
        var result = await new ResetUsersUseCase(service).ExecuteAsync("dono@teste.com", confirm: true, backupDone: true);

        Assert.True(result.Executed);
        Assert.Equal("dono@teste.com", service.ExecutedEmail);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task WithoutTheEmailToKeep_IsRefused(string? email) =>
        Assert.Equal("manter_obrigatorio",
            (await Assert.ThrowsAsync<ValidationException>(() => new ResetUsersUseCase(new RecordingService()).ExecuteAsync(email, true, true))).Code);
}
