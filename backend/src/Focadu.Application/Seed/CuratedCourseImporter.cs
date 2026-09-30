using System.Text.Json;
using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 81: monta ou completa um curso de pre-requisito (Linux, Python pra Web Security) a partir do
/// manifesto secret/curadoria/&lt;slug&gt;/curso.json e dos dia-N.json que ja existem. Diferente do seed do
/// Web Security (que importa tudo de uma vez e nunca mais mexe), este e incremental: o curso nasce
/// escondido (Draft) e cada deploy acrescenta os dias curados desde o anterior, sem tocar no que ja
/// existe. Semanas sem Projeto Semanal: cada WeeklyTemplate recebe a linguagem de pratica do curso
/// (WeeklyTemplate.IsPracticeOnly). Puro (sem banco), pra teste.
/// </summary>
public static class CuratedCourseImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static CourseManifest ParseManifest(string json) =>
        JsonSerializer.Deserialize<CourseManifest>(json, JsonOptions)
            ?? throw new InvalidOperationException("curso.json vazio ou invalido.");

    /// <summary>Um curso novo, ainda escondido (Draft), com o texto de vitrine do manifesto.</summary>
    public static Course CreateCourse(CourseManifest manifest)
    {
        var course = new Course(manifest.Name);
        course.SetCatalogInfo(manifest.Description);
        return course;
    }

    /// <summary>
    /// Acrescenta ao curso os modulos, semanas e dias do manifesto que ainda nao estao nele. Um dia so
    /// entra se o arquivo existir (<paramref name="resolveDayFile"/> recebe a pasta da semana e o nome do
    /// arquivo e devolve null quando ele ainda nao foi curado). Publica o curso (Active) quando o
    /// manifesto disser que ele esta pronto. Devolve os dias criados nesta passada, com a semana de cada um.
    /// </summary>
    public static IReadOnlyList<CreatedDay> Apply(Course course, CourseManifest manifest, Func<string, string, string?> resolveDayFile)
    {
        var created = new List<CreatedDay>();
        foreach (var module in manifest.Modules.OrderBy(m => m.Number))
        {
            var monthly = course.Monthlies.FirstOrDefault(m => m.Number == module.Number)
                ?? course.AddMonthly(module.Number, module.Title);

            foreach (var week in module.Weeks.OrderBy(w => w.Number))
            {
                var weeklyTemplate = monthly.WeeklyTemplates.FirstOrDefault(w => w.Number == week.Number)
                    ?? monthly.AddWeeklyTemplate(week.Number, week.Title, week.Theme);
                if (weeklyTemplate.PracticeLanguage is null)
                    weeklyTemplate.SetPracticeLanguage(manifest.PracticeLanguage);

                foreach (var dayNumber in week.Days.OrderBy(d => d))
                {
                    if (weeklyTemplate.DailyTemplates.Any(d => d.DayNumber == dayNumber)) continue;

                    var path = resolveDayFile($"semana-{week.Number}", $"dia-{dayNumber}.json");
                    if (path is null) continue;

                    CuratedDayImporter.ImportFile(weeklyTemplate, path);
                    var template = weeklyTemplate.DailyTemplates.Last();
                    if (template.DayNumber != dayNumber)
                        throw new InvalidOperationException($"{path}: esperado dayNumber {dayNumber}, veio {template.DayNumber}.");
                    created.Add(new CreatedDay(weeklyTemplate, template));
                }
            }
        }

        if (manifest.Published && course.Status == Domain.Enums.CourseStatus.Draft)
            course.Activate();

        return created;
    }
}

/// <summary>Um dia importado nesta passada e a semana dele.</summary>
public record CreatedDay(WeeklyTemplate Week, DailyTemplate Day);

/// <summary>Fase 81: secret/curadoria/&lt;slug&gt;/curso.json.</summary>
/// <param name="Published">Falso enquanto a curadoria nao terminar: o curso fica fora do catalogo (Draft).</param>
/// <param name="PracticeLanguage">Linguagem dos passos de codigo das pontes ("Bash", "Python").</param>
public record CourseManifest(
    string Name, string Description, string PracticeLanguage, bool Published, List<ModuleManifest> Modules);

public record ModuleManifest(int Number, string Title, List<WeekManifest> Weeks);

public record WeekManifest(int Number, string Title, string? Theme, List<int> Days);
