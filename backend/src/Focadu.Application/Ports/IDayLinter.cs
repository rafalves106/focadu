namespace Focadu.Application.Ports;

/// <summary>
/// Port do linter de dia (plano de curadoria, secao 6): confere um dia-N.json antes de ele entrar no banco.
/// A implementacao real chama o script processo/scripts/linter-dia (Node, 0 token); o importador recusa o dia
/// reprovado. Fica atras de um port porque o container da Api nao tem Node: la o linter e dispensado de forma
/// explicita (<c>--sem-linter</c>), nunca em silencio.
/// </summary>
public interface IDayLinter
{
    Task<DayLintResult> LintAsync(string filePath, string courseSlug, CancellationToken cancellationToken = default);
}

/// <param name="Available">Falso quando o linter nao pode rodar (sem Node, script ausente): o importador trata como recusa.</param>
/// <param name="Mode">"completo" (dia no molde v1) ou "legado" (dia antigo).</param>
public record DayLintResult(bool Available, bool Passed, string Mode, IReadOnlyList<string> Errors, string? UnavailableReason = null);
