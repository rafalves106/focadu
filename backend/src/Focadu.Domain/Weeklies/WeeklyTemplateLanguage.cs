using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Variante de linguagem do projeto de uma WeeklyTemplate (Fase 59): o repositorio-template no
/// Forgejo daquela linguagem (so a base, o esqueleto - a resposta e do aluno). Curriculo,
/// compartilhado por todo mundo. Semana sem nenhuma variante se comporta como antes da Fase 59
/// (slug unico em WeeklyTemplate.ForgejoTemplateSlug, sem escolha de linguagem).
/// </summary>
public class WeeklyTemplateLanguage : Entity
{
    public Guid WeeklyTemplateId { get; private set; }
    public ProjectLanguage Language { get; private set; }

    /// <summary>Nome do repositorio-template desta linguagem no Forgejo interno (ex: "template-web-security-semana-1-python").</summary>
    public string ForgejoTemplateSlug { get; private set; }

    private WeeklyTemplateLanguage()
    {
        ForgejoTemplateSlug = string.Empty;
    }

    internal WeeklyTemplateLanguage(Guid weeklyTemplateId, ProjectLanguage language, string forgejoTemplateSlug)
    {
        if (!Enum.IsDefined(language))
            throw new DomainException("Linguagem invalida.", "linguagem_invalida");
        if (string.IsNullOrWhiteSpace(forgejoTemplateSlug))
            throw new DomainException("Slug do repositorio-template e obrigatorio.");

        WeeklyTemplateId = weeklyTemplateId;
        Language = language;
        ForgejoTemplateSlug = forgejoTemplateSlug.Trim();
    }
}
