using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Link de referencia de um projeto (Fase 59): biblioteca/documentacao que o aluno usa pra
/// realizar o projeto. Curadoria manual e estatica - cada link e conferido na mao (funciona e
/// documenta de fato o que o projeto precisa integrar); nada gerado por IA. Registro estruturado
/// (com Id e data da ultima conferencia), e nao texto solto num Markdown, pra que o aviso futuro
/// "link fora do ar" e o painel de gestao consigam apontar pra um link especifico.
/// </summary>
public class WeeklyTemplateReference : Entity
{
    public const int MaxTitleLength = 200;
    public const int MaxUrlLength = 2000;
    public const int MaxDocumentsLength = 500;

    public Guid WeeklyTemplateId { get; private set; }

    /// <summary>Linguagem a que a referencia se aplica. Nulo = vale pra todas as linguagens da semana (ex: uma RFC).</summary>
    public ProjectLanguage? Language { get; private set; }

    public string Title { get; private set; }
    public string Url { get; private set; }

    /// <summary>O que este link documenta pro projeto, em 1 frase - e o que a conferencia manual precisa confirmar.</summary>
    public string Documents { get; private set; }

    /// <summary>Ordem de exibicao dentro da semana.</summary>
    public int Position { get; private set; }

    /// <summary>Quando a curadoria conferiu o link pela ultima vez. Nulo = ainda nao conferido.</summary>
    public DateTime? LastVerifiedAt { get; private set; }

    private WeeklyTemplateReference()
    {
        Title = string.Empty;
        Url = string.Empty;
        Documents = string.Empty;
    }

    internal WeeklyTemplateReference(
        Guid weeklyTemplateId, ProjectLanguage? language, string title, string url, string documents, int position, DateTime? lastVerifiedAt)
    {
        if (language is { } l && !Enum.IsDefined(l))
            throw new DomainException("Linguagem invalida.", "linguagem_invalida");
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Titulo da referencia e obrigatorio.");
        if (title.Trim().Length > MaxTitleLength)
            throw new DomainException($"Titulo da referencia deve ter no maximo {MaxTitleLength} caracteres.");
        if (string.IsNullOrWhiteSpace(documents))
            throw new DomainException("Diga o que a referencia documenta - e isso que a conferencia do link confirma.");
        if (documents.Trim().Length > MaxDocumentsLength)
            throw new DomainException($"Descricao da referencia deve ter no maximo {MaxDocumentsLength} caracteres.");
        if (!IsAbsoluteHttpUrl(url) || url.Trim().Length > MaxUrlLength)
            throw new DomainException("URL da referencia deve ser um endereco http(s) absoluto.", "url_referencia_invalida");

        WeeklyTemplateId = weeklyTemplateId;
        Language = language;
        Title = title.Trim();
        Url = url.Trim();
        Documents = documents.Trim();
        Position = position;
        LastVerifiedAt = lastVerifiedAt;
    }

    private static bool IsAbsoluteHttpUrl(string? url) =>
        Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
