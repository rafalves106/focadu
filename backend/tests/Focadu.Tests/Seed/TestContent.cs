namespace Focadu.Tests.Seed;

/// <summary>
/// Acha conteudo curado real para os testes que o varrem. Procura primeiro em conteudo/ (o que a Api le) e,
/// na falta, no arquivo morto processo/arquivo/conteudo-antigo/ (plano de curadoria de 02/10/2026): os dias
/// antigos seguem servindo de fixture do importador ate serem apagados. Fora do checkout (CI hospedado) nao
/// acha nada e quem chama sai sem falhar.
/// </summary>
internal static class TestContent
{
    private static readonly string? SecretRoot = FindSecretRoot();

    private static string? FindSecretRoot()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;
        if (dir is null) return null;

        var nested = Path.Combine(dir.FullName, "secret");
        if (Directory.Exists(Path.Combine(nested, "conteudo"))) return nested;

        var sibling = Directory.GetParent(dir.FullName) is { } parent ? Path.Combine(parent.FullName, "focadu-secret") : null;
        return sibling is not null && Directory.Exists(Path.Combine(sibling, "conteudo")) ? sibling : null;
    }

    public static bool Available => SecretRoot is not null;

    /// <summary>Pasta do curso: conteudo/&lt;slug&gt;, ou o arquivo morto quando a pasta nova nao tem dias.</summary>
    public static string? CourseDir(string slug)
    {
        if (SecretRoot is null) return null;
        var live = Path.Combine(SecretRoot, "conteudo", slug);
        if (Directory.Exists(live) && Directory.EnumerateFiles(live, "dia-*.json", SearchOption.AllDirectories).Any())
            return live;
        var archive = Path.Combine(SecretRoot, "processo", "arquivo", "conteudo-antigo", slug);
        return Directory.Exists(archive) ? archive : (Directory.Exists(live) ? live : null);
    }

    /// <summary>Arquivo de um curso (curso.json mora em conteudo/, os dias podem estar no arquivo morto).</summary>
    public static string? Resolve(string slug, string? weekFolder, string fileName)
    {
        if (SecretRoot is null) return null;
        string[] tail = string.IsNullOrEmpty(weekFolder) ? [fileName] : [weekFolder, fileName];
        var live = Path.Combine([SecretRoot, "conteudo", slug, .. tail]);
        if (File.Exists(live)) return live;
        var archive = Path.Combine([SecretRoot, "processo", "arquivo", "conteudo-antigo", slug, .. tail]);
        return File.Exists(archive) ? archive : null;
    }
}
