using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Users;

/// <summary>
/// Turma (Fase 96): um grupo fechado de alunos que estuda so alguns cursos (ex.: "UNA BD 2026/2", com Banco de Dados e
/// GQS). O admin cria pelo Painel de gestao e gera convites da turma; quem se cadastra com um deles entra na turma, e
/// matriculado nos cursos dela e so ve esses cursos. Um aluno fica em no maximo uma turma (User.CohortId).
/// Arquivar nunca apaga: os alunos continuam com matricula, progresso e a mesma restricao de cursos; so os convites
/// ativos da turma sao revogados (feito no caso de uso, que conhece os convites).
/// </summary>
public class Cohort : Entity
{
    public const int MaxNameLength = 80;

    public string Name { get; private set; }

    private readonly List<Guid> _courseIds = new();
    /// <summary>Cursos da turma, na ordem em que o admin marcou.</summary>
    public IReadOnlyCollection<Guid> CourseIds => _courseIds.AsReadOnly();

    public DateTime CreatedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }

    public bool IsArchived => ArchivedAt is not null;

    private Cohort()
    {
        Name = string.Empty;
    }

    private Cohort(string name, IEnumerable<Guid> courseIds)
    {
        Name = name;
        _courseIds.AddRange(courseIds);
        CreatedAt = DateTime.UtcNow;
    }

    public static Cohort Create(string? name, IEnumerable<Guid>? courseIds) =>
        new(ValidName(name), ValidCourses(courseIds));

    /// <summary>Troca nome e cursos. Devolve os cursos que entraram agora (o caso de uso matricula os alunos neles).</summary>
    public IReadOnlyList<Guid> Update(string? name, IEnumerable<Guid>? courseIds)
    {
        if (IsArchived)
            throw new DomainException("Turma arquivada nao muda.", "turma_arquivada");

        var courses = ValidCourses(courseIds);
        var added = courses.Where(c => !_courseIds.Contains(c)).ToList();
        Name = ValidName(name);
        _courseIds.Clear();
        _courseIds.AddRange(courses);
        return added;
    }

    public void Archive(DateTime now) => ArchivedAt ??= now;

    public bool HasCourse(Guid courseId) => _courseIds.Contains(courseId);

    private static string ValidName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Dê um nome pra turma.", "turma_sem_nome");
        var trimmed = name.Trim();
        if (trimmed.Length > MaxNameLength)
            throw new DomainException($"O nome da turma vai ate {MaxNameLength} caracteres.", "turma_nome_longo");
        return trimmed;
    }

    private static List<Guid> ValidCourses(IEnumerable<Guid>? courseIds)
    {
        var list = (courseIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        if (list.Count == 0)
            throw new DomainException("Marque ao menos um curso.", "turma_sem_curso");
        return list;
    }
}
