using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;

namespace Focadu.Domain.Monthlies;

/// <summary>Um mes dentro de um Course, agrupando WeeklyTemplates (Fase 13: renomeado de "Weeklies" - ver WeeklyTemplate).</summary>
public class Monthly : Entity
{
    public Guid CourseId { get; private set; }
    public int Number { get; private set; }
    public string Title { get; private set; }

    private readonly List<WeeklyTemplate> _weeklyTemplates = new();
    public IReadOnlyCollection<WeeklyTemplate> WeeklyTemplates => _weeklyTemplates.AsReadOnly();

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

    public WeeklyTemplate AddWeeklyTemplate(int number, string title, string? theme = null)
    {
        if (_weeklyTemplates.Any(w => w.Number == number))
            throw new DomainException("Ja existe uma WeeklyTemplate com esse Number neste Monthly.");

        var weeklyTemplate = new WeeklyTemplate(Id, number, title, theme);
        _weeklyTemplates.Add(weeklyTemplate);
        return weeklyTemplate;
    }
}
