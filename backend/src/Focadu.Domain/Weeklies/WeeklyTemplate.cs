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

    /// <summary>
    /// Fase 64: falas do briefing do Projeto Semanal, ditas pela Focada (mascote/mentora) no dialogo
    /// fixo da tela do projeto - escritas a mao pela curadoria (voz de missao), nunca geradas do
    /// SpecText. Vazio = semana sem briefing (a tela mostra so o cartao de especificacao, como antes).
    /// Mesmo espirito de SetProjectSpec: definido uma vez so, via seed.
    /// </summary>
    public string[] WeeklyProjectBriefing { get; private set; } = [];

    /// <summary>
    /// Fase 64: falas de estado da Focada que ESTA semana sobrescreve (chave em StateLineKeys ->
    /// texto). As falas padrao, iguais em toda semana, moram no frontend; so as sobrescritas pela
    /// curadoria vem daqui. Vazio = usa todas as padrao.
    /// </summary>
    public Dictionary<string, string> WeeklyProjectStateLines { get; private set; } = new();

    /// <summary>Fase 64: tamanho maximo de uma fala (cabe na caixa de dialogo sem rolar).</summary>
    public const int MaxDialogueLineLength = 200;

    /// <summary>Fase 64: estados do projeto que tem fala propria (repositorio pronto, entregue, avaliado com nota alta/baixa).</summary>
    public static readonly IReadOnlyList<string> StateLineKeys = ["repositorio", "entregue", "avaliadoAlta", "avaliadoBaixa"];

    /// <summary>Nome do repositorio-template no Forgejo interno (ex: "template-web-security-semana-1"), mantido pela curadoria - EnrollUserInCourseUseCase da fork disso pra cada aluno matriculado. Nulo ate a curadoria configurar; sem isso, a Weekly nao recebe repositorio (ver "repositorios-gerenciados-projeto-semanal.md").</summary>
    public string? ForgejoTemplateSlug { get; private set; }

    private readonly List<WeeklyTemplateLanguage> _languageVariants = new();

    /// <summary>Fase 59: variantes de linguagem do projeto (1 repositorio-template por linguagem). Vazio = semana como antes da Fase 59, sem escolha de linguagem.</summary>
    public IReadOnlyCollection<WeeklyTemplateLanguage> LanguageVariants => _languageVariants.AsReadOnly();

    private readonly List<WeeklyTemplateReference> _references = new();

    /// <summary>Fase 59: links de referencia do projeto (bibliotecas/documentacao), curados na mao. Ver ReferencesFor pra lista de uma linguagem.</summary>
    public IReadOnlyCollection<WeeklyTemplateReference> References => _references.AsReadOnly();

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

    /// <summary>Fase 64: define o briefing da Focada (e as falas de estado sobrescritas, se houver) - uma vez so, igual SetProjectSpec.</summary>
    public void SetProjectBriefing(IReadOnlyList<string> lines, IReadOnlyDictionary<string, string>? stateLines = null)
    {
        if (lines.Count == 0 || lines.Any(string.IsNullOrWhiteSpace))
            throw new DomainException("O briefing precisa de ao menos uma fala, e nenhuma fala pode ser vazia.");
        if (WeeklyProjectBriefing.Length > 0)
            throw new DomainException("Esta WeeklyTemplate ja tem um briefing definido.");

        var allLines = lines.Concat(stateLines?.Values ?? []).ToList();
        var tooLong = allLines.FirstOrDefault(l => l.Length > MaxDialogueLineLength);
        if (tooLong is not null)
            throw new DomainException($"Fala com mais de {MaxDialogueLineLength} caracteres: \"{tooLong[..40]}...\"", "fala_longa_demais");

        foreach (var (key, text) in stateLines ?? new Dictionary<string, string>())
        {
            if (!StateLineKeys.Contains(key))
                throw new DomainException($"Estado de fala desconhecido: '{key}'. Validos: {string.Join(", ", StateLineKeys)}.", "estado_de_fala_invalido");
            if (string.IsNullOrWhiteSpace(text))
                throw new DomainException($"A fala do estado '{key}' esta vazia.");
        }

        WeeklyProjectBriefing = lines.ToArray();
        WeeklyProjectStateLines = new Dictionary<string, string>(stateLines ?? new Dictionary<string, string>());
    }

    /// <summary>Define o repositorio-template no Forgejo pra esta semana (uma vez so - curriculo nao muda depois de publicado, mesmo espirito de SetProjectSpec).</summary>
    public void SetProjectTemplateRepo(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainException("Slug do repositorio-template e obrigatorio.");
        if (ForgejoTemplateSlug is not null)
            throw new DomainException("Esta WeeklyTemplate ja tem um repositorio-template definido.");

        ForgejoTemplateSlug = slug;
    }

    /// <summary>
    /// Verdadeiro quando a semana ja foi curada com repositorio-template por linguagem (Fase 59) -
    /// so nessas semanas o aluno escolhe a linguagem e o projeto so aparece depois da escolha. Nas
    /// demais (piloto: tudo menos a Semana 1) nada muda.
    /// </summary>
    public bool HasLanguageVariants => _languageVariants.Count > 0;

    /// <summary>Adiciona a variante de uma linguagem (uma por linguagem, e cada slug so numa variante).</summary>
    public WeeklyTemplateLanguage AddLanguageVariant(ProjectLanguage language, string forgejoTemplateSlug)
    {
        if (_languageVariants.Any(v => v.Language == language))
            throw new DomainException("Esta WeeklyTemplate ja tem uma variante para essa linguagem.");
        if (_languageVariants.Any(v => string.Equals(v.ForgejoTemplateSlug, forgejoTemplateSlug?.Trim(), StringComparison.Ordinal)))
            throw new DomainException("Este repositorio-template ja e usado por outra variante desta WeeklyTemplate.");

        var variant = new WeeklyTemplateLanguage(Id, language, forgejoTemplateSlug!);
        _languageVariants.Add(variant);
        return variant;
    }

    public WeeklyTemplateLanguage? FindLanguageVariant(ProjectLanguage language) =>
        _languageVariants.FirstOrDefault(v => v.Language == language);

    /// <summary>
    /// Adiciona um link de referencia. `language` nulo vale pra todas as linguagens; uma linguagem
    /// so e aceita se a semana tem a variante dela (referencia sem repositorio-modelo ficaria
    /// solta, sem nunca ser exibida).
    /// </summary>
    public WeeklyTemplateReference AddReference(
        ProjectLanguage? language, string title, string url, string documents, DateTime? lastVerifiedAt = null)
    {
        if (language is { } l && FindLanguageVariant(l) is null)
            throw new DomainException("Nao ha variante dessa linguagem nesta WeeklyTemplate - adicione a variante antes das referencias dela.");

        var reference = new WeeklyTemplateReference(Id, language, title, url, documents, _references.Count, lastVerifiedAt);
        _references.Add(reference);
        return reference;
    }

    /// <summary>Referencias exibidas pra quem escolheu `language`: as dela mais as comuns (Language nulo), na ordem da curadoria.</summary>
    public IReadOnlyList<WeeklyTemplateReference> ReferencesFor(ProjectLanguage language) =>
        _references.Where(r => r.Language is null || r.Language == language).OrderBy(r => r.Position).ToList();

    /// <summary>
    /// Repositorio-template a forkar/avaliar pra esta semana. Com variantes e uma linguagem ja
    /// escolhida, e o slug da linguagem; sem variantes - ou projeto que nasceu antes da Fase 59, sem
    /// linguagem - e o slug unico de sempre (ForgejoTemplateSlug, pode ser nulo).
    /// </summary>
    public string? ResolveForgejoTemplateSlug(ProjectLanguage? chosenLanguage) =>
        chosenLanguage is { } language && FindLanguageVariant(language) is { } variant
            ? variant.ForgejoTemplateSlug
            : ForgejoTemplateSlug;
}
