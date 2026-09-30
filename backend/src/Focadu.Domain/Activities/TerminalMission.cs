using System.Text.Json;
using System.Text.RegularExpressions;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Como o laboratorio confere uma missao, sempre no navegador do aluno (o servidor nunca roda nem confere
/// nada - mesma decisao do laboratorio de codigo, Fase 86). Toda condicao informada precisa valer na mesma
/// conferencia, feita depois de cada comando digitado:
/// <list type="bullet">
/// <item><c>Command</c>: regex sobre o comando digitado.</item>
/// <item><c>Output</c>: regex sobre a saida desse comando.</item>
/// <item><c>Probe</c> + <c>State</c>: o laboratorio roda <c>Probe</c> em silencio (ex.: <c>stat -c %a notas.txt</c>) e
/// <c>State</c> e uma regex sobre a saida dele - confere o ESTADO do sistema, nao como o aluno chegou la.</item>
/// </list>
/// </summary>
public sealed record TerminalMissionCheck(string? Command, string? Output, string? Probe, string? State);

/// <summary>Uma missao do <see cref="Enums.ActivityType.TerminalMission"/>: enunciado, dicas fixas em dois niveis (conceito, depois comando) e o que reparar.</summary>
public sealed record TerminalMission(
    string Title, string Prompt, IReadOnlyList<string> Hints, string Note, TerminalMissionCheck Check);

/// <summary>Converte e valida a lista de missoes (texto JSON em <c>DailyActivity.TerminalMissionsJson</c> e bloco <c>missions</c> do dia-N.json).</summary>
public static class TerminalMissions
{
    public const int MaxMissions = 8;
    public const int MaxHints = 3;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static string Serialize(IReadOnlyList<TerminalMission> missions) => JsonSerializer.Serialize(missions, Json);

    public static IReadOnlyList<TerminalMission> Parse(string? json) =>
        string.IsNullOrWhiteSpace(json) ? [] : JsonSerializer.Deserialize<List<TerminalMission>>(json, Json) ?? [];

    /// <summary>Normaliza (apara textos) e valida: 1 a 8 missoes, dicas de 1 a 3, regex que compilam.</summary>
    public static IReadOnlyList<TerminalMission> Create(IEnumerable<TerminalMission>? missions)
    {
        var list = (missions ?? []).ToList();
        if (list.Count is 0 or > MaxMissions)
            throw new DomainException($"Missao no terminal precisa de 1 a {MaxMissions} missoes.", "missoes_invalidas");

        return list.Select((m, i) => Normalize(m, i + 1)).ToList();
    }

    private static TerminalMission Normalize(TerminalMission m, int number)
    {
        if (string.IsNullOrWhiteSpace(m.Title) || string.IsNullOrWhiteSpace(m.Prompt) || string.IsNullOrWhiteSpace(m.Note))
            throw new DomainException($"Missao {number}: title, prompt e note sao obrigatorios.", "missao_incompleta");

        var hints = (m.Hints ?? []).Where(h => !string.IsNullOrWhiteSpace(h)).Select(h => h.Trim()).ToList();
        if (hints.Count is 0 or > MaxHints)
            throw new DomainException($"Missao {number}: use de 1 a {MaxHints} dicas.", "missao_dicas_invalidas");

        var check = m.Check ?? throw new DomainException($"Missao {number}: falta o check.", "missao_sem_check");
        var command = Clean(check.Command);
        var output = Clean(check.Output);
        var probe = Clean(check.Probe);
        var state = Clean(check.State);
        if (command is null && output is null && state is null)
            throw new DomainException($"Missao {number}: o check precisa de command, output ou state.", "missao_sem_check");
        if ((probe is null) != (state is null))
            throw new DomainException($"Missao {number}: probe e state andam juntos.", "missao_check_invalido");

        foreach (var pattern in new[] { command, output, state })
            if (pattern is not null) EnsureRegex(pattern, number);

        return new TerminalMission(m.Title.Trim(), m.Prompt.Trim(), hints, m.Note.Trim(), new TerminalMissionCheck(command, output, probe, state));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void EnsureRegex(string pattern, int number)
    {
        try
        {
            _ = new Regex(pattern, RegexOptions.None, TimeSpan.FromSeconds(1));
        }
        catch (ArgumentException)
        {
            throw new DomainException($"Missao {number}: regex invalida ({pattern}).", "missao_regex_invalida");
        }
    }
}
