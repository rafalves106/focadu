using Focadu.Application.Ports;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Fase 79: na ponte "code comigo" o chat rapido nao usa analogia de interesse e nao entrega o passo.</summary>
public class GroqStudyAssistantPromptTests
{
    [Fact]
    public void CodeBridge_AddsTheNoSolutionRule()
    {
        var message = GroqStudyAssistantService.BuildContextSystemMessage(
            new StudyAssistantRequest("como leio o qname?", "Dia 6 - Passo 3", CodeBridge: true));

        Assert.NotNull(message);
        Assert.Contains("code comigo", message);
        Assert.Contains("não escreva a solução do passo", message);
    }

    [Fact]
    public void OutsideTheBridge_KeepsThePersonalization_WithoutTheBridgeRule()
    {
        var message = GroqStudyAssistantService.BuildContextSystemMessage(
            new StudyAssistantRequest("o que e DNS?", null, UserInterests: ["futebol"]));

        Assert.NotNull(message);
        Assert.Contains("futebol", message);
        Assert.DoesNotContain("code comigo", message);
    }
}
