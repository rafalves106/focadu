using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Audio sem fala, transcricao quebrada e revisao da transcricao que muda o que o aluno disse (casos reais de 17/11/2026).</summary>
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

    [Theory]
    [InlineData(" ... ...", 40.4)] // caso real de 23/11/2026: 40 s de fala, nota 0
    [InlineData("", 12)]
    [InlineData("…", 3)]
    [InlineData("Então... é... tipo...", 40)]
    public void IsGarbled_TrueWhenTextCannotBeTheSpeech(string text, double seconds) =>
        Assert.True(GroqAudioTranscriptionService.IsGarbled(text, seconds));

    [Theory]
    [InlineData("checklist", 2)]
    [InlineData("O P3 diz que eu devo seguir os testes do guia sem adaptar ao projeto.", 6)]
    [InlineData("De valores pra entender o que dessas falhas podem virar dinheiro.", 28)]
    public void IsGarbled_FalseForRealAnswer(string text, double seconds) =>
        Assert.False(GroqAudioTranscriptionService.IsGarbled(text, seconds));

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
