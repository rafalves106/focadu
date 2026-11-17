using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Audio sem fala e revisao da transcricao que muda o que o aluno disse (casos reais de 17/11/2026).</summary>
public class VoiceTranscriptGuardTests
{
    [Theory]
    [InlineData(" you")]
    [InlineData("Thank you.")]
    [InlineData("Obrigado.")]
    [InlineData("Legendas pela comunidade Amara.org")]
    public void IsNoSpeech_RecognizesWhisperHallucinations(string text) =>
        Assert.True(GroqAudioTranscriptionService.IsNoSpeech(text, null));

    [Fact]
    public void IsNoSpeech_TrueWhenEverySegmentIsSilent() =>
        Assert.True(GroqAudioTranscriptionService.IsNoSpeech(
            "Algo qualquer", [new(0.9), new(0.75)]));

    [Fact]
    public void IsNoSpeech_FalseForRealAnswer() =>
        Assert.False(GroqAudioTranscriptionService.IsNoSpeech(
            "O P3 diz que eu devo seguir os testes do guia sem adaptar ao projeto.", [new(0.9), new(0.02)]));

    [Fact]
    public void RawTranscriptNote_EmptyWhenRevisionChangedNothing() =>
        Assert.Equal(string.Empty, GroqContentEvaluationService.RawTranscriptNote(" O P3 diz ", "O P3 diz"));

    [Fact]
    public void RawTranscriptNote_ShowsRawTextWhenRevisionChangedIt()
    {
        var note = GroqContentEvaluationService.RawTranscriptNote("O P3 diz", "O P1 diz");

        Assert.Contains("O P3 diz", note);
        Assert.Contains("nunca cobre o aluno", note);
    }
}
