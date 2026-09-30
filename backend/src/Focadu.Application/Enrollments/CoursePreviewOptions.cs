namespace Focadu.Application.Enrollments;

/// <summary>
/// Fase 81: quem enxerga os cursos ainda escondidos (Draft) - os de pre-requisito nascem assim e so vao
/// pro catalogo quando a curadoria termina (curso.json "published"). Lista de e-mails vinda da
/// configuracao (CoursePreview:Emails, separados por virgula); vazia = ninguem ve curso escondido.
/// </summary>
public record CoursePreviewOptions(IReadOnlyCollection<string> Emails)
{
    public static CoursePreviewOptions FromSetting(string? setting) =>
        new((setting ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToArray());

    public bool CanPreview(string? email) =>
        email is not null && Emails.Contains(email.Trim().ToLowerInvariant());
}
