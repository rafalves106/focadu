using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 81: seed dos cursos de pre-requisito (secret/rascunhos/trilha-pre-requisitos-linux-python.md).
/// Roda junto do `seed`, em todo deploy, e e idempotente. Pra cada pasta de curadoria com curso.json (Fase 92:
/// descoberta pelo disco, sem lista fixa - ver CuratedContentLocator.ListCourseSlugs):
/// 1. Cria o curso (escondido, Draft) se ainda nao existir, ou completa o que ja existe com os dias
///    curados desde o ultimo deploy (CuratedCourseImporter).
/// 2. Leva os dias novos pras matriculas que ja existem (hoje, so quem testa a previa): a Daily entra
///    na Weekly da semana certa, e a Weekly e criada se a semana for nova.
/// Fase 82: o importador nunca mexe num dia ja importado, entao uma correcao de curadoria nao chegaria.
/// Enquanto o curso estiver escondido e sem nenhuma matricula, ele e apagado e recriado do zero a cada
/// deploy - o que esta no banco e sempre a curadoria atual. Com a 1a matricula (ou publicado) isso para.
/// </summary>
public class SeedCuratedCoursesUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public SeedCuratedCoursesUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository,
        IUnitOfWork unitOfWork, IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<IReadOnlyList<CuratedCourseSeedResult>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<CuratedCourseSeedResult>();
        foreach (var slug in CuratedContentLocator.ListCourseSlugs())
        {
            var manifestPath = CuratedContentLocator.Resolve(slug, null, "curso.json", required: false);
            if (manifestPath is null) continue;

            var manifest = CuratedCourseImporter.ParseManifest(await File.ReadAllTextAsync(manifestPath, cancellationToken));
            var existing = (await _courseRepository.GetAllAsync(cancellationToken)).FirstOrDefault(c => c.Name == manifest.Name);
            var recreated = false;
            if (existing is not null && await CanRecreateAsync(existing.Id, existing.Status, cancellationToken))
            {
                _courseRepository.Remove(await _courseRepository.GetFullTemplateGraphAsync(existing.Id, cancellationToken)
                    ?? throw new InvalidOperationException("Curso sumiu entre as duas leituras."));
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                existing = null;
                recreated = true;
            }
            var courseCreated = existing is null;

            var course = existing is null
                ? CuratedCourseImporter.CreateCourse(manifest)
                : await _courseRepository.GetFullTemplateGraphAsync(existing.Id, cancellationToken)
                    ?? throw new InvalidOperationException("Curso sumiu entre as duas leituras.");

            var created = CuratedCourseImporter.Apply(course, manifest,
                (weekFolder, fileName) => CuratedContentLocator.Resolve(slug, weekFolder, fileName, required: false));

            if (courseCreated)
                await _courseRepository.AddAsync(course, cancellationToken);

            var (dailiesAdded, skipped) = courseCreated || created.Count == 0
                ? (0, new List<string>())
                : await SyncEnrollmentsAsync(course.Id, created, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            results.Add(new CuratedCourseSeedResult(manifest.Name, courseCreated, created.Count, dailiesAdded, course.Status.ToString(), skipped, recreated));
        }
        return results;
    }

    private async Task<bool> CanRecreateAsync(Guid courseId, CourseStatus status, CancellationToken cancellationToken) =>
        status == CourseStatus.Draft && (await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken)).Count == 0;

    private async Task<(int DailiesAdded, List<string> Skipped)> SyncEnrollmentsAsync(
        Guid courseId, IReadOnlyList<CreatedDay> created, CancellationToken cancellationToken)
    {
        var newByWeek = created.GroupBy(c => c.Week).ToList();
        var today = _clock.Today();
        var added = 0;
        var skipped = new List<string>();

        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken))
        {
            var weeklies = (await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken)).ToList();
            foreach (var group in newByWeek)
            {
                var template = group.Key;
                var weekly = weeklies.FirstOrDefault(w => w.WeeklyTemplateId == template.Id);
                if (weekly is null)
                {
                    weekly = new Weekly(enrollment.Id, template, today);
                    await _weeklyRepository.AddAsync(weekly, cancellationToken);
                    weeklies.Add(weekly);
                }

                foreach (var dailyTemplate in group.Select(c => c.Day).OrderBy(d => d.DayNumber))
                {
                    try
                    {
                        weekly.AddDaily(dailyTemplate, today);
                        added++;
                    }
                    catch (DomainException ex)
                    {
                        // Numero ocupado (ex.: um reforco) - registra em vez de derrubar o deploy.
                        skipped.Add($"Weekly {weekly.Id} (Dia {dailyTemplate.DayNumber}): {ex.Message}");
                    }
                }
            }
        }
        return (added, skipped);
    }
}

public record CuratedCourseSeedResult(
    string CourseName, bool Created, int DaysImported, int DailiesAdded, string Status, IReadOnlyList<string> Skipped,
    bool Recreated = false);
