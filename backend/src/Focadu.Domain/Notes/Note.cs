using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Notes;

/// <summary>
/// Fase 29 ("Caderninho de Anotações", ver secret/rascunhos/caderninho-de-anotacoes.md) - anotação
/// livre do aluno, criada no contexto de uma Daily específica. Aggregate root próprio (não filho
/// de <see cref="Domain.Dailies.Daily"/>): guarda só <see cref="DailyId"/>, nunca duplica
/// WeeklyId/CourseId - esse caminho já existe via Daily -> Weekly -> Enrollment -> Course, quem
/// precisa desses dados busca através dele (ver Application/Notes). Conteúdo é markdown livre
/// (negrito/listas/link, ver MarkdownBlock.tsx no frontend), nunca avaliado - é só anotação
/// pessoal, sem relação com o progresso/pontuação do aluno.
///
/// Fase 63: a nota pertence a EXATAMENTE um contexto - uma Daily (<see cref="DailyId"/>) ou o
/// Projeto Semanal (<see cref="WeeklyProjectId"/>, "Anotação rápida" da tela do projeto; pedido do
/// dono: a anotação feita no projeto é do projeto, não de uma Daily). O outro fica nulo; o banco
/// garante isso com um check constraint (ver NoteConfiguration).
/// </summary>
public class Note : Entity
{
    public Guid UserId { get; private set; }
    public Guid? DailyId { get; private set; }
    public Guid? WeeklyProjectId { get; private set; }
    public string Content { get; private set; } = string.Empty;

    private readonly List<string> _tags = new();
    public IReadOnlyCollection<string> Tags => _tags.AsReadOnly();

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Note()
    {
    }

    /// <summary>Nota de uma Daily (Fase 29).</summary>
    public Note(Guid userId, Guid dailyId, string content, IEnumerable<string> tags)
        : this(userId, content, tags)
    {
        DailyId = dailyId;
    }

    /// <summary>Nota do Projeto Semanal (Fase 63).</summary>
    public static Note ForWeeklyProject(Guid userId, Guid weeklyProjectId, string content, IEnumerable<string> tags) =>
        new(userId, content, tags) { WeeklyProjectId = weeklyProjectId };

    private Note(Guid userId, string content, IEnumerable<string> tags)
    {
        UserId = userId;
        Content = ValidateContent(content);
        _tags = NormalizeTags(tags);
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = CreatedAt;
    }

    /// <summary>Edita conteúdo e tags de uma nota já existente - CRUD completo, sem restrição de janela de tempo (o aluno pode editar/apagar quando quiser).</summary>
    public void Edit(string content, IEnumerable<string> tags)
    {
        Content = ValidateContent(content);
        _tags.Clear();
        _tags.AddRange(NormalizeTags(tags));
        UpdatedAt = DateTime.UtcNow;
    }

    private static string ValidateContent(string content)
    {
        var trimmed = content?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
            throw new DomainException("O conteúdo da nota não pode ser vazio.", "nota_vazia");

        if (trimmed.Length > NotePolicy.MaxContentLength)
            throw new DomainException(
                $"O conteúdo da nota excede o limite de {NotePolicy.MaxContentLength} caracteres.", "nota_muito_longa");

        return trimmed;
    }

    /// <summary>Trim + remove vazias + dedupe case-insensitive (evita "insight" e "Insight" como tags distintas) + valida limites - tags continuam livres, sem taxonomia pré-definida (autocomplete de tags já usadas fica a cargo do frontend/ListNoteTagsUseCase).</summary>
    private static List<string> NormalizeTags(IEnumerable<string> tags)
    {
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var tag in tags ?? Enumerable.Empty<string>())
        {
            var trimmed = tag?.Trim() ?? string.Empty;
            if (trimmed.Length == 0) continue;

            if (trimmed.Length > NotePolicy.MaxTagLength)
                throw new DomainException(
                    $"A tag \"{trimmed}\" excede o limite de {NotePolicy.MaxTagLength} caracteres.", "tag_muito_longa");

            if (!seen.Add(trimmed)) continue;

            normalized.Add(trimmed);
        }

        if (normalized.Count > NotePolicy.MaxTagCount)
            throw new DomainException(
                $"Uma nota pode ter no máximo {NotePolicy.MaxTagCount} tags.", "notas_tags_demais");

        return normalized;
    }
}
