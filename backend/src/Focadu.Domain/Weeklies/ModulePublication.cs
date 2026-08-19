using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Publicacao publica (LinkedIn ou GitHub) que prova o aprendizado de um modulo (Weekly, Fase 11) -
/// 1:1 com Weekly, criada sob demanda (Weekly.StartPublication) quando o aluno abre o fluxo, nao
/// no momento em que o modulo fica completo.
/// </summary>
public class ModulePublication : Entity
{
    public Guid WeeklyId { get; private set; }
    public PublicationStatus Status { get; private set; }
    public PublicationPlatform? Platform { get; private set; }
    public string? SubmittedUrl { get; private set; }

    /// <summary>Rascunho gerado por IA (LinkedIn) - null pro fluxo GitHub, ou quando o aluno prefere escrever o proprio texto.</summary>
    public string? GeneratedDraft { get; private set; }

    public DateTime? SubmittedAt { get; private set; }
    public DateTime? ValidatedAt { get; private set; }
    public string? ValidationError { get; private set; }

    private ModulePublication()
    {
    }

    internal ModulePublication(Guid weeklyId)
    {
        WeeklyId = weeklyId;
        Status = PublicationStatus.Pending;
    }

    public void GenerateDraft(string draft)
    {
        if (string.IsNullOrWhiteSpace(draft))
            throw new DomainException("Rascunho gerado nao pode ser vazio.");

        GeneratedDraft = draft;
    }

    /// <summary>
    /// Registra a URL/repositorio submetido. Pode ser chamado mais de uma vez (resubmissao apos
    /// Failed, ou pra trocar a URL) - so fica travado depois de Validated.
    /// </summary>
    public void Submit(PublicationPlatform platform, string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new DomainException("URL de submissao e obrigatoria.");
        if (Status == PublicationStatus.Validated)
            throw new DomainException("Esta publicacao ja foi validada.", "publicacao_ja_validada");

        Platform = platform;
        SubmittedUrl = url;
        SubmittedAt = DateTime.UtcNow;
        Status = PublicationStatus.Submitted;
        ValidationError = null;
    }

    public void MarkValidated()
    {
        if (Status != PublicationStatus.Submitted)
            throw new DomainException("So e possivel validar uma publicacao submetida.");

        Status = PublicationStatus.Validated;
        ValidatedAt = DateTime.UtcNow;
    }

    public void MarkFailed(string reason)
    {
        if (Status != PublicationStatus.Submitted)
            throw new DomainException("So e possivel marcar falha numa publicacao submetida.");

        Status = PublicationStatus.Failed;
        ValidationError = reason;
    }
}
