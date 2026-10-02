using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 81: seed dos cursos de pre-requisito (secret/rascunhos/trilha-pre-requisitos-linux-python.md).
/// Roda junto do `seed`, em todo deploy, e e idempotente. Pra cada curso com curso.json:
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
    /// <summary>Os cursos curados alem do Web Security (pasta em secret/conteudo/).</summary>
    public static readonly IReadOnlyList<string> CourseSlugs = ["linux", "python-websec", "design-patterns", "arquitetura-de-software"];

    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly CuratedEnrollmentSync _enrollmentSync;
    private readonly IUnitOfWork _unitOfWork;

    public SeedCuratedCoursesUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, CuratedEnrollmentSync enrollmentSync,
        IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _enrollmentSync = enrollmentSync;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CuratedCourseSeedResult>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<CuratedCourseSeedResult>();
        foreach (var slug in CourseSlugs)
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
                : await _enrollmentSync.SyncAsync(course.Id, created, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            results.Add(new CuratedCourseSeedResult(manifest.Name, courseCreated, created.Count, dailiesAdded, course.Status.ToString(), skipped, recreated));
        }
        return results;
    }

    private async Task<bool> CanRecreateAsync(Guid courseId, CourseStatus status, CancellationToken cancellationToken) =>
        status == CourseStatus.Draft && (await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken)).Count == 0;
}

public record CuratedCourseSeedResult(
    string CourseName, bool Created, int DaysImported, int DailiesAdded, string Status, IReadOnlyList<string> Skipped,
    bool Recreated = false);
