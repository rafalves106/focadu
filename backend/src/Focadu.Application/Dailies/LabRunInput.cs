using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Application.Dailies;

/// <summary>Fase 86: um comando digitado no terminal do laboratorio (Linux) e o que ele imprimiu.</summary>
public record LabCommandInput(string? Command, string? Output);

/// <summary>
/// Fase 86: o que o laboratorio de codigo produziu quando o aluno rodou o passo (rascunho
/// laboratorio-de-codigo-na-ponte.md, decisoes 2, 16 e 18). A saida e a do laboratorio, nao colada - o
/// servidor nao a verifica (o navegador do aluno a gera; adulteracao e ignorada, decisao 10), so guarda
/// e entrega pra IA. <see cref="Output"/> e a saida da ultima execucao (vazia e valida); no Linux
/// <see cref="Commands"/> traz o historico de comandos digitados, com a saida de cada um.
/// </summary>
public record LabRunInput(string? Output, int ExitCode, IReadOnlyList<LabCommandInput>? Commands = null)
{
    public const int MaxCommands = 50;
    public const int MaxCommandLength = 2_000;

    /// <summary>Valida o tamanho e devolve a forma normalizada que a IA e o banco recebem.</summary>
    internal NormalizedLabRun Normalize(int maxLength)
    {
        var output = Output ?? string.Empty;
        var commands = (Commands ?? [])
            .Where(c => !string.IsNullOrWhiteSpace(c.Command))
            .Select(c => new CodeStepLabCommand(c.Command!.Trim(), c.Output ?? string.Empty))
            .ToList();

        if (commands.Count > MaxCommands)
            throw new ValidationException("laboratorio_historico_grande", $"O historico do terminal tem limite de {MaxCommands} comandos.");
        if (commands.Any(c => c.Command.Length > MaxCommandLength))
            throw new ValidationException("laboratorio_historico_grande", $"Cada comando tem limite de {MaxCommandLength} caracteres.");

        var total = output.Length + commands.Sum(c => c.Command.Length + c.Output.Length);
        if (total > maxLength)
            throw new ValidationException("codigo_muito_grande", $"Codigo e saida tem limite de {maxLength} caracteres cada.");

        // O que vira Justification e vai pra IA: o historico do terminal quando existe, senao a saida.
        var text = commands.Count > 0
            ? string.Join("\n", commands.Select(c => $"$ {c.Command}\n{c.Output}".TrimEnd()))
            : output;
        return new NormalizedLabRun(text, new CodeStepLabRun(ExitCode, commands));
    }
}

internal record NormalizedLabRun(string Text, CodeStepLabRun Run);
