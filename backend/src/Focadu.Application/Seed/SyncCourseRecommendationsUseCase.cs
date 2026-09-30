using System.Globalization;
using System.Text;
using System.Text.Json;
using Focadu.Domain.Courses;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 84: ficha do curso na escolha de curso (cursos livres, decisao do dono em 30/09/2026). Pra cada
/// curso com secret/curadoria/&lt;slug&gt;/recomendacao.json, aplica o que ajuda saber antes, os cursos
/// recomendados antes e o texto de "prepara pro". Roda em todo deploy e sobrescreve: e informacao de
/// vitrine, muda sem mexer no progresso de ninguem (inclusive em curso ja publicado). Sem o arquivo, o
/// curso fica como esta.
/// </summary>
public class SyncCourseRecommendationsUseCase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ICourseRepository _courseRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SyncCourseRecommendationsUseCase(ICourseRepository courseRepository, IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _unitOfWork = unitOfWork;
    }

    /// <summary>Devolve os nomes dos cursos atualizados.</summary>
    public async Task<IReadOnlyList<string>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var updated = new List<string>();
        foreach (var course in await _courseRepository.GetAllAsync(cancellationToken))
        {
            var path = CuratedContentLocator.Resolve(Slug(course.Name), null, "recomendacao.json", required: false);
            if (path is null) continue;
            Apply(course, Parse(await File.ReadAllTextAsync(path, cancellationToken)));
            updated.Add(course.Name);
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return updated;
    }

    internal static CourseRecommendationJson Parse(string json) =>
        JsonSerializer.Deserialize<CourseRecommendationJson>(json, JsonOptions)
            ?? throw new InvalidOperationException("recomendacao.json vazio ou invalido.");

    internal static void Apply(Course course, CourseRecommendationJson json) =>
        course.SetRecommendation(json.Requisitos ?? [], json.RecomendadoAntes ?? [], json.PreparaTexto);

    /// <summary>Mesmo slug da pasta de curadoria e do front (lib/courseMaps.ts#courseSlug): "Web Security" -> "web-security".</summary>
    internal static string Slug(string name)
    {
        var sb = new StringBuilder();
        foreach (var ch in name.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            var c = char.ToLowerInvariant(ch);
            sb.Append(c is >= 'a' and <= 'z' or >= '0' and <= '9' ? c : '-');
        }
        var slug = sb.ToString();
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return slug.Trim('-');
    }
}

/// <summary>Fase 84: secret/curadoria/&lt;slug&gt;/recomendacao.json.</summary>
/// <param name="Requisitos">O que ajuda saber antes (frases curtas). Vazio = "comeca do zero".</param>
/// <param name="RecomendadoAntes">Nomes dos cursos que a Focadu recomenda antes deste.</param>
/// <param name="PreparaTexto">Como este curso prepara pros que o recomendam (opcional).</param>
public record CourseRecommendationJson(List<string>? Requisitos, List<string>? RecomendadoAntes, string? PreparaTexto);
