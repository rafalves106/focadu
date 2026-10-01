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

/// <summary>
/// Uma missao do <see cref="Enums.ActivityType.TerminalMission"/>: enunciado, dicas fixas em dois niveis (conceito, depois
/// comando) e o que reparar. Terminal v3 (01/10/2026): <c>Situation</c> (o porque), <c>Goal</c> (o que o aluno vai ver
/// quando der certo) e <c>Steps</c> (so em missao de mais de um comando) - opcionais pra quem curou antes.
/// </summary>
public sealed record TerminalMission(
    string Title, string Prompt, IReadOnlyList<string> Hints, string Note, TerminalMissionCheck Check,
    string? Situation = null, string? Goal = null, IReadOnlyList<string>? Steps = null);

/// <summary>Um item da cola "Comandos de hoje" do terminal v3: a sintaxe generica e o que ela faz. Vale pra atividade inteira.</summary>
public sealed record TerminalCommand(string Command, string Description);

/// <summary>
/// Converte e valida as missoes (texto JSON em <c>DailyActivity.TerminalMissionsJson</c> e bloco <c>missions</c> do dia-N.json).
/// Desde o terminal v3 o JSON guardado e <c>{"missions": [...], "commands": [...]}</c>; o formato antigo (so a lista de
/// missoes) continua sendo lido - o proximo seed regrava no formato novo.
/// </summary>
public static class TerminalMissions
{
    public const int MaxMissions = 8;
    public const int MaxHints = 3;
    public const int MaxCommands = 12;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private sealed record Stored(List<TerminalMission>? Missions, List<TerminalCommand>? Commands);

    public static string Serialize(IReadOnlyList<TerminalMission> missions, IReadOnlyList<TerminalCommand>? commands = null) =>
        JsonSerializer.Serialize(new Stored(missions.ToList(), (commands ?? []).ToList()), Json);

    public static IReadOnlyList<TerminalMission> Parse(string? json) => Read(json).Missions ?? [];

    public static IReadOnlyList<TerminalCommand> ParseCommands(string? json) => Read(json).Commands ?? [];

    private static Stored Read(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Stored([], []);
        return json.TrimStart().StartsWith('[')
            ? new Stored(JsonSerializer.Deserialize<List<TerminalMission>>(json, Json), [])
            : JsonSerializer.Deserialize<Stored>(json, Json) ?? new Stored([], []);
    }

    /// <summary>Apara e valida a cola de comandos: ate 12 itens, comando e descricao obrigatorios.</summary>
    public static IReadOnlyList<TerminalCommand> CreateCommands(IEnumerable<TerminalCommand>? commands)
    {
        var list = (commands ?? []).ToList();
        if (list.Count > MaxCommands)
            throw new DomainException($"Missao no terminal: use ate {MaxCommands} comandos na cola.", "comandos_invalidos");
        if (list.Any(c => string.IsNullOrWhiteSpace(c.Command) || string.IsNullOrWhiteSpace(c.Description)))
            throw new DomainException("Missao no terminal: cada comando da cola precisa de command e description.", "comandos_invalidos");
        return list.Select(c => new TerminalCommand(c.Command.Trim(), c.Description.Trim())).ToList();
    }

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

        var steps = (m.Steps ?? []).Where(st => !string.IsNullOrWhiteSpace(st)).Select(st => st.Trim()).ToList();
        return new TerminalMission(m.Title.Trim(), m.Prompt.Trim(), hints, m.Note.Trim(), new TerminalMissionCheck(command, output, probe, state),
            Clean(m.Situation), Clean(m.Goal), steps.Count > 0 ? steps : null);
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
