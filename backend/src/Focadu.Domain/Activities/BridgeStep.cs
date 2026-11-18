using System.Text.Json;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>Fase 113: o que uma linha marcada do codigo inicial pede ao aluno.</summary>
public enum CodeMarkKind
{
    /// <summary>A linha que o aluno completa (Fazer com ajuda).</summary>
    Lacuna = 0,

    /// <summary>A linha com o erro da armadilha da semana (Corrigir).</summary>
    Erro = 1,
}

/// <summary>Fase 113: uma linha marcada do <see cref="DailyActivity.CodeStarter"/> (1 = primeira linha do codigo inicial).</summary>
public record CodeMark(int Line, CodeMarkKind Kind);

/// <summary>
/// Fase 113: a conferencia da Focada num passo de codigo. Depois de rodar, o laboratorio roda o script de novo
/// trocando <see cref="From"/> por <see cref="To"/> (ex.: o endereco do lab pela pagina <c>/vazia</c>, que responde
/// 204) e compara com <see cref="ExpectedOutput"/>. Mostra a saida errada que o codigo com o numero fixo esconde.
/// </summary>
public record CodeCheck(string From, string To, string ExpectedOutput);

/// <summary>
/// Fase 113: ordenar linhas (Parsons) da ponte intercalada. <see cref="FixedLines"/> ficam no editor antes das
/// linhas a ordenar (ex.: a lista que o <c>for</c> percorre) e nao mexem; <see cref="Lines"/> e a ordem certa,
/// ja com o recuo.
/// </summary>
public record ParsonsPuzzle(IReadOnlyList<string> FixedLines, IReadOnlyList<string> Lines)
{
    public const int MinLines = 3;

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static ParsonsPuzzle Create(IEnumerable<string>? fixedLines, IEnumerable<string>? lines)
    {
        var fixedList = (fixedLines ?? []).Select(l => l.TrimEnd()).ToList();
        var list = (lines ?? []).Select(l => l.TrimEnd()).ToList();
        if (list.Count < MinLines)
            throw new DomainException($"Ordenar linhas precisa de pelo menos {MinLines} linhas.", "parsons_invalido");
        if (list.Any(string.IsNullOrWhiteSpace) || list.Concat(fixedList).Any(l => l.Contains('\n')))
            throw new DomainException("Cada linha do ordenar e uma linha de codigo, sem quebra e sem linha vazia.", "parsons_invalido");
        if (list.Distinct().Count() == 1)
            throw new DomainException("As linhas do ordenar precisam ser diferentes entre si.", "parsons_invalido");
        return new ParsonsPuzzle(fixedList, list);
    }

    public static ParsonsPuzzle? Parse(string? json) =>
        string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<ParsonsPuzzle>(json, Options);

    public string Serialize() => JsonSerializer.Serialize(this, Options);

    /// <summary>O trecho que o ordenar entrega pro script: as linhas fixas e as linhas na ordem certa.</summary>
    public string Code => string.Join("\n", FixedLines.Concat(Lines));

    /// <summary>
    /// As linhas na ordem em que o aluno as recebe: embaralhadas de um jeito estavel por atividade (recarregar a
    /// pagina nao troca a ordem) e nunca ja na ordem certa.
    /// </summary>
    public IReadOnlyList<string> Shuffled(Guid seed)
    {
        var random = new Random(BitConverter.ToInt32(seed.ToByteArray(), 0));
        var shuffled = Lines.OrderBy(_ => random.Next()).ToList();
        if (shuffled.SequenceEqual(Lines))
            shuffled.Reverse();
        return shuffled;
    }

    /// <summary>
    /// A ordem mandada e uma permutacao destas linhas (mesmo texto, mesma quantidade de cada uma). Linhas de texto
    /// igual sao intercambiaveis.
    /// </summary>
    public bool IsPermutation(IReadOnlyList<string> submitted) =>
        submitted.Count == Lines.Count
        && submitted.Select(l => l.TrimEnd()).OrderBy(l => l, StringComparer.Ordinal)
            .SequenceEqual(Lines.OrderBy(l => l, StringComparer.Ordinal));

    /// <summary>Por posicao: a linha mandada e a da ordem certa. Tudo certo = passou.</summary>
    public IReadOnlyList<bool> Check(IReadOnlyList<string> submitted) =>
        Lines.Select((line, i) => i < submitted.Count && submitted[i].TrimEnd() == line).ToList();

    /// <summary>Nota no servidor: 100 so com a ordem toda certa (a ordem do <c>for</c> nao tem meio certo).</summary>
    public int Score(IReadOnlyList<string> submitted) => Check(submitted).All(ok => ok) ? 100 : 0;

    /// <summary>A resposta guardada (Transcript) e as linhas na ordem mandada, uma por linha.</summary>
    public static IReadOnlyList<string> SplitAnswer(string? transcript) =>
        string.IsNullOrEmpty(transcript) ? [] : transcript.Replace("\r\n", "\n").Split('\n');
}

/// <summary>Fase 113: (de)serializacao das marcas e da conferencia guardadas em JSON na DailyActivity.</summary>
public static class BridgeStepJson
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    public static IReadOnlyList<CodeMark> ParseMarks(string? json) =>
        string.IsNullOrWhiteSpace(json) ? [] : JsonSerializer.Deserialize<List<CodeMark>>(json, Options) ?? [];

    public static string? SerializeMarks(IReadOnlyList<CodeMark> marks) =>
        marks.Count == 0 ? null : JsonSerializer.Serialize(marks, Options);

    public static CodeCheck? ParseCheck(string? json) =>
        string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<CodeCheck>(json, Options);

    public static string? SerializeCheck(CodeCheck? check) =>
        check is null ? null : JsonSerializer.Serialize(check, Options);
}
