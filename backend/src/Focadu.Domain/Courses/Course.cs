using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Monthlies;

namespace Focadu.Domain.Courses;

/// <summary>Um curso completo da plataforma (ex: "Web Security"). Raiz da hierarquia de conteudo.</summary>
public class Course : Entity
{
    public string Name { get; private set; }
    public CourseStatus Status { get; private set; }

    /// <summary>Descricao curta pra card de selecao de curso (Fase 13, Selecao de Curso Inicial) - nula ate SetCatalogInfo ser chamado (seed). "Duracao estimada" nao e um campo aqui de proposito - calculada ao vivo a partir do numero real de WeeklyTemplates (ver GetAvailableCoursesUseCase), pra nunca divergir do curriculo de verdade.</summary>
    public string? Description { get; private set; }

    private readonly List<string> _requirements = new();
    /// <summary>Fase 84: o que ajuda saber antes de comecar (frases curtas, curadoria) - mostrado na ficha do curso, nunca trava nada.</summary>
    public IReadOnlyCollection<string> Requirements => _requirements.AsReadOnly();

    private readonly List<string> _recommendedBefore = new();
    /// <summary>Fase 84: nomes dos cursos que a Focadu recomenda fazer antes deste. So recomendacao: os cursos sao livres (decisao do dono, 30/09/2026).</summary>
    public IReadOnlyCollection<string> RecommendedBefore => _recommendedBefore.AsReadOnly();

    /// <summary>Fase 84: frase da ficha sobre como este curso prepara pros que o recomendam (ex.: o Linux pro Web Security). Nula quando nao ha.</summary>
    public string? PreparesText { get; private set; }

    private readonly List<Monthly> _monthlies = new();
    public IReadOnlyCollection<Monthly> Monthlies => _monthlies.AsReadOnly();

    private Course()
    {
        Name = string.Empty;
    }

    public Course(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nome do curso e obrigatorio.");

        Name = name;
        Status = CourseStatus.Draft;
    }

    /// <summary>Preenche o texto de vitrine (card de selecao de curso) - separado do construtor pra nao forcar todo Course pre-existente a informar isso (so o seed chama, por enquanto).</summary>
    public void SetCatalogInfo(string description)
    {
        Description = description;
    }

    /// <summary>Fase 84: recomendacao e requisitos da ficha do curso, vindos da curadoria (recomendacao.json) - o seed reaplica a cada deploy.</summary>
    public void SetRecommendation(IEnumerable<string> requirements, IEnumerable<string> recommendedBefore, string? preparesText)
    {
        _requirements.Clear();
        _requirements.AddRange(requirements.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim()));
        _recommendedBefore.Clear();
        _recommendedBefore.AddRange(recommendedBefore.Where(r => !string.IsNullOrWhiteSpace(r) && r.Trim() != Name).Select(r => r.Trim()).Distinct());
        PreparesText = string.IsNullOrWhiteSpace(preparesText) ? null : preparesText.Trim();
    }

    public Monthly AddMonthly(int number, string title)
    {
        if (_monthlies.Any(m => m.Number == number))
            throw new DomainException("Ja existe um Monthly com esse Number neste Course.");

        var monthly = new Monthly(Id, number, title);
        _monthlies.Add(monthly);
        return monthly;
    }

    public void Activate()
    {
        if (Status == CourseStatus.Archived)
            throw new DomainException("Nao e possivel ativar um curso arquivado.");

        Status = CourseStatus.Active;
    }

    public void Archive() => Status = CourseStatus.Archived;
}
