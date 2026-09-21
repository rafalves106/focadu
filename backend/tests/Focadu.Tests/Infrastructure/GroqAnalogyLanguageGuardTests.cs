using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Infrastructure.Services;

namespace Focadu.Tests.Infrastructure;

/// <summary>
/// Fase 48: guarda de idioma de GroqAnalogyGenerationService (internal, testado via InternalsVisibleTo em
/// Focadu.Infrastructure). O modelo as vezes responde em ingles mesmo pedindo portugues - como
/// PersonalizedAnalogy nunca e reavaliado depois de gravado, uma resposta em ingles precisa ser
/// rejeitada ANTES de virar cache. As amostras em ingles abaixo sao as respostas reais que a producao
/// gerou pro dia 5 (leitura de sniffing de rede) em 2026-09-21.
/// </summary>
public class GroqAnalogyLanguageGuardTests
{
    private const string EnglishReal1 =
        "Imagine a receptionist who only accepts packages addressed to him; the others are left on the desk. " +
        "When placed in 'open all' mode, he hands every arriving package to the manager, no matter the label. " +
        "libpcap is the manager’s tray that receives all packages with timestamp and size.";

    private const string EnglishReal2 =
        "Opening an envelope shows the sender’s and recipient’s addresses, the postmark, and the letter inside—just like " +
        "a captured packet reveals Ethernet, IP, transport headers and payload. If the letter is written in plain language, " +
        "anyone can read it; if it’s coded, only the intended reader understands.";

    private const string Portuguese1 =
        "Um hub age como um alto-falante no corredor: qualquer mensagem que chega a ele é reproduzida simultaneamente em todas " +
        "as salas. Um switch funciona como um recepcionista que consulta uma lista de quem está em cada sala e entrega a " +
        "mensagem apenas à porta correta.";

    private const string PortugueseWithEnglishTerms =
        "ARP spoofing é como alguém falsificar um crachá de entrega, dizendo que o endereço dele é o do correio principal, " +
        "e assim todas as correspondências passam por ele antes do destino. É o clássico man-in-the-middle, visto pela " +
        "libpcap como tráfego normal.";

    private const string PortugueseWithQuotedDialogue =
        "Numa ligação, você diz \"alô, está me ouvindo?\", o outro responde \"estou ouvindo, e você?\" e você confirma. " +
        "Só depois desses três passos o canal está aberto nos dois sentidos.";

    [Fact]
    public void LooksEnglish_DetectsTheRealEnglishResponsesFromProduction()
    {
        Assert.True(GroqAnalogyGenerationService.LooksEnglish(EnglishReal1));
        Assert.True(GroqAnalogyGenerationService.LooksEnglish(EnglishReal2));
    }

    [Fact]
    public void LooksEnglish_AcceptsPortugueseIncludingEnglishTechnicalTerms()
    {
        Assert.False(GroqAnalogyGenerationService.LooksEnglish(Portuguese1));
        Assert.False(GroqAnalogyGenerationService.LooksEnglish(PortugueseWithEnglishTerms));
        Assert.False(GroqAnalogyGenerationService.LooksEnglish(PortugueseWithQuotedDialogue));
    }

    [Fact]
    public void LooksEnglish_IgnoresEmptyAndVeryShortText()
    {
        Assert.False(GroqAnalogyGenerationService.LooksEnglish(""));
        Assert.False(GroqAnalogyGenerationService.LooksEnglish("the"));
        Assert.False(GroqAnalogyGenerationService.LooksEnglish("Man-in-the-Middle"));
    }

    [Fact]
    public void ParseAnalogies_RejectsAnEnglishResponse_SoNothingGetsCached()
    {
        var json = JsonSerializer.Serialize(new { analogies = new[] { Portuguese1, EnglishReal1 } });

        var ex = Assert.Throws<ExternalServiceException>(() => GroqAnalogyGenerationService.ParseAnalogies(json, 2));

        Assert.Equal("analogias_ia_idioma_invalido", ex.Code);
    }

    [Fact]
    public void ParseAnalogies_AcceptsAPortugueseResponse()
    {
        var json = JsonSerializer.Serialize(new { analogies = new[] { Portuguese1, PortugueseWithEnglishTerms } });

        var result = GroqAnalogyGenerationService.ParseAnalogies(json, 2);

        Assert.Equal(2, result.Count);
        Assert.Equal(Portuguese1, result[0]);
    }

    [Fact]
    public void ParseAnalogies_StillRejectsAWrongCount_WithTheFormatErrorCode()
    {
        var json = JsonSerializer.Serialize(new { analogies = new[] { Portuguese1 } });

        var ex = Assert.Throws<ExternalServiceException>(() => GroqAnalogyGenerationService.ParseAnalogies(json, 3));

        Assert.Equal("analogias_ia_formato_invalido", ex.Code);
    }
}
