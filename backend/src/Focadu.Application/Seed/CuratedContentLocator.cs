namespace Focadu.Application.Seed;

/// <summary>
/// Fase 81: acha um arquivo de conteudo curado (a pasta mudou de curadoria/ para conteudo/ no plano de curadoria de 02/10/2026; o conteudo antigo esta arquivado em processo/arquivo/ e nao e lido em runtime) de qualquer curso - secret/conteudo/&lt;slug&gt;/[&lt;semana&gt;/]&lt;arquivo&gt;.
/// Mesma busca que o seed do Web Security sempre fez (CURATED_CONTENT_ROOT no container; fora dele, sobe
/// ate o .git e tenta secret/ e o repositorio irmao focadu-secret/), agora parametrizada pelo curso.
/// </summary>
public static class CuratedContentLocator
{
    /// <summary>Caminho do arquivo; com <paramref name="required"/> falso devolve null quando ele nao existe.</summary>
    public static string? Resolve(string courseSlug, string? weekFolder, string fileName, bool required)
    {
        var relativeSegments = string.IsNullOrEmpty(weekFolder)
            ? new[] { courseSlug, fileName }
            : new[] { courseSlug, weekFolder, fileName };

        var contentRoot = Environment.GetEnvironmentVariable("CURATED_CONTENT_ROOT");
        if (!string.IsNullOrWhiteSpace(contentRoot))
        {
            var fromRoot = Path.Combine([contentRoot, "conteudo", .. relativeSegments]);
            return required || File.Exists(fromRoot) ? fromRoot : null;
        }

        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;

        var repoRoot = dir?.FullName
            ?? throw new InvalidOperationException("Nao foi possivel localizar a raiz do repositorio (procurando por .git) para achar o conteudo curado.");

        var nested = Path.Combine([repoRoot, "secret", "conteudo", .. relativeSegments]);
        if (File.Exists(nested))
            return nested;

        var siblingParent = Directory.GetParent(repoRoot)?.FullName;
        var sibling = siblingParent is null
            ? null
            : Path.Combine([siblingParent, "focadu-secret", "conteudo", .. relativeSegments]);
        if (sibling is not null && File.Exists(sibling))
            return sibling;

        if (!required)
            return null;

        throw new InvalidOperationException(
            $"Conteudo curado nao encontrado. Procurado em '{nested}'" +
            (sibling is not null ? $" e em '{sibling}'" : "") +
            " - confirme que o repositorio focadu-secret esta clonado ao lado deste, ou que existe uma pasta/symlink 'secret/' local.");
    }
}
