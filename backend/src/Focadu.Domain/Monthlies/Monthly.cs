using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;

namespace Focadu.Domain.Monthlies;

/// <summary>Um mes dentro de um Course, agrupando Weeklies.</summary>
public class Monthly : Entity
{
    public Guid CourseId { get; private set; }
    public int Number { get; private set; }
    public string Title { get; private set; }

    private readonly List<Weekly> _weeklies = new();
    public IReadOnlyCollection<Weekly> Weeklies => _weeklies.AsReadOnly();

    private Monthly()
    {
        Title = string.Empty;
    }

    public Monthly(Guid courseId, int number, string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Titulo do mes e obrigatorio.");
        if (number < 1)
            throw new DomainException("Number deve ser maior que zero.");

        CourseId = courseId;
        Number = number;
        Title = title;
    }

    public Weekly AddWeekly(int number, string title, string? theme = null)
    {
        if (_weeklies.Any(w => w.Number == number))
            throw new DomainException("Ja existe uma Weekly com esse Number neste Monthly.");

        var weekly = new Weekly(Id, number, title, theme);
        _weeklies.Add(weekly);
        return weekly;
    }
}
