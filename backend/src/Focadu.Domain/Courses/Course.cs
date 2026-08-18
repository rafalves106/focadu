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
