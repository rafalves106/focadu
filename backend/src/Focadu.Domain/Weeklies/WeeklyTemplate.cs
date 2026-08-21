using Focadu.Domain.Common;
using Focadu.Domain.Content;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Fase 13: estrutura curricular de uma semana (RENAME do antigo `Weekly`) - admin-authored,
/// compartilhada por todos os usuarios matriculados no Course, muda raramente (via seed/
/// `/admin/conteudo`). Nao tem Status nem datas reais - isso agora vive na instancia por usuario
/// (`Weekly`, em `Focadu.Domain.Weeklies.Weekly`, o "novo" significado do nome). Ver
/// `docs/ARQUITETURA.md`, secao "Template vs Instancia", pro raciocinio completo do split.
/// </summary>
public class WeeklyTemplate : Entity
{
    public Guid MonthlyId { get; private set; }
    public int Number { get; private set; }
    public string Title { get; private set; }
    public string? Theme { get; private set; }

    /// <summary>Especificacao do projeto pratico da semana (era `WeeklyProject.SpecText`) - curriculo, igual pra todo mundo, so muda de "definido" pra "definido" uma vez via seed/autoria.</summary>
    public string? WeeklyProjectSpecText { get; private set; }

    private readonly List<DailyTemplate> _dailyTemplates = new();
    public IReadOnlyCollection<DailyTemplate> DailyTemplates => _dailyTemplates.AsReadOnly();

    private readonly List<CuratedContent> _curatedContents = new();
    public IReadOnlyCollection<CuratedContent> CuratedContents => _curatedContents.AsReadOnly();

    private WeeklyTemplate()
    {
        Title = string.Empty;
    }

    public WeeklyTemplate(Guid monthlyId, int number, string title, string? theme = null)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Titulo da semana e obrigatorio.");
        if (number < 1)
            throw new DomainException("Number deve ser maior que zero.");

        MonthlyId = monthlyId;
        Number = number;
        Title = title;
        Theme = theme;
    }

    public DailyTemplate AddDailyTemplate(int dayNumber)
    {
        if (_dailyTemplates.Any(d => d.DayNumber == dayNumber))
            throw new DomainException("Ja existe um DailyTemplate com esse DayNumber nesta WeeklyTemplate.");

        var template = new DailyTemplate(Id, dayNumber);
        _dailyTemplates.Add(template);
        return template;
    }

    public CuratedContent AddCuratedContent(CuratedContentType type, string title, string? externalUrl = null, string? bodyText = null)
    {
        var content = new CuratedContent(Id, type, title, externalUrl, bodyText);
        _curatedContents.Add(content);
        return content;
    }

    /// <summary>Define a especificacao do projeto pratico (uma vez so - curriculo nao muda depois de publicado).</summary>
    public void SetProjectSpec(string specText)
    {
        if (string.IsNullOrWhiteSpace(specText))
            throw new DomainException("Especificacao do projeto e obrigatoria.");
        if (WeeklyProjectSpecText is not null)
            throw new DomainException("Esta WeeklyTemplate ja tem uma especificacao de projeto definida.");

        WeeklyProjectSpecText = specText;
    }
}
