using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Admin;

/// <summary>Um curso na aba Cursos (Fase 97): texto do catalogo, status e de onde o texto vem.</summary>
public record AdminCourseCatalogDto(
    Guid Id, string Name, string Status, string? Description, IReadOnlyList<string> Requirements,
    IReadOnlyList<string> RecommendedBefore, string? PreparesText, bool OnlyForCohorts,
    DateTime? CatalogEditedAt, bool HasContentFolder, int ImportedDays);

/// <summary>
/// Aba Cursos (Fase 97): criar curso vazio, editar o texto do catalogo, publicar/arquivar e voltar ao curso.json.
/// O nome nunca muda (a pasta de conteudo/ se liga ao curso por ele); semanas e dias continuam vindo do importar.
/// </summary>
public class AdminCoursesUseCase
{
    private const int MaxNameLength = 100;
    private const int MaxDescriptionLength = 1000;
    private const int MaxPreparesLength = 500;
    private const int MaxListItems = 12;
    private const int MaxItemLength = 200;

    private readonly ICourseRepository _courses;
    private readonly IAdminQueries _queries;
    private readonly IUnitOfWork _unitOfWork;

    public AdminCoursesUseCase(ICourseRepository courses, IAdminQueries queries, IUnitOfWork unitOfWork)
    {
        _courses = courses;
        _queries = queries;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<AdminCourseCatalogDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var result = new List<AdminCourseCatalogDto>();
        foreach (var course in (await _courses.GetAllAsync(cancellationToken)).OrderBy(c => c.Name))
            result.Add(await ToDtoAsync(course, cancellationToken));
        return result;
    }

    /// <summary>Cria o curso vazio (sempre Draft; `publish` e recusado porque nao ha dia importado). Fica marcado como editado: o curso.json nao o sobrescreve.</summary>
    public async Task<AdminCourseCatalogDto> CreateAsync(
        string? name, string? description, IReadOnlyList<string>? requirements, IReadOnlyList<string>? recommendedBefore,
        string? preparesText, bool onlyForCohorts, bool publish, DateTime now, CancellationToken cancellationToken = default)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw new ValidationException("nome_obrigatorio", "Dê um nome ao curso.");
        if (trimmed.Length > MaxNameLength)
            throw new ValidationException("nome_longo", $"O nome do curso tem no maximo {MaxNameLength} caracteres.");
        if ((await _courses.GetAllAsync(cancellationToken)).Any(c => string.Equals(c.Name, trimmed, StringComparison.OrdinalIgnoreCase)))
            throw new ConflictException("curso_ja_existe", "Ja existe um curso com esse nome.");

        var texts = Validate(description, requirements, recommendedBefore, preparesText);
        var course = new Course(trimmed);
        course.EditCatalog(texts.Description, texts.Requirements, texts.RecommendedBefore, texts.Prepares, now);
        course.SetOnlyForCohorts(onlyForCohorts);
        // Curso novo nasce sem dia importado, entao nao pode ja nascer publicado (mesma regra do PublishAsync).
        if (publish)
            throw new ValidationException("curso_sem_dias", "Importe ao menos um dia (aba Curadoria) antes de publicar o curso.");

        await _courses.AddAsync(course, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(course, cancellationToken);
    }

    public async Task<AdminCourseCatalogDto> UpdateAsync(
        Guid courseId, string? description, IReadOnlyList<string>? requirements, IReadOnlyList<string>? recommendedBefore,
        string? preparesText, bool onlyForCohorts, DateTime now, CancellationToken cancellationToken = default)
    {
        var course = await FindAsync(courseId, cancellationToken);
        var texts = Validate(description, requirements, recommendedBefore, preparesText);
        course.EditCatalog(texts.Description, texts.Requirements, texts.RecommendedBefore, texts.Prepares, now);
        course.SetOnlyForCohorts(onlyForCohorts);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(course, cancellationToken);
    }

    public async Task<AdminCourseCatalogDto> PublishAsync(Guid courseId, DateTime now, CancellationToken cancellationToken = default)
    {
        var course = await FindAsync(courseId, cancellationToken);
        if (course.Status == CourseStatus.Archived)
            throw new ValidationException("curso_arquivado", "Esse curso esta arquivado no banco e nao pode ser publicado pelo Painel.");
        if (await ImportedDaysAsync(course, cancellationToken) == 0)
            throw new ValidationException("curso_sem_dias", "Importe ao menos um dia (aba Curadoria) antes de publicar o curso.");

        course.PublishByAdmin(now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(course, cancellationToken);
    }

    public async Task<AdminCourseCatalogDto> UnpublishAsync(Guid courseId, DateTime now, CancellationToken cancellationToken = default)
    {
        var course = await FindAsync(courseId, cancellationToken);
        course.UnpublishByAdmin(now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(course, cancellationToken);
    }

    /// <summary>"Voltar ao curso.json": reaplica descricao e recomendacoes da pasta de conteudo/ e limpa a marca de edicao.</summary>
    public async Task<AdminCourseCatalogDto> RevertToManifestAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await FindAsync(courseId, cancellationToken);
        var (slug, manifest) = CuratedManifests.All().FirstOrDefault(m => m.Manifest.Name == course.Name);
        if (slug is null)
            throw new ValidationException("curso_sem_pasta", "Esse curso nao tem pasta em conteudo/, entao nao ha curso.json pra voltar.");

        course.ClearCatalogEdit();
        course.SetCatalogInfo(manifest.Description);
        var path = CuratedContentLocator.Resolve(slug, null, "recomendacao.json", required: false);
        if (path is not null)
            SyncCourseRecommendationsUseCase.Apply(course, SyncCourseRecommendationsUseCase.Parse(await File.ReadAllTextAsync(path, cancellationToken)));
        else
            course.SetRecommendation([], [], null);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(course, cancellationToken);
    }

    private async Task<Course> FindAsync(Guid courseId, CancellationToken cancellationToken) =>
        await _courses.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

    private async Task<int> ImportedDaysAsync(Course course, CancellationToken cancellationToken) =>
        (await _queries.ListCourseDaysAsync(course.Id, cancellationToken)).Count;

    private async Task<AdminCourseCatalogDto> ToDtoAsync(Course course, CancellationToken cancellationToken)
    {
        var hasFolder = CuratedManifests.All().Any(m => m.Manifest.Name == course.Name);
        return new AdminCourseCatalogDto(
            course.Id, course.Name, course.Status.ToString(), course.Description, course.Requirements.ToList(),
            course.RecommendedBefore.ToList(), course.PreparesText, course.OnlyForCohorts, course.CatalogEditedAt,
            hasFolder, await ImportedDaysAsync(course, cancellationToken));
    }

    private static (string? Description, List<string> Requirements, List<string> RecommendedBefore, string? Prepares) Validate(
        string? description, IReadOnlyList<string>? requirements, IReadOnlyList<string>? recommendedBefore, string? preparesText)
    {
        var desc = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (desc is { Length: > MaxDescriptionLength })
            throw new ValidationException("descricao_longa", $"A descricao tem no maximo {MaxDescriptionLength} caracteres.");
        var prepares = string.IsNullOrWhiteSpace(preparesText) ? null : preparesText.Trim();
        if (prepares is { Length: > MaxPreparesLength })
            throw new ValidationException("prepara_longo", $"O texto \"prepara\" tem no maximo {MaxPreparesLength} caracteres.");

        return (desc, CleanList(requirements, "requisitos"), CleanList(recommendedBefore, "recomendados"), prepares);
    }

    private static List<string> CleanList(IReadOnlyList<string>? items, string field)
    {
        var cleaned = (items ?? []).Where(i => !string.IsNullOrWhiteSpace(i)).Select(i => i.Trim()).Distinct().ToList();
        if (cleaned.Count > MaxListItems || cleaned.Any(i => i.Length > MaxItemLength))
            throw new ValidationException("lista_invalida", $"Em {field}: no maximo {MaxListItems} itens de ate {MaxItemLength} caracteres.");
        return cleaned;
    }
}
