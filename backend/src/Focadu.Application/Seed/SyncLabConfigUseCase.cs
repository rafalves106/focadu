using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 86 (e missao no terminal): leva o laboratorio de codigo (bloco <c>lab</c>, codigo inicial e opt-out por passo, secret/curadoria/
/// CURADORIA.md 5.2) pros dias que JA estao no banco. Os seeds nunca reimportam um dia existente, e uma
/// reimportacao apagaria o progresso de quem esta no meio - entao isto so atualiza a configuracao do
/// DailyTemplate e dos passos (<see cref="CuratedDayImporter.ApplyLab"/>). Nos dias cujo arquivo traz a atividade
/// <c>TerminalMission</c> (dias normais do Linux), ela tambem entra no dia do banco sem reimportar
/// (<see cref="CuratedDayImporter.ApplyMissions"/>). Roda junto do `seed`, em todo
/// deploy, e e idempotente: depois da 1a vez nao muda nada.
///
/// Pra cada curso curado (Web Security + os de <see cref="CuratedContentLocator.ListCourseSlugs"/>) e cada
/// DailyTemplate com passo de codigo, abre o arquivo do dia - <c>semana-N/ponte/&lt;linguagem&gt;.json</c> na
/// variante de linguagem do Web Security, <c>semana-N/dia-D.json</c> nos demais. Um dia cujo arquivo tem
/// problema (lab invalido, passos que nao batem) e pulado e listado em <see cref="SyncLabConfigResult.Skipped"/>;
/// o deploy nao cai por causa de curadoria.
/// </summary>
public class SyncLabConfigUseCase
{
    private const string WebSecuritySlug = CuratedContentLocator.WebSecuritySlug;
    private const string WebSecurityName = "Web Security";

    private readonly ICourseRepository _courseRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SyncLabConfigUseCase(ICourseRepository courseRepository, IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<SyncLabConfigResult> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var courses = new List<(string Slug, string Name)> { (WebSecuritySlug, WebSecurityName) };
        foreach (var slug in CuratedContentLocator.ListCourseSlugs())
        {
            var manifestPath = CuratedContentLocator.Resolve(slug, null, "curso.json", required: false);
            if (manifestPath is null) continue;
            courses.Add((slug, CuratedCourseImporter.ParseManifest(await File.ReadAllTextAsync(manifestPath, cancellationToken)).Name));
        }

        var all = await _courseRepository.GetAllAsync(cancellationToken);
        var updated = new List<string>();
        var skipped = new List<string>();

        foreach (var (slug, name) in courses)
        {
            var course = all.FirstOrDefault(c => c.Name == name);
            if (course is null) continue;

            var graph = await _courseRepository.GetFullTemplateGraphAsync(course.Id, cancellationToken);
            if (graph is null) continue;

            foreach (var week in graph.Monthlies.SelectMany(m => m.WeeklyTemplates))
            {
                foreach (var day in week.DailyTemplates)
                {
                    var fileName = day.Language is { } language
                        ? Path.Combine("ponte", $"{language.ToString().ToLowerInvariant()}.json")
                        : $"dia-{day.DayNumber}.json";
                    var label = $"{name} semana {week.Number} dia {day.DayNumber}{(day.Language is { } l ? $" ({l})" : "")}";

                    var path = CuratedContentLocator.Resolve(slug, $"semana-{week.Number}", fileName, required: false);
                    if (path is null) continue;

                    // Dia de ponte (passo de codigo no banco) ou dia cujo arquivo traz missao no terminal.
                    var hasCodeStep = day.Activities.Any(a => a.Type == ActivityType.CodeStep);
                    if (!hasCodeStep && !CuratedDayImporter.FileHasActivityType(path, ActivityType.TerminalMission)) continue;

                    try
                    {
                        // Missoes primeiro: o laboratorio do dia exige que a atividade ja exista (SetLab).
                        var missions = CuratedDayImporter.ApplyMissions(day, path);
                        var lab = CuratedDayImporter.ApplyLab(week, day, path);
                        if (missions || lab)
                            updated.Add(label);
                    }
                    catch (Exception ex) when (ex is InvalidOperationException or DomainException)
                    {
                        skipped.Add($"{label}: {ex.Message}");
                    }
                }
            }
        }

        if (updated.Count > 0)
            await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SyncLabConfigResult(updated, skipped);
    }
}

/// <summary>Fase 86: dias cujo laboratorio foi atualizado nesta passada e os pulados (com o motivo).</summary>
public record SyncLabConfigResult(IReadOnlyList<string> Updated, IReadOnlyList<string> Skipped);
