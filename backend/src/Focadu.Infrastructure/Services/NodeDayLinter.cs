using System.Diagnostics;
using System.Text.Json;
using Focadu.Application.Ports;
using Focadu.Application.Seed;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Chama o linter de dia (processo/scripts/linter-dia, Node) como processo externo e devolve o relatorio. Custo
/// em token zero. Indisponivel (sem Node, script ou node_modules) vira <c>Available = false</c>: o importador
/// recusa o dia em vez de importar sem conferir. LINTER_DIA_CLI sobrescreve o caminho do script.
/// </summary>
public class NodeDayLinter : IDayLinter
{
    public async Task<DayLintResult> LintAsync(string filePath, string courseSlug, CancellationToken cancellationToken = default)
    {
        var secretRoot = CuratedContentLocator.SecretRoot();
        if (Path.GetFileName(filePath) == "projeto.json")
            return await LintProjectAsync(filePath, courseSlug, secretRoot, cancellationToken);

        var cli = Environment.GetEnvironmentVariable("LINTER_DIA_CLI")
            ?? (secretRoot is null ? null : Path.Combine(secretRoot, "processo", "scripts", "linter-dia", "src", "cli.js"));
        if (cli is null || !File.Exists(cli))
            return new DayLintResult(false, false, "", [], "script do linter nao encontrado");
        if (!Directory.Exists(Path.Combine(Path.GetDirectoryName(cli)!, "..", "node_modules")))
            return new DayLintResult(false, false, "", [], "node_modules ausente (rode npm i em processo/scripts/linter-dia)");

        var info = new ProcessStartInfo("node") { RedirectStandardOutput = true, RedirectStandardError = true };
        info.ArgumentList.Add(cli);
        info.ArgumentList.Add(filePath);
        info.ArgumentList.Add("--json");
        if (secretRoot is not null)
        {
            var course = Path.Combine(secretRoot, "processo", "cursos", courseSlug);
            var glossary = Path.Combine(course, "glossario.md");
            if (File.Exists(glossary)) { info.ArgumentList.Add("--glossario"); info.ArgumentList.Add(glossary); }
            var dayLog = Path.Combine(course, "logs", Path.GetFileNameWithoutExtension(filePath) + ".log");
            if (File.Exists(dayLog)) { info.ArgumentList.Add("--log"); info.ArgumentList.Add(dayLog); }
        }

        Process process;
        try
        {
            process = Process.Start(info) ?? throw new InvalidOperationException("nao iniciou");
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            return new DayLintResult(false, false, "", [], "Node nao encontrado no PATH");
        }

        using (process)
        {
            var stdout = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderr = await process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            return process.ExitCode is 0 or 1
                ? Parse(stdout)
                : new DayLintResult(false, false, "", [], $"o linter falhou: {stderr.Trim()}");
        }
    }

    /// <summary>Linter do projeto semanal (projeto-cli.js, etapa P3): saida em texto, "PASSOU" ou "REPROVOU" e uma lista de erros.</summary>
    private static async Task<DayLintResult> LintProjectAsync(string filePath, string courseSlug, string? secretRoot, CancellationToken cancellationToken)
    {
        var cli = secretRoot is null ? null : Path.Combine(secretRoot, "processo", "scripts", "linter-dia", "src", "projeto-cli.js");
        if (cli is null || !File.Exists(cli))
            return new DayLintResult(false, false, "", [], "script do linter de projeto nao encontrado");

        var info = new ProcessStartInfo("node") { RedirectStandardOutput = true, RedirectStandardError = true };
        info.ArgumentList.Add(cli);
        info.ArgumentList.Add(filePath);
        var week = Path.GetFileName(Path.GetDirectoryName(filePath));
        var ficha = Path.Combine(secretRoot!, "processo", "cursos", courseSlug, "fichas", $"{week}.ficha.md");
        if (File.Exists(ficha)) { info.ArgumentList.Add("--ficha"); info.ArgumentList.Add(ficha); }

        Process process;
        try
        {
            process = Process.Start(info) ?? throw new InvalidOperationException("nao iniciou");
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            return new DayLintResult(false, false, "", [], "Node nao encontrado no PATH");
        }

        using (process)
        {
            var stdout = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderr = await process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            return ParseProject(process.ExitCode, stdout, stderr);
        }
    }

    /// <summary>Le a saida do projeto-cli.js: 0 = PASSOU, 1 = REPROVOU com um erro por linha "- ...". Interno para teste.</summary>
    internal static DayLintResult ParseProject(int exitCode, string stdout, string stderr)
    {
        if (exitCode == 0) return new DayLintResult(true, true, "projeto", []);
        if (exitCode != 1) return new DayLintResult(false, false, "", [], $"o linter de projeto falhou: {stderr.Trim()}");

        var errors = stdout.Split('\n').Select(l => l.Trim()).Where(l => l.StartsWith("- ")).Select(l => l[2..]).ToList();
        if (errors.Count == 0 && !string.IsNullOrWhiteSpace(stderr)) errors.Add(stderr.Trim());
        return new DayLintResult(true, false, "projeto", errors);
    }

    /// <summary>Le o JSON (`--json`) do linter: uma lista com um item por arquivo. Interno para teste.</summary>
    internal static DayLintResult Parse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var item = doc.RootElement.EnumerateArray().First();
            var errors = item.GetProperty("erros").EnumerateArray()
                .Select(e => $"{e.GetProperty("grupo").GetString()} | {e.GetProperty("campo").GetString()} | {e.GetProperty("regra").GetString()} | {e.GetProperty("medido").GetString()} | limite: {e.GetProperty("limite").GetString()}")
                .ToList();
            return new DayLintResult(true, item.GetProperty("aprovado").GetBoolean(), item.GetProperty("modo").GetString() ?? "", errors);
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException or KeyNotFoundException)
        {
            return new DayLintResult(false, false, "", [], "relatorio do linter ilegivel");
        }
    }
}
