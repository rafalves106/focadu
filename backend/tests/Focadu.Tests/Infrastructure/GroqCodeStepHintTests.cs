using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>
/// Fase 86: a dica da Focada so vale no formato de tres blocos, e o que a IA recebe do laboratorio
/// (saida, exit code, historico de comandos) entra nos prompts - da dica e da avaliacao do passo.
/// </summary>
public class GroqCodeStepHintTests
{
    private static CodeStepHintRequest NewHintRequest(string output = "", CodeStepLabRun? lab = null) => new(
        "Python", "Liste os dominios", "qname vem em bytes", "api.focadu.dev", "print(1)", "", "print(dominios)", output, lab, 1, 3);

    [Fact]
    public void ParseResult_ReadsTheThreeBlocks()
    {
        var result = GroqCodeStepHintService.ParseResult("{\"certo\": \" achou os 4 \", \"erro\": \"saiu em bytes\", \"melhorar\": \"decodifique\"}");

        Assert.Equal("achou os 4", result.Right);
        Assert.Equal("saiu em bytes", result.Wrong);
        Assert.Equal("decodifique", result.Improve);
    }

    [Theory]
    [InlineData("")]
    [InlineData("nao e json")]
    [InlineData("{\"certo\": \"a\", \"erro\": \"b\"}")]
    [InlineData("{\"certo\": \"a\", \"erro\": \" \", \"melhorar\": \"c\"}")]
    public void ParseResult_RejectsAnythingOutsideTheFormat(string raw)
    {
        Assert.Throws<ExternalServiceException>(() => GroqCodeStepHintService.ParseResult(raw));
    }

    // Solucao e dica reais da verificacao de 30/09/2026 (Linux, Dia 6, passo 1): a IA entregou a linha pronta.
    private const string Solution = "LOG=\"$1\"\necho \"requisições: $(wc -l < \"$LOG\")\"\necho \"IPs distintos: $(cut -d' ' -f1 \"$LOG\" | sort -u | wc -l)\"\n";

    [Fact]
    public void LeaksSolution_CatchesTheLineTheAiGaveAway_AndIgnoresProse()
    {
        var leaked = new CodeStepHintResult(
            "O script executou e exibiu a mensagem.",
            "Ele não usa o argumento $1 nem conta linhas ou IPs.",
            "Comece guardando LOG=\"$1\" e use wc -l < \"$LOG\" para as requisições; depois extraia o primeiro campo e conte os IPs distintos.");
        var conceptual = new CodeStepHintResult(
            "O script executou e exibiu uma mensagem.",
            "O script não usa o argumento que recebeu, então o resultado não depende do arquivo.",
            "Como você conta as linhas do arquivo que chegou como argumento? E como separa só a primeira coluna de cada linha?");

        Assert.True(GroqCodeStepHintService.LeaksSolution(leaked, Solution));
        Assert.False(GroqCodeStepHintService.LeaksSolution(conceptual, Solution));
    }

    [Fact]
    public void RedactLeaks_ReplacesOnlyTheBlockThatLeaked()
    {
        var result = new CodeStepHintResult("achou os IPs", "faltou contar", "use wc -l < \"$LOG\" nas linhas");

        var redacted = GroqCodeStepHintService.RedactLeaks(result, Solution);

        Assert.Equal("achou os IPs", redacted.Right);
        Assert.Equal("faltou contar", redacted.Wrong);
        Assert.Equal(GroqCodeStepHintService.SafeBlock, redacted.Improve);
    }

    [Fact]
    public void SystemPrompt_AllowsSyntaxHelp_ButForbidsTheSolution()
    {
        var prompt = GroqCodeStepHintService.BuildSystemPrompt("Linux");

        Assert.Contains("sintaxe é ajuda livre", prompt);
        Assert.Contains("nunca cite a solução de referência", prompt);
        Assert.Contains("Linux", prompt);
    }

    [Fact]
    public void UserPrompt_SaysWhenTheStudentHasNotRunYet_AndCarriesTheExitCode()
    {
        var notRun = GroqCodeStepHintService.BuildUserPrompt(NewHintRequest());
        Assert.Contains("ainda não rodou", notRun);
        Assert.Contains("Dica 1 de 3", notRun);

        var ran = GroqCodeStepHintService.BuildUserPrompt(NewHintRequest("Traceback...", new CodeStepLabRun(1, [])));
        Assert.Contains("Traceback...", ran);
        Assert.Contains("Código de saída da última execução: 1", ran);
    }

    [Fact]
    public void EvaluationPrompt_NamesTheLabOutput_AndTheTerminalHistory()
    {
        CodeStepEvaluationRequest Request(CodeStepLabRun? lab) => new(
            "Bash", "p", "r", "esperado", "solucao", "", "codigo", "$ bash a.sh lab\nIP: 127.0.0.1", 1, 3, Lab: lab);

        var pasted = GroqCodeStepEvaluationService.BuildUserPrompt(Request(null));
        Assert.Contains("Saída que o aluno colou do terminal", pasted);
        Assert.DoesNotContain("laboratório", pasted);

        var oneRun = GroqCodeStepEvaluationService.BuildUserPrompt(Request(new CodeStepLabRun(0, [])));
        Assert.Contains("não foi colada", oneRun);
        Assert.Contains("código de saída: 0", oneRun);

        var history = GroqCodeStepEvaluationService.BuildUserPrompt(Request(new CodeStepLabRun(2, [new CodeStepLabCommand("bash a.sh lab", "IP: 127.0.0.1")])));
        Assert.Contains("Histórico do terminal do laboratório", history);
        Assert.Contains("última execução: 2", history);
    }
}
