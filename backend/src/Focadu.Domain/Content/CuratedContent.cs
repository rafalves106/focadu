using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Content;

/// <summary>Conteúdo curado (leitura, vídeo ou diagrama) associado a uma WeeklyTemplate - curriculo (Fase 13), compartilhado por todo mundo matriculado no Course.</summary>
public class CuratedContent : Entity
{
    public Guid WeeklyTemplateId { get; private set; }
    public CuratedContentType Type { get; private set; }
    public string Title { get; private set; }

    /// <summary>Link externo (ex: vídeo, diagrama hospedado fora). Nulo quando o conteúdo é texto próprio (BodyText).</summary>
    public string? ExternalUrl { get; private set; }

    /// <summary>Texto de leitura escrito por nós. Nulo quando o conteúdo é apenas um link externo.</summary>
    public string? BodyText { get; private set; }

    private CuratedContent()
    {
        Title = string.Empty;
    }

    public CuratedContent(Guid weeklyTemplateId, CuratedContentType type, string title, string? externalUrl, string? bodyText)
    {
        Validate(title, externalUrl, bodyText);

        WeeklyTemplateId = weeklyTemplateId;
        Type = type;
        Title = title;
        ExternalUrl = externalUrl;
        BodyText = bodyText;
    }

    /// <summary>
    /// Atualiza Title/ExternalUrl/BodyText - usado pela autoria de conteudo (Fase 4) para
    /// carregar o texto completo por cima de um placeholder de seed, por exemplo. Type e
    /// WeeklyTemplateId nunca mudam depois de criado.
    /// </summary>
    public void Update(string title, string? externalUrl, string? bodyText)
    {
        Validate(title, externalUrl, bodyText);

        Title = title;
        ExternalUrl = externalUrl;
        BodyText = bodyText;
    }

    private static void Validate(string title, string? externalUrl, string? bodyText)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Título do conteúdo é obrigatório.");
        if (string.IsNullOrWhiteSpace(externalUrl) && string.IsNullOrWhiteSpace(bodyText))
            throw new DomainException("Um CuratedContent precisa ter ExternalUrl ou BodyText preenchido.");
    }
}
